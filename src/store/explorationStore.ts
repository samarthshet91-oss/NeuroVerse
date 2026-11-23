import { create } from 'zustand';
import { generateBiologicalRegionNetwork } from '@/src/data/biologicalNetworkGenerator';
import { DEFAULT_BRAIN_REGIONS } from '@/src/data/brainRegions';
import { BackendApiError, simulationApi } from '@/src/services/simulationApi';
import type {
  BackendConnectionState,
  BackendHealth,
  BrainRegion,
  BrainRegionId,
  CompareSimulationResponse,
  ExplorationState,
  LIFParams,
  NetworkSimulationResponse,
  NeuronAnatomyPartId,
  NeuronSimulationResponse,
  RegionNetwork,
  SimulationSource,
  TissueDensity,
} from '@/src/types/neuroverse';

export const DEFAULT_LIF_PARAMS: LIFParams = {
  input_current_na: 2.8,
  membrane_capacitance_nf: 1.0,
  membrane_resistance_mohm: 10.0,
  v_rest_mv: -70.0,
  v_reset_mv: -75.0,
  v_threshold_mv: -55.0,
  refractory_period_ms: 2.0,
  duration_ms: 60.0,
  dt_ms: 0.25,
  pulse_start_ms: 2.0,
  pulse_end_ms: 48.0,
};

export interface NeuronFiringEvent {
  nodeId: string;
  label: string;
  role: string;
  spikeOrdinal: number;
  spikeTimeMs: number;
  outgoingCount: number;
}

export interface SignalStoryStep {
  edgeId: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  fireTimeMs: number;
  arrivalTimeMs: number;
  synapseType: 'excitatory' | 'inhibitory';
  targetSpiked: boolean;
  summary: string;
}

export function buildNeuronFiringLog(
  result: NetworkSimulationResponse,
  network: RegionNetwork
): NeuronFiringEvent[] {
  const nodeMap = new Map(network.nodes.map((n) => [n.id, n]));
  const outgoingCountMap = new Map<string, number>();
  for (const e of network.edges) {
    if (!e.enabled) continue;
    outgoingCountMap.set(e.source, (outgoingCountMap.get(e.source) ?? 0) + 1);
  }

  const entries: NeuronFiringEvent[] = [];
  for (const metric of result.node_metrics) {
    const node = nodeMap.get(metric.node_id);
    metric.spike_times_ms.forEach((tMs, idx) => {
      entries.push({
        nodeId: metric.node_id,
        label: metric.label,
        role: node?.role ?? 'excitatory',
        spikeOrdinal: idx + 1,
        spikeTimeMs: tMs,
        outgoingCount: outgoingCountMap.get(metric.node_id) ?? 0,
      });
    });
  }

  entries.sort((a, b) => a.spikeTimeMs - b.spikeTimeMs || a.label.localeCompare(b.label));
  return entries;
}

export function buildSignalNarrative(
  result: NetworkSimulationResponse,
  network: RegionNetwork,
  triggerNeuronId: string
): SignalStoryStep[] {
  const labelMap = new Map(network.nodes.map((n) => [n.id, n.label]));
  const metricMap = new Map(result.node_metrics.map((m) => [m.node_id, m]));
  const edgeTypeMap = new Map(network.edges.map((e) => [e.id, e.synapse_type]));

  // Preserve every spike event chronologically (keyed by edge + fire timestamp so multi-spike trains are never dropped)
  const sorted = [...result.spike_events].sort(
    (a, b) => a.fire_time_ms - b.fire_time_ms || a.arrival_time_ms - b.arrival_time_ms
  );
  const seenEdgeSpikes = new Set<string>();
  const steps: SignalStoryStep[] = [];

  for (const ev of sorted) {
    const eventKey = `${ev.edge_id}@${ev.fire_time_ms}`;
    if (seenEdgeSpikes.has(eventKey)) continue;
    seenEdgeSpikes.add(eventKey);

    const srcLabel = labelMap.get(ev.source_id) ?? ev.source_id;
    const dstLabel = labelMap.get(ev.target_id) ?? ev.target_id;
    const dstMetric = metricMap.get(ev.target_id);
    const synType = edgeTypeMap.get(ev.edge_id) ?? (ev.weight >= 0 ? 'excitatory' : 'inhibitory');
    const targetSpiked =
      dstMetric?.spike_times_ms.some((t) => t >= ev.arrival_time_ms) ?? false;

    const actionWord = synType === 'inhibitory' ? 'quieted' : 'excited';
    const followUp = targetSpiked
      ? `${dstLabel} reached threshold and fired.`
      : `${dstLabel} integrated the input below threshold.`;

    const prefix =
      ev.source_id === triggerNeuronId
        ? `${srcLabel} fired at ${ev.fire_time_ms.toFixed(1)} ms → synapse to ${dstLabel} (${ev.arrival_time_ms.toFixed(1)} ms).`
        : `${srcLabel} ${actionWord} ${dstLabel} at ${ev.arrival_time_ms.toFixed(1)} ms.`;

    steps.push({
      edgeId: ev.edge_id,
      sourceId: ev.source_id,
      sourceLabel: srcLabel,
      targetId: ev.target_id,
      targetLabel: dstLabel,
      fireTimeMs: ev.fire_time_ms,
      arrivalTimeMs: ev.arrival_time_ms,
      synapseType: synType,
      targetSpiked,
      summary: `${prefix} ${followUp}`,
    });

    if (steps.length >= 24) break;
  }

  return steps;
}

interface ExplorationStore {
  // Continuous exploration state
  explorationState: ExplorationState;
  regions: BrainRegion[];
  selectedRegionId: BrainRegionId | null;
  hoveredRegionId: BrainRegionId | null;

  // Dense biological neural environment
  tissueDensity: TissueDensity;
  activeNetwork: RegionNetwork | null;
  selectedNeuronId: string | null;
  hoveredNeuronId: string | null;
  selectedEdgeId: string | null;
  selectedAnatomyPart: NeuronAnatomyPartId;

  // Signal propagation & beginner story
  triggeredNeuronId: string | null;
  followedNeuronId: string | null;
  followSignalActive: boolean;
  neuronFiringLog: NeuronFiringEvent[];
  signalStory: SignalStoryStep[];

  // External inputs & LIF experiment parameters
  externalInputsNa: Record<string, number>;
  lifParams: LIFParams;
  baselineLifParams: LIFParams | null;

  // Solver / backend status
  backendState: BackendConnectionState;
  backendHealth: BackendHealth | null;
  lastSolverSource: SimulationSource | null;
  isSimulating: boolean;
  simError: string | null;
  neuronSimResult: NeuronSimulationResponse | null;
  networkSimResult: NetworkSimulationResponse | null;
  compareSimResult: CompareSimulationResponse | null;

  // Playback for spike animation
  isPlayingSignals: boolean;
  playbackTimeMs: number;
  playbackSpeed: number;

  // Progressive disclosure & viewport UI controls
  reducedQuality: boolean;
  showLabels: boolean;
  showInfoPanel: boolean;
  experimentOpen: boolean;
  showChartDrawer: boolean;
  cameraResetNonce: number;

  // Actions
  initializeBackend: () => Promise<void>;
  setHoveredRegion: (id: BrainRegionId | null) => void;
  selectRegion: (id: BrainRegionId) => void;
  setTissueDensity: (density: TissueDensity) => void;

  setHoveredNeuron: (id: string | null) => void;
  selectNeuron: (id: string | null, focusCamera?: boolean) => void;
  zoomIntoSelectedNeuron: () => void;
  returnToTissueView: () => void;
  stepBack: () => void;
  resetToBrainView: () => void;
  triggerCameraReset: () => void;

  selectEdge: (id: string | null) => void;
  selectAnatomyPart: (part: NeuronAnatomyPartId) => void;

  // Network parameter edits (Experiment mode)
  updateEdgeWeight: (edgeId: string, weight: number) => void;
  updateEdgeDelay: (edgeId: string, delayMs: number) => void;
  toggleEdgeEnabled: (edgeId: string) => void;
  updateNodeExternalInput: (nodeId: string, currentNa: number) => void;
  resetActiveNetwork: () => void;

  // LIF parameter edits (Experiment mode)
  updateLifParam: <K extends keyof LIFParams>(key: K, value: LIFParams[K]) => void;
  resetLifParams: () => void;
  pinCurrentAsBaseline: () => void;

  // Simulations (FastAPI with local TypeScript fallback)
  sendSignalFromSelectedNeuron: () => Promise<void>;
  followNextSignalHop: () => void;
  focusNeuronAtTime: (neuronId: string, timeMs: number, edgeId?: string | null) => void;
  stopFollowingSignal: () => void;
  runNeuronSimulation: () => Promise<void>;
  runCompareSimulation: () => Promise<void>;
  runNetworkSimulation: () => Promise<void>;
  clearSimulationError: () => void;

  // Playback & UI toggles
  setPlayingSignals: (playing: boolean) => void;
  setPlaybackTimeMs: (t: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleReducedQuality: () => void;
  toggleLabels: () => void;
  setShowInfoPanel: (open: boolean) => void;
  setExperimentOpen: (open: boolean) => void;
  setShowChartDrawer: (open: boolean) => void;
}

function buildBaselineInputs(network: RegionNetwork): Record<string, number> {
  const map: Record<string, number> = {};
  for (const n of network.nodes) {
    map[n.id] = 0;
  }
  return map;
}

export const useExplorationStore = create<ExplorationStore>((set, get) => ({
  explorationState: 'BRAIN_VIEW',
  regions: DEFAULT_BRAIN_REGIONS,
  selectedRegionId: null,
  hoveredRegionId: null,

  tissueDensity: 110,
  activeNetwork: null,
  selectedNeuronId: null,
  hoveredNeuronId: null,
  selectedEdgeId: null,
  selectedAnatomyPart: 'soma',

  triggeredNeuronId: null,
  followedNeuronId: null,
  followSignalActive: false,
  neuronFiringLog: [],
  signalStory: [],

  externalInputsNa: {},
  lifParams: { ...DEFAULT_LIF_PARAMS },
  baselineLifParams: { ...DEFAULT_LIF_PARAMS },

  backendState: 'checking',
  backendHealth: null,
  lastSolverSource: null,
  isSimulating: false,
  simError: null,
  neuronSimResult: null,
  networkSimResult: null,
  compareSimResult: null,

  isPlayingSignals: false,
  playbackTimeMs: 0,
  playbackSpeed: 0.3,

  reducedQuality: false,
  showLabels: true,
  showInfoPanel: true,
  experimentOpen: false,
  showChartDrawer: false,
  cameraResetNonce: 0,

  initializeBackend: async () => {
    set({ backendState: 'checking' });
    try {
      const [health, regionsPayload] = await Promise.all([
        simulationApi.checkHealth(),
        simulationApi.fetchBrainRegions(),
      ]);
      set({
        backendState: 'online',
        backendHealth: health,
        regions: regionsPayload.regions.map((r, idx) => ({
          ...DEFAULT_BRAIN_REGIONS[idx],
          ...r,
        })),
      });
    } catch {
      set({
        backendState: 'offline',
        backendHealth: null,
      });
    }
  },

  setHoveredRegion: (id) => set({ hoveredRegionId: id }),

  selectRegion: (id) => {
    const density = get().tissueDensity;
    const network = generateBiologicalRegionNetwork(id, density);
    // Pick a centrally located neuron with outgoing connections as initial highlight candidate
    const starterNeuron =
      network.nodes.find((n) => network.edges.some((e) => e.source === n.id)) ??
      network.nodes[0] ??
      null;

    set({
      selectedRegionId: id,
      explorationState: 'REGION_VIEW',
      activeNetwork: network,
      selectedNeuronId: starterNeuron?.id ?? null,
      hoveredNeuronId: null,
      selectedEdgeId: null,
      triggeredNeuronId: null,
      followedNeuronId: null,
      followSignalActive: false,
      neuronFiringLog: [],
      signalStory: [],
      externalInputsNa: buildBaselineInputs(network),
      networkSimResult: null,
      neuronSimResult: null,
      isPlayingSignals: false,
      playbackTimeMs: 0,
      simError: null,
    });
  },

  setTissueDensity: (density) => {
    const state = get();
    set({ tissueDensity: density });
    if (state.selectedRegionId) {
      const network = generateBiologicalRegionNetwork(state.selectedRegionId, density);
      const preserved = state.selectedNeuronId
        ? network.nodes.find((n) => n.id === state.selectedNeuronId)
        : undefined;
      const starter =
        preserved ??
        network.nodes.find((n) => network.edges.some((e) => e.source === n.id)) ??
        network.nodes[0] ??
        null;
      set({
        activeNetwork: network,
        selectedNeuronId: starter?.id ?? null,
        selectedEdgeId: null,
        triggeredNeuronId: null,
        followedNeuronId: null,
        followSignalActive: false,
        neuronFiringLog: [],
        signalStory: [],
        externalInputsNa: buildBaselineInputs(network),
        networkSimResult: null,
        isPlayingSignals: false,
        playbackTimeMs: 0,
      });
    }
  },

  setHoveredNeuron: (id) => set({ hoveredNeuronId: id }),

  selectNeuron: (id, focusCamera = false) => {
    const state = get();
    const firstOutgoing = id
      ? state.activeNetwork?.edges.find((e) => e.source === id) ?? null
      : null;

    set({
      selectedNeuronId: id,
      selectedEdgeId: firstOutgoing?.id ?? state.selectedEdgeId,
      followedNeuronId: null,
      followSignalActive: false,
      explorationState:
        focusCamera && id
          ? 'NEURON_VIEW'
          : state.explorationState === 'BRAIN_VIEW'
            ? 'REGION_VIEW'
            : state.explorationState,
    });
  },

  zoomIntoSelectedNeuron: () => {
    const state = get();
    if (!state.selectedNeuronId && state.activeNetwork?.nodes[0]) {
      set({
        selectedNeuronId: state.activeNetwork.nodes[0].id,
        explorationState: 'NEURON_VIEW',
        followSignalActive: false,
        followedNeuronId: null,
      });
      return;
    }
    if (state.selectedNeuronId) {
      set({
        explorationState: 'NEURON_VIEW',
        followSignalActive: false,
        followedNeuronId: null,
      });
    }
  },

  returnToTissueView: () =>
    set({
      explorationState: 'REGION_VIEW',
      followSignalActive: false,
      followedNeuronId: null,
    }),

  stepBack: () => {
    const state = get();
    if (state.explorationState === 'NEURON_VIEW' || state.explorationState === 'NETWORK_SIMULATION') {
      set({
        explorationState: 'REGION_VIEW',
        followSignalActive: false,
        followedNeuronId: null,
      });
    } else if (state.explorationState === 'REGION_VIEW') {
      get().resetToBrainView();
    }
  },

  resetToBrainView: () =>
    set({
      explorationState: 'BRAIN_VIEW',
      selectedRegionId: null,
      hoveredRegionId: null,
      selectedNeuronId: null,
      hoveredNeuronId: null,
      selectedEdgeId: null,
      triggeredNeuronId: null,
      followedNeuronId: null,
      followSignalActive: false,
      neuronFiringLog: [],
      signalStory: [],
      isPlayingSignals: false,
      playbackTimeMs: 0,
      showChartDrawer: false,
      simError: null,
    }),

  triggerCameraReset: () =>
    set((s) => ({
      followSignalActive: false,
      followedNeuronId: null,
      cameraResetNonce: s.cameraResetNonce + 1,
    })),

  selectEdge: (id) => set({ selectedEdgeId: id }),

  selectAnatomyPart: (part) => set({ selectedAnatomyPart: part }),

  updateEdgeWeight: (edgeId, weight) =>
    set((s) => {
      if (!s.activeNetwork) return s;
      const edges = s.activeNetwork.edges.map((e) =>
        e.id === edgeId
          ? {
              ...e,
              weight,
              synapse_type: weight >= 0 ? ('excitatory' as const) : ('inhibitory' as const),
            }
          : e
      );
      return { activeNetwork: { ...s.activeNetwork, edges } };
    }),

  updateEdgeDelay: (edgeId, delayMs) =>
    set((s) => {
      if (!s.activeNetwork) return s;
      const edges = s.activeNetwork.edges.map((e) =>
        e.id === edgeId ? { ...e, delay_ms: delayMs } : e
      );
      return { activeNetwork: { ...s.activeNetwork, edges } };
    }),

  toggleEdgeEnabled: (edgeId) =>
    set((s) => {
      if (!s.activeNetwork) return s;
      const edges = s.activeNetwork.edges.map((e) =>
        e.id === edgeId ? { ...e, enabled: !e.enabled } : e
      );
      return {
        activeNetwork: {
          ...s.activeNetwork,
          edges,
          graph_summary: {
            ...s.activeNetwork.graph_summary,
            active_edge_count: edges.filter((e) => e.enabled).length,
          },
        },
      };
    }),

  updateNodeExternalInput: (nodeId, currentNa) =>
    set((s) => ({
      externalInputsNa: {
        ...s.externalInputsNa,
        [nodeId]: currentNa,
      },
    })),

  resetActiveNetwork: () => {
    const regionId = get().selectedRegionId;
    if (!regionId) return;
    const network = generateBiologicalRegionNetwork(regionId, get().tissueDensity);
    set({
      activeNetwork: network,
      selectedNeuronId: network.nodes[0]?.id ?? null,
      selectedEdgeId: null,
      triggeredNeuronId: null,
      followedNeuronId: null,
      followSignalActive: false,
      neuronFiringLog: [],
      signalStory: [],
      externalInputsNa: buildBaselineInputs(network),
      networkSimResult: null,
      isPlayingSignals: false,
      playbackTimeMs: 0,
      simError: null,
    });
  },

  updateLifParam: (key, value) =>
    set((s) => ({
      lifParams: { ...s.lifParams, [key]: value },
    })),

  resetLifParams: () =>
    set({
      lifParams: { ...DEFAULT_LIF_PARAMS },
      neuronSimResult: null,
      compareSimResult: null,
      simError: null,
    }),

  pinCurrentAsBaseline: () =>
    set((s) => ({
      baselineLifParams: { ...s.lifParams },
    })),

  sendSignalFromSelectedNeuron: async () => {
    const state = get();
    if (!state.activeNetwork || !state.selectedRegionId) return;
    const targetId = state.selectedNeuronId ?? state.activeNetwork.nodes[0]?.id;
    if (!targetId) return;

    // Inject stimulus into the selected neuron using the exact LIF input & pulse window
    const stimulusInputs: Record<string, number> = {
      ...state.externalInputsNa,
      [targetId]: state.lifParams.input_current_na,
    };

    set({
      selectedNeuronId: targetId,
      triggeredNeuronId: targetId,
      isSimulating: true,
      simError: null,
      followSignalActive: false,
      followedNeuronId: null,
    });

    try {
      const allowBackend = state.backendState === 'online';
      const [{ result: netResult, source }, { result: singleResult }] = await Promise.all([
        simulationApi.simulateNetwork(
          {
            region_id: state.selectedRegionId,
            nodes: state.activeNetwork.nodes,
            edges: state.activeNetwork.edges,
            external_inputs_na: stimulusInputs,
            lif: state.lifParams,
            pulseWindowMs: [state.lifParams.pulse_start_ms, state.lifParams.pulse_end_ms],
          },
          allowBackend
        ),
        simulationApi.simulateNeuron(state.lifParams, allowBackend),
      ]);

      const firingLog = buildNeuronFiringLog(netResult, state.activeNetwork);
      const story = buildSignalNarrative(netResult, state.activeNetwork, targetId);

      set({
        networkSimResult: netResult,
        neuronSimResult: singleResult,
        lastSolverSource: source,
        neuronFiringLog: firingLog,
        signalStory: story,
        isSimulating: false,
        isPlayingSignals: netResult.total_spikes > 0,
        playbackTimeMs: 0,
      });
    } catch (err) {
      const message =
        err instanceof BackendApiError ? err.message : 'Unable to compute neural signal.';
      set({
        isSimulating: false,
        simError: message,
        isPlayingSignals: false,
      });
    }
  },

  followNextSignalHop: () => {
    const state = get();
    if (!state.networkSimResult || state.signalStory.length === 0) return;
    const currentFocus = state.followedNeuronId ?? state.triggeredNeuronId ?? state.selectedNeuronId;

    // Find next downstream step in the story
    const nextStep =
      state.signalStory.find((step) => step.sourceId === currentFocus) ?? state.signalStory[0];

    set({
      followedNeuronId: nextStep.targetId,
      selectedNeuronId: nextStep.targetId,
      selectedEdgeId: nextStep.edgeId,
      followSignalActive: true,
      playbackTimeMs: Math.max(0, nextStep.fireTimeMs - 0.5),
      isPlayingSignals: true,
    });
  },

  focusNeuronAtTime: (neuronId, timeMs, edgeId = null) =>
    set((s) => ({
      selectedNeuronId: neuronId,
      selectedEdgeId: edgeId ?? s.selectedEdgeId,
      followedNeuronId: null,
      followSignalActive: false,
      isPlayingSignals: false,
      playbackTimeMs: Math.max(0, Math.min(s.lifParams.duration_ms, timeMs)),
    })),

  stopFollowingSignal: () =>
    set({
      followSignalActive: false,
      followedNeuronId: null,
    }),

  runNeuronSimulation: async () => {
    const state = get();
    set({ isSimulating: true, simError: null, showChartDrawer: true });
    try {
      const { result, source } = await simulationApi.simulateNeuron(
        state.lifParams,
        state.backendState === 'online'
      );
      set({
        neuronSimResult: result,
        lastSolverSource: source,
        isSimulating: false,
      });
    } catch (err) {
      set({
        isSimulating: false,
        simError: err instanceof Error ? err.message : 'LIF solver failed.',
      });
    }
  },

  runCompareSimulation: async () => {
    const state = get();
    const baseline = state.baselineLifParams ?? DEFAULT_LIF_PARAMS;
    set({ isSimulating: true, simError: null, showChartDrawer: true });
    try {
      const { result, source } = await simulationApi.compareNeurons(
        baseline,
        state.lifParams,
        state.backendState === 'online'
      );
      set({
        compareSimResult: result,
        neuronSimResult: result.variant,
        lastSolverSource: source,
        isSimulating: false,
      });
    } catch (err) {
      set({
        isSimulating: false,
        simError: err instanceof Error ? err.message : 'Comparison failed.',
      });
    }
  },

  runNetworkSimulation: async () => {
    const state = get();
    if (!state.activeNetwork || !state.selectedRegionId) return;
    set({ isSimulating: true, simError: null, showChartDrawer: true });
    try {
      const triggerId = state.selectedNeuronId ?? state.activeNetwork.nodes[0]?.id ?? '';
      const mergedInputs = {
        ...state.externalInputsNa,
        ...(triggerId && (state.externalInputsNa[triggerId] ?? 0) === 0
          ? { [triggerId]: state.lifParams.input_current_na }
          : {}),
      };
      const { result, source } = await simulationApi.simulateNetwork(
        {
          region_id: state.selectedRegionId,
          nodes: state.activeNetwork.nodes,
          edges: state.activeNetwork.edges,
          external_inputs_na: mergedInputs,
          lif: state.lifParams,
        },
        state.backendState === 'online'
      );
      const firingLog = buildNeuronFiringLog(result, state.activeNetwork);
      const story = buildSignalNarrative(result, state.activeNetwork, triggerId);
      set({
        networkSimResult: result,
        lastSolverSource: source,
        triggeredNeuronId: triggerId,
        neuronFiringLog: firingLog,
        signalStory: story,
        isSimulating: false,
        isPlayingSignals: result.total_spikes > 0,
        playbackTimeMs: 0,
      });
    } catch (err) {
      set({
        isSimulating: false,
        simError: err instanceof Error ? err.message : 'Network simulation failed.',
      });
    }
  },

  clearSimulationError: () => set({ simError: null }),

  setPlayingSignals: (playing) => set({ isPlayingSignals: playing }),
  setPlaybackTimeMs: (t) => set({ playbackTimeMs: t }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  toggleReducedQuality: () => set((s) => ({ reducedQuality: !s.reducedQuality })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setShowInfoPanel: (open) => set({ showInfoPanel: open }),
  setExperimentOpen: (open) => set({ experimentOpen: open }),
  setShowChartDrawer: (open) => set({ showChartDrawer: open }),
}));
