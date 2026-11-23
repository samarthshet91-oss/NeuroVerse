import type {
  LIFParams,
  NetworkSimulationResponse,
  NeuronNode,
  NeuronSimulationResponse,
  NodeMetric,
  SpikeEvent,
  SynapseEdge,
} from '@/src/types/neuroverse';

/**
 * Local TypeScript Leaky Integrate-and-Fire (LIF) Euler solver & event-driven
 * network simulator matching the Python FastAPI mathematical equations:
 *
 *   C_m * dV/dt = -(V - V_rest) / R_m + I(t)
 *
 * Units:
 *   C_m [nF], R_m [MOhm] => tau_m = R_m * C_m [ms]
 *   I(t) [nA], V [mV], t / dt / delay [ms]
 */

const EPSILON = 1e-9;

function validateLifParams(params: LIFParams): void {
  if (params.membrane_capacitance_nf <= 0) {
    throw new Error('membrane_capacitance_nf must be strictly positive.');
  }
  if (params.membrane_resistance_mohm <= 0) {
    throw new Error('membrane_resistance_mohm must be strictly positive.');
  }
  if (params.v_reset_mv >= params.v_threshold_mv) {
    throw new Error('v_reset_mv must be strictly lower than v_threshold_mv.');
  }
  if (params.refractory_period_ms < 0) {
    throw new Error('refractory_period_ms cannot be negative.');
  }
}

export class LIFCell {
  public vMv: number;
  public refractoryRemainingMs = 0;
  public spikeTimesMs: number[] = [];

  constructor(private readonly params: LIFParams) {
    this.vMv = params.v_rest_mv;
  }

  /**
   * Advance membrane potential by one explicit Forward Euler step dtMs
   * arriving at timestamp tMs. Returns true if threshold was reached.
   */
  stepEuler(iTotalNa: number, tMs: number, dtMs: number): boolean {
    if (this.refractoryRemainingMs > EPSILON) {
      this.vMv = this.params.v_reset_mv;
      this.refractoryRemainingMs = Math.max(0, this.refractoryRemainingMs - dtMs);
      return false;
    }

    const dvDt =
      (-(this.vMv - this.params.v_rest_mv) / this.params.membrane_resistance_mohm + iTotalNa) /
      this.params.membrane_capacitance_nf;
    this.vMv += dvDt * dtMs;

    if (this.vMv >= this.params.v_threshold_mv) {
      this.vMv = this.params.v_reset_mv;
      this.refractoryRemainingMs = this.params.refractory_period_ms;
      this.spikeTimesMs.push(Number(tMs.toFixed(4)));
      return true;
    }

    return false;
  }
}

interface QueuedSpike {
  arrivalTimeMs: number;
  sourceId: string;
  targetId: string;
  edgeId: string;
  fireTimeMs: number;
  weight: number;
  delayMs: number;
}

export class LocalSpikeEventQueue {
  private heap: QueuedSpike[] = [];

  push(event: QueuedSpike): void {
    this.heap.push(event);
    let idx = this.heap.length - 1;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.heap[parent].arrivalTimeMs <= this.heap[idx].arrivalTimeMs) break;
      const tmp = this.heap[parent];
      this.heap[parent] = this.heap[idx];
      this.heap[idx] = tmp;
      idx = parent;
    }
  }

  popReady(currentTimeMs: number): QueuedSpike[] {
    const ready: QueuedSpike[] = [];
    while (this.heap.length > 0 && this.heap[0].arrivalTimeMs <= currentTimeMs + EPSILON) {
      const top = this.heap[0];
      const last = this.heap.pop()!;
      if (this.heap.length > 0) {
        this.heap[0] = last;
        let idx = 0;
        const len = this.heap.length;
        while (true) {
          const left = idx * 2 + 1;
          const right = idx * 2 + 2;
          let smallest = idx;
          if (left < len && this.heap[left].arrivalTimeMs < this.heap[smallest].arrivalTimeMs) {
            smallest = left;
          }
          if (right < len && this.heap[right].arrivalTimeMs < this.heap[smallest].arrivalTimeMs) {
            smallest = right;
          }
          if (smallest === idx) break;
          const tmp = this.heap[idx];
          this.heap[idx] = this.heap[smallest];
          this.heap[smallest] = tmp;
          idx = smallest;
        }
      }
      ready.push(top);
    }
    return ready;
  }
}

export function simulateSingleLifLocal(params: LIFParams): NeuronSimulationResponse {
  validateLifParams(params);

  const cell = new LIFCell(params);
  const dt = Math.max(0.05, params.dt_ms);
  const steps = Math.max(2, Math.floor(params.duration_ms / dt) + 1);
  const time_ms: number[] = [];
  const membrane_potential_mv: number[] = [];
  const input_current_trace_na: number[] = [];

  const pulseStart = params.pulse_start_ms ?? 0;
  const pulseEnd = params.pulse_end_ms ?? params.duration_ms;

  // Initial condition at t = 0
  const i0 = 0 >= pulseStart && 0 <= pulseEnd ? params.input_current_na : 0;
  time_ms.push(0);
  membrane_potential_mv.push(Number(cell.vMv.toFixed(4)));
  input_current_trace_na.push(Number(i0.toFixed(4)));

  for (let i = 1; i < steps; i++) {
    const t = Number((i * dt).toFixed(4));
    const iT = t >= pulseStart && t <= pulseEnd ? params.input_current_na : 0;
    const spiked = cell.stepEuler(iT, t, dt);
    const recordedV = spiked ? params.v_threshold_mv : cell.vMv;

    time_ms.push(t);
    membrane_potential_mv.push(Number(recordedV.toFixed(4)));
    input_current_trace_na.push(Number(iT.toFixed(4)));
  }

  const spikeCount = cell.spikeTimesMs.length;
  const activeWindowS =
    pulseEnd > pulseStart
      ? Math.max(1e-6, (Math.min(pulseEnd, params.duration_ms) - Math.max(pulseStart, 0)) / 1000)
      : Math.max(1e-6, params.duration_ms / 1000);
  const firingRateHz = Number((spikeCount / activeWindowS).toFixed(2));
  const tauM = params.membrane_resistance_mohm * params.membrane_capacitance_nf;
  const rheobase =
    (params.v_threshold_mv - params.v_rest_mv) / params.membrane_resistance_mohm;

  return {
    time_ms,
    membrane_potential_mv,
    input_current_trace_na,
    spike_times_ms: cell.spikeTimesMs,
    spike_count: spikeCount,
    firing_rate_hz: firingRateHz,
    tau_m_ms: Number(tauM.toFixed(3)),
    rheobase_na: Number(rheobase.toFixed(4)),
    solver_method: 'Local TypeScript Forward Euler LIF Solver',
    solver_source: 'local-typescript',
    model_assumptions: [
      'Single-compartment point neuron (spatial dendritic geometry collapsed to one capacitance C_m).',
      'Subthreshold membrane dynamics follow linear RC leak conductance toward V_rest.',
      'Action potentials reset instantaneously to V_reset and clamp during refractory period.',
    ],
    limitations: [
      'Omits Hodgkin-Huxley ion channel waveforms, cable delays, and stochastic noise.',
    ],
  };
}

export function simulateNetworkLocal(payload: {
  region_id: string;
  nodes: NeuronNode[];
  edges: SynapseEdge[];
  external_inputs_na: Record<string, number>;
  lif: LIFParams;
  pulseWindowMs?: [number, number];
}): NetworkSimulationResponse {
  const { region_id, nodes, edges, external_inputs_na, lif } = payload;
  validateLifParams(lif);

  const dt = Math.max(0.05, lif.dt_ms);
  const steps = Math.max(2, Math.floor(lif.duration_ms / dt) + 1);

  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const outgoingBySource = new Map<string, SynapseEdge[]>();
  let activeEdgesCount = 0;

  for (const edge of edges) {
    if (!edge.enabled) continue;
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) continue;
    activeEdgesCount++;
    const arr = outgoingBySource.get(edge.source) ?? [];
    arr.push(edge);
    outgoingBySource.set(edge.source, arr);
  }

  const neurons = new Map<string, LIFCell>();
  const synCurrents = new Map<string, number>();
  const traces = new Map<string, number[]>();

  for (const node of nodes) {
    const cell = new LIFCell(lif);
    neurons.set(node.id, cell);
    synCurrents.set(node.id, 0);
    // Record initial condition V(0) = V_rest
    traces.set(node.id, [Number(cell.vMv.toFixed(3))]);
  }

  const queue = new LocalSpikeEventQueue();
  const recordedEvents: SpikeEvent[] = [];
  const time_ms: number[] = [0];

  const tauSynMs = 4.0;
  const decayFactor = Math.exp(-dt / tauSynMs);
  const [pulseStart, pulseEnd] = payload.pulseWindowMs ?? [
    lif.pulse_start_ms ?? 0,
    lif.pulse_end_ms ?? lif.duration_ms,
  ];

  for (let i = 1; i < steps; i++) {
    const t = Number((i * dt).toFixed(4));
    time_ms.push(t);

    // 1. Decay prior synaptic currents over dt, then deliver spikes arriving in (t - dt, t]
    for (let n = 0; n < nodes.length; n++) {
      const nid = nodes[n].id;
      synCurrents.set(nid, (synCurrents.get(nid) ?? 0) * decayFactor);
    }

    const ready = queue.popReady(t);
    for (let r = 0; r < ready.length; r++) {
      const ev = ready[r];
      if (synCurrents.has(ev.targetId)) {
        synCurrents.set(ev.targetId, (synCurrents.get(ev.targetId) ?? 0) + ev.weight);
      }
    }

    // 2. Step each neuron using external input + current synaptic drive
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      const nid = node.id;
      const cell = neurons.get(nid)!;
      const rawExt = external_inputs_na[nid] ?? node.baseline_input_na;
      const extI = t >= pulseStart && t <= pulseEnd ? rawExt : 0;
      const synI = synCurrents.get(nid) ?? 0;

      const spiked = cell.stepEuler(extI + synI, t, dt);
      const recordedV = spiked ? lif.v_threshold_mv : cell.vMv;
      traces.get(nid)!.push(Number(recordedV.toFixed(3)));

      if (spiked) {
        const outEdges = outgoingBySource.get(nid) ?? [];
        for (let e = 0; e < outEdges.length; e++) {
          const syn = outEdges[e];
          const arrival = Number((t + syn.delay_ms).toFixed(4));
          queue.push({
            arrivalTimeMs: arrival,
            sourceId: nid,
            targetId: syn.target,
            edgeId: syn.id,
            fireTimeMs: t,
            weight: syn.weight,
            delayMs: syn.delay_ms,
          });
          recordedEvents.push({
            source_id: nid,
            target_id: syn.target,
            edge_id: syn.id,
            fire_time_ms: t,
            arrival_time_ms: arrival,
            weight: syn.weight,
            delay_ms: syn.delay_ms,
          });
        }
      }
    }
  }

  const durationS = Math.max(1e-6, lif.duration_ms / 1000);
  const node_metrics: NodeMetric[] = [];
  let totalSpikes = 0;

  for (const node of nodes) {
    const cell = neurons.get(node.id)!;
    const nodeTrace = traces.get(node.id)!;
    const count = cell.spikeTimesMs.length;
    totalSpikes += count;
    let sumV = 0;
    for (let k = 0; k < nodeTrace.length; k++) sumV += nodeTrace[k];

    node_metrics.push({
      node_id: node.id,
      label: node.label,
      spike_count: count,
      spike_times_ms: cell.spikeTimesMs,
      firing_rate_hz: Number((count / durationS).toFixed(2)),
      first_spike_ms: count > 0 ? cell.spikeTimesMs[0] : null,
      mean_membrane_mv: Number((sumV / Math.max(1, nodeTrace.length)).toFixed(3)),
    });
  }

  const membrane_traces_mv: Record<string, number[]> = {};
  traces.forEach((vals, key) => {
    membrane_traces_mv[key] = vals;
  });

  return {
    region_id,
    time_ms,
    membrane_traces_mv,
    spike_events: recordedEvents,
    node_metrics,
    total_spikes: totalSpikes,
    active_edges_count: activeEdgesCount,
    graph_summary: {
      node_count: nodes.length,
      active_edge_count: activeEdgesCount,
      total_defined_edges: edges.length,
      density: Number(
        (activeEdgesCount / Math.max(1, nodes.length * (nodes.length - 1))).toFixed(4)
      ),
      recurrent_components: 1,
      is_dag: false,
    },
    solver_method: 'Local TypeScript Coupled Euler LIF + Priority-Queue Synapses',
    solver_source: 'local-typescript',
    model_assumptions: [
      'Topology is a procedurally generated illustrative microcircuit, not a biological connectome.',
      'Presynaptic spikes deliver delayed exponential synaptic current pulses (tau_syn = 4.0 ms).',
      'Positive weights represent excitatory drive; negative weights represent inhibitory drive.',
    ],
    limitations: [
      'Current-based synapses omit voltage-dependent reversal potentials and synaptic plasticity.',
      'Single-compartment LIF model abstracts full dendritic cable electrotonics.',
    ],
  };
}
