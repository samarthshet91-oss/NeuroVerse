export type ExplorationState =
  | 'BRAIN_VIEW'
  | 'REGION_VIEW'
  | 'NEURON_VIEW'
  | 'NETWORK_SIMULATION';

export type BrainRegionId =
  | 'frontal'
  | 'parietal'
  | 'temporal'
  | 'occipital'
  | 'cerebellum'
  | 'brainstem';

export type NeuronRole = 'excitatory' | 'inhibitory' | 'input' | 'output';

export type NeuronAnatomyPartId =
  | 'dendrites'
  | 'soma'
  | 'axon'
  | 'myelin'
  | 'terminals'
  | 'synapse';

export type TissueDensity = 70 | 110 | 140;

export type SimulationSource = 'fastapi-python' | 'local-typescript';

export interface BrainRegion {
  id: BrainRegionId;
  name: string;
  short_label: string;
  subtitle: string;
  simple_summary: string;
  description: string;
  primary_functions: string[];
  dominant_neurotransmitters: string[];
  approximate_neuron_scale: string;
  marker_position: [number, number, number];
  accent_color: string;
  is_illustrative_placeholder: boolean;
}

export interface NeuronNode {
  id: string;
  label: string;
  role: NeuronRole;
  position: [number, number, number];
  baseline_input_na: number;
}

export interface BiologicalNeuronNode extends NeuronNode {
  index: number;
  orientation: [number, number, number];
  scale: number;
  has_myelin: boolean;
  /** World-space spline paths for each dendritic branch emerging from soma */
  dendrite_branches: [number, number, number][][];
  /** World-space tips of dendrites where incoming synapses can dock */
  dendrite_tips: [number, number, number][];
  /** World-space primary axon trajectory points */
  axon_points: [number, number, number][];
}

export interface SynapseEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  delay_ms: number;
  enabled: boolean;
  synapse_type: 'excitatory' | 'inhibitory';
}

export interface BiologicalSynapseEdge extends SynapseEdge {
  /** World-space spline points from source soma along its axon to the target dendrite tip */
  curve_points: [number, number, number][];
  /** World-space position of the synaptic cleft junction */
  synapse_position: [number, number, number];
  /** World-space position of the presynaptic bouton slightly before the cleft */
  terminal_position: [number, number, number];
  /** Target dendrite tip coordinate */
  target_dendrite_tip: [number, number, number];
}

export interface GraphSummary {
  node_count: number;
  active_edge_count: number;
  total_defined_edges: number;
  density: number;
  recurrent_components: number;
  is_dag: boolean;
}

export interface RegionNetwork {
  region_id: BrainRegionId;
  region_name: string;
  is_illustrative_model: boolean;
  model_note: string;
  nodes: BiologicalNeuronNode[];
  edges: BiologicalSynapseEdge[];
  graph_summary: GraphSummary;
}

export interface NeuronAnatomyPart {
  id: NeuronAnatomyPartId;
  name: string;
  simple_explanation: string;
  role_summary: string;
  biophysics_note: string;
  lif_mapping: string;
  accent_color: string;
}

export interface LIFParams {
  input_current_na: number;
  membrane_capacitance_nf: number;
  membrane_resistance_mohm: number;
  v_rest_mv: number;
  v_reset_mv: number;
  v_threshold_mv: number;
  refractory_period_ms: number;
  duration_ms: number;
  dt_ms: number;
  pulse_start_ms: number;
  pulse_end_ms: number;
}

export interface NeuronSimulationResponse {
  time_ms: number[];
  membrane_potential_mv: number[];
  input_current_trace_na: number[];
  spike_times_ms: number[];
  spike_count: number;
  firing_rate_hz: number;
  tau_m_ms: number;
  rheobase_na: number;
  solver_method: string;
  solver_source?: SimulationSource;
  model_assumptions: string[];
  limitations: string[];
}

export interface SpikeEvent {
  source_id: string;
  target_id: string;
  edge_id: string;
  fire_time_ms: number;
  arrival_time_ms: number;
  weight: number;
  delay_ms: number;
}

export interface NodeMetric {
  node_id: string;
  label: string;
  spike_count: number;
  spike_times_ms: number[];
  firing_rate_hz: number;
  first_spike_ms: number | null;
  mean_membrane_mv: number;
}

export interface NetworkSimulationResponse {
  region_id: string;
  time_ms: number[];
  membrane_traces_mv: Record<string, number[]>;
  spike_events: SpikeEvent[];
  node_metrics: NodeMetric[];
  total_spikes: number;
  active_edges_count: number;
  graph_summary: GraphSummary;
  solver_method: string;
  solver_source?: SimulationSource;
  model_assumptions: string[];
  limitations: string[];
}

export interface CompareSimulationResponse {
  baseline: NeuronSimulationResponse;
  variant: NeuronSimulationResponse;
  delta_spike_count: number;
  delta_firing_rate_hz: number;
  delta_first_spike_ms: number | null;
}

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  solver: string;
  numpy_version: string;
  networkx_version: string;
}

export type BackendConnectionState = 'checking' | 'online' | 'offline';
