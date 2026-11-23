"""Event-driven + Euler coupled network simulator for directed regional graphs."""

from typing import Dict, List
import numpy as np

from app.engine.event_queue import QueuedSpikeEvent, SpikeEventQueue
from app.models.lif import LIFNeuron, LIFParameters
from app.models.network import NeuralNetworkGraph
from app.schemas.simulation import (
    NetworkSimulationRequest,
    NetworkSimulationResponse,
    NodeMetricSchema,
    SpikeEventSchema,
)


def simulate_network(req: NetworkSimulationRequest) -> NetworkSimulationResponse:
    """Simulate coupled LIF neurons across a directed NetworkX graph with synaptic delays."""
    nodes_dict = [n.model_dump() for n in req.nodes]
    edges_dict = [e.model_dump() for e in req.edges]
    net_graph = NeuralNetworkGraph(nodes_dict, edges_dict)

    params = LIFParameters(
        c_m_nf=req.membrane_capacitance_nf,
        r_m_mohm=req.membrane_resistance_mohm,
        v_rest_mv=req.v_rest_mv,
        v_reset_mv=req.v_reset_mv,
        v_threshold_mv=req.v_threshold_mv,
        refractory_period_ms=req.refractory_period_ms,
    )

    neurons: Dict[str, LIFNeuron] = {
        node.id: LIFNeuron(node_id=node.id, params=params) for node in req.nodes
    }
    syn_currents_na: Dict[str, float] = {node.id: 0.0 for node in req.nodes}
    traces_mv: Dict[str, List[float]] = {
        node.id: [round(neurons[node.id].v_mv, 3)] for node in req.nodes
    }

    event_queue = SpikeEventQueue()
    recorded_events: List[SpikeEventSchema] = []

    tau_syn_ms = 4.0
    decay_factor = float(np.exp(-req.dt_ms / tau_syn_ms))

    steps = max(2, int(np.floor(req.duration_ms / req.dt_ms)) + 1)
    times = np.round(np.arange(steps, dtype=np.float64) * req.dt_ms, 4)

    for idx in range(1, steps):
        t = float(times[idx])

        # 1. Decay prior synaptic current over dt, then deliver arriving spikes
        for nid in syn_currents_na:
            syn_currents_na[nid] *= decay_factor

        arriving = event_queue.pop_ready(t)
        for ev in arriving:
            if ev.target_id in syn_currents_na:
                syn_currents_na[ev.target_id] += ev.weight

        # 2. Step every neuron with external + synaptic current
        for node in req.nodes:
            nid = node.id
            ext_i = req.external_inputs_na.get(nid, node.baseline_input_na)
            total_i = ext_i + syn_currents_na[nid]

            spiked = neurons[nid].step_euler(total_i, t, req.dt_ms)
            recorded_v = req.v_threshold_mv if spiked else neurons[nid].v_mv
            traces_mv[nid].append(round(recorded_v, 3))

            if spiked:
                for syn in net_graph.outgoing_synapses(nid):
                    arrival = round(t + syn.delay_ms, 4)
                    event_queue.push(
                        QueuedSpikeEvent(
                            arrival_time_ms=arrival,
                            source_id=nid,
                            target_id=syn.target_id,
                            edge_id=syn.edge_id,
                            fire_time_ms=round(t, 4),
                            weight=syn.pulse_current_na(),
                            delay_ms=syn.delay_ms,
                        )
                    )
                    recorded_events.append(
                        SpikeEventSchema(
                            source_id=nid,
                            target_id=syn.target_id,
                            edge_id=syn.edge_id,
                            fire_time_ms=round(t, 4),
                            arrival_time_ms=arrival,
                            weight=syn.weight,
                            delay_ms=syn.delay_ms,
                        )
                    )

    duration_s = max(1e-6, req.duration_ms / 1000.0)
    node_metrics: List[NodeMetricSchema] = []
    total_spikes = 0

    for node in req.nodes:
        neuron = neurons[node.id]
        sp_times = neuron.spike_times_ms
        count = len(sp_times)
        total_spikes += count
        mean_v = float(np.mean(traces_mv[node.id])) if traces_mv[node.id] else req.v_rest_mv
        node_metrics.append(
            NodeMetricSchema(
                node_id=node.id,
                label=node.label,
                spike_count=count,
                spike_times_ms=sp_times,
                firing_rate_hz=round(count / duration_s, 2),
                first_spike_ms=sp_times[0] if sp_times else None,
                mean_membrane_mv=round(mean_v, 3),
            )
        )

    summary = net_graph.summary()

    return NetworkSimulationResponse(
        region_id=req.region_id,
        time_ms=times.tolist(),
        membrane_traces_mv=traces_mv,
        spike_events=recorded_events,
        node_metrics=node_metrics,
        total_spikes=total_spikes,
        active_edges_count=summary["active_edge_count"],
        graph_summary=summary,
        solver_method="Coupled Forward Euler LIF + Priority-Queue Delayed Exponential Synapses",
        model_assumptions=[
            "Network topology is an illustrative directed microcircuit, not a biological human connectome.",
            "Each node uses identical passive LIF parameters unless overridden by external input current.",
            "Presynaptic spikes enqueue instantaneous post-synaptic current pulses after delay_ms, decaying with tau_syn = 4.0 ms.",
            "Positive weights represent excitatory drive; negative weights represent inhibitory hyperpolarizing drive.",
        ],
        limitations=[
            "Current-based synapses omit voltage-dependent reversal potentials (AMPA/NMDA/GABA_A).",
            "No synaptic plasticity (STDP) or short-term depression/facilitation is modeled in this foundation.",
            "Small illustrative node count (4-6 nodes) demonstrates signal propagation mechanics rather than population statistics.",
        ],
    )
