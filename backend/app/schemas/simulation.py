"""Schemas for LIF single-neuron, network, and parameter-comparison simulations."""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from .brain import NeuronNodeSchema, SynapseEdgeSchema


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    solver: str
    numpy_version: str
    networkx_version: str


class NeuronSimulationRequest(BaseModel):
    input_current_na: float = Field(default=2.2, ge=-5.0, le=20.0, description="Constant injected current I(t) in nA")
    membrane_capacitance_nf: float = Field(default=1.0, gt=0.05, le=20.0, description="C_m in nF")
    membrane_resistance_mohm: float = Field(default=10.0, gt=0.5, le=200.0, description="R_m in MOhm")
    v_rest_mv: float = Field(default=-70.0, ge=-100.0, le=-30.0)
    v_reset_mv: float = Field(default=-75.0, ge=-110.0, le=-30.0)
    v_threshold_mv: float = Field(default=-55.0, ge=-80.0, le=20.0)
    refractory_period_ms: float = Field(default=2.0, ge=0.0, le=30.0)
    duration_ms: float = Field(default=100.0, ge=10.0, le=1000.0)
    dt_ms: float = Field(default=0.1, ge=0.05, le=2.0)
    pulse_start_ms: Optional[float] = Field(default=10.0, ge=0.0)
    pulse_end_ms: Optional[float] = Field(default=90.0, ge=0.0)


class NeuronSimulationResponse(BaseModel):
    time_ms: List[float]
    membrane_potential_mv: List[float]
    input_current_trace_na: List[float]
    spike_times_ms: List[float]
    spike_count: int
    firing_rate_hz: float
    tau_m_ms: float
    rheobase_na: float
    solver_method: str
    model_assumptions: List[str]
    limitations: List[str]


class NetworkSimulationRequest(BaseModel):
    region_id: str
    nodes: List[NeuronNodeSchema]
    edges: List[SynapseEdgeSchema]
    external_inputs_na: Dict[str, float] = Field(default_factory=dict)
    membrane_capacitance_nf: float = Field(default=1.0, gt=0.05, le=20.0)
    membrane_resistance_mohm: float = Field(default=10.0, gt=0.5, le=200.0)
    v_rest_mv: float = Field(default=-70.0, ge=-100.0, le=-30.0)
    v_reset_mv: float = Field(default=-75.0, ge=-110.0, le=-30.0)
    v_threshold_mv: float = Field(default=-55.0, ge=-80.0, le=20.0)
    refractory_period_ms: float = Field(default=2.0, ge=0.0, le=30.0)
    duration_ms: float = Field(default=120.0, ge=10.0, le=500.0)
    dt_ms: float = Field(default=0.25, ge=0.05, le=2.0)


class SpikeEventSchema(BaseModel):
    source_id: str
    target_id: str
    edge_id: str
    fire_time_ms: float
    arrival_time_ms: float
    weight: float
    delay_ms: float


class NodeMetricSchema(BaseModel):
    node_id: str
    label: str
    spike_count: int
    spike_times_ms: List[float]
    firing_rate_hz: float
    first_spike_ms: Optional[float]
    mean_membrane_mv: float


class NetworkSimulationResponse(BaseModel):
    region_id: str
    time_ms: List[float]
    membrane_traces_mv: Dict[str, List[float]]
    spike_events: List[SpikeEventSchema]
    node_metrics: List[NodeMetricSchema]
    total_spikes: int
    active_edges_count: int
    graph_summary: dict
    solver_method: str
    model_assumptions: List[str]
    limitations: List[str]


class CompareSimulationRequest(BaseModel):
    baseline: NeuronSimulationRequest
    variant: NeuronSimulationRequest


class CompareSimulationResponse(BaseModel):
    baseline: NeuronSimulationResponse
    variant: NeuronSimulationResponse
    delta_spike_count: int
    delta_firing_rate_hz: float
    delta_first_spike_ms: Optional[float]
