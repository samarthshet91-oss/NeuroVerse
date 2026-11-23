"""Health check and numerical LIF / network simulation endpoints."""

from fastapi import APIRouter, HTTPException
import networkx as nx
import numpy as np

from app.engine.simulator import simulate_network
from app.engine.solver import simulate_single_lif
from app.schemas.simulation import (
    CompareSimulationRequest,
    CompareSimulationResponse,
    HealthResponse,
    NetworkSimulationRequest,
    NetworkSimulationResponse,
    NeuronSimulationRequest,
    NeuronSimulationResponse,
)

router = APIRouter(tags=["simulation"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Verify FastAPI numerical backend availability."""
    return HealthResponse(
        status="ok",
        service="neuroverse-simulation-api",
        version="0.1.0",
        solver="Forward Euler LIF + Event-Queue Network Engine",
        numpy_version=np.__version__,
        networkx_version=nx.__version__,
    )


@router.post("/simulation/neuron", response_model=NeuronSimulationResponse)
async def run_neuron_simulation(payload: NeuronSimulationRequest) -> NeuronSimulationResponse:
    """Simulate a single Leaky Integrate-and-Fire neuron."""
    if payload.v_reset_mv >= payload.v_threshold_mv:
        raise HTTPException(
            status_code=422,
            detail="v_reset_mv must be strictly lower than v_threshold_mv.",
        )
    return simulate_single_lif(payload)


@router.post("/simulation/network", response_model=NetworkSimulationResponse)
async def run_network_simulation(payload: NetworkSimulationRequest) -> NetworkSimulationResponse:
    """Simulate a directed neural network with synaptic weights and delays."""
    if payload.v_reset_mv >= payload.v_threshold_mv:
        raise HTTPException(
            status_code=422,
            detail="v_reset_mv must be strictly lower than v_threshold_mv.",
        )
    if not payload.nodes:
        raise HTTPException(status_code=422, detail="At least one neuron node is required.")
    return simulate_network(payload)


@router.post("/simulation/compare", response_model=CompareSimulationResponse)
async def compare_neuron_simulations(
    payload: CompareSimulationRequest,
) -> CompareSimulationResponse:
    """Run two LIF parameter sets and return comparative spike and firing-rate metrics."""
    if (
        payload.baseline.v_reset_mv >= payload.baseline.v_threshold_mv
        or payload.variant.v_reset_mv >= payload.variant.v_threshold_mv
    ):
        raise HTTPException(
            status_code=422,
            detail="v_reset_mv must be strictly lower than v_threshold_mv in both parameter sets.",
        )

    base_res = simulate_single_lif(payload.baseline)
    var_res = simulate_single_lif(payload.variant)

    base_first = base_res.spike_times_ms[0] if base_res.spike_times_ms else None
    var_first = var_res.spike_times_ms[0] if var_res.spike_times_ms else None
    delta_first = (
        round(var_first - base_first, 4)
        if (base_first is not None and var_first is not None)
        else None
    )

    return CompareSimulationResponse(
        baseline=base_res,
        variant=var_res,
        delta_spike_count=var_res.spike_count - base_res.spike_count,
        delta_firing_rate_hz=round(var_res.firing_rate_hz - base_res.firing_rate_hz, 2),
        delta_first_spike_ms=delta_first,
    )
