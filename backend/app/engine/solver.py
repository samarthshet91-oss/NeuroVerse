"""Forward Euler numerical solver for single-neuron Leaky Integrate-and-Fire ODE."""

from typing import List, Optional
import numpy as np

from app.models.lif import LIFNeuron, LIFParameters
from app.schemas.simulation import NeuronSimulationRequest, NeuronSimulationResponse


def simulate_single_lif(req: NeuronSimulationRequest) -> NeuronSimulationResponse:
    """Solve C_m * dV/dt = -(V - V_rest)/R_m + I(t) using Forward Euler integration."""
    params = LIFParameters(
        c_m_nf=req.membrane_capacitance_nf,
        r_m_mohm=req.membrane_resistance_mohm,
        v_rest_mv=req.v_rest_mv,
        v_reset_mv=req.v_reset_mv,
        v_threshold_mv=req.v_threshold_mv,
        refractory_period_ms=req.refractory_period_ms,
    )
    neuron = LIFNeuron(node_id="single-neuron", params=params)

    steps = max(2, int(np.floor(req.duration_ms / req.dt_ms)) + 1)
    times = np.round(np.arange(steps, dtype=np.float64) * req.dt_ms, 4)

    pulse_start = 0.0 if req.pulse_start_ms is None else req.pulse_start_ms
    pulse_end = req.duration_ms if req.pulse_end_ms is None else req.pulse_end_ms

    i_0 = req.input_current_na if (pulse_start <= 0.0 <= pulse_end) else 0.0
    voltages: List[float] = [round(neuron.v_mv, 4)]
    currents: List[float] = [round(i_0, 4)]

    for idx in range(1, steps):
        t = float(times[idx])
        i_t = req.input_current_na if (pulse_start <= t <= pulse_end) else 0.0
        spiked = neuron.step_euler(i_t, t, req.dt_ms)
        # Record a visual peak marker at threshold on the spike step before clamping
        recorded_v = req.v_threshold_mv if spiked else neuron.v_mv
        voltages.append(round(recorded_v, 4))
        currents.append(round(i_t, 4))

    spike_count = len(neuron.spike_times_ms)
    active_window_s = max(1e-6, (pulse_end - pulse_start) / 1000.0) if pulse_end > pulse_start else req.duration_ms / 1000.0
    firing_rate_hz = round(spike_count / active_window_s, 2)

    return NeuronSimulationResponse(
        time_ms=times.tolist(),
        membrane_potential_mv=voltages,
        input_current_trace_na=currents,
        spike_times_ms=neuron.spike_times_ms,
        spike_count=spike_count,
        firing_rate_hz=firing_rate_hz,
        tau_m_ms=round(params.tau_m_ms, 3),
        rheobase_na=round(params.rheobase_na, 4),
        solver_method="Forward Euler (explicit, fixed timestep dt)",
        model_assumptions=[
            "Single-compartment point neuron (spatial dendritic geometry is collapsed to one capacitance C_m).",
            "Subthreshold membrane dynamics follow linear RC leak conductance toward V_rest.",
            "Action potentials are modeled as instantaneous threshold crossings followed by hard reset to V_reset.",
            "Absolute refractory period clamps membrane potential at V_reset for tau_ref ms.",
        ],
        limitations=[
            "Does not resolve Hodgkin-Huxley Na+/K+ channel gating kinetics or spike waveform shapes.",
            "Omits spike-frequency adaptation, dendritic cable delays, and stochastic channel noise.",
            "Forward Euler accuracy degrades if dt approaches or exceeds tau_m.",
        ],
    )
