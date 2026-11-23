import type { BrainRegion, NeuronAnatomyPart } from '@/src/types/neuroverse';

export const ILLUSTRATIVE_BRAIN_DISCLAIMER =
  'Illustrative 3D anatomical model and procedurally generated microcircuit — educational simulation, not a clinical scan or real human connectome.';

export const DEFAULT_BRAIN_REGIONS: BrainRegion[] = [
  {
    id: 'frontal',
    name: 'Frontal Lobe',
    short_label: 'Frontal',
    subtitle: 'Planning, decisions, and movement',
    simple_summary:
      'Helps you make choices, focus attention, solve puzzles, and move your muscles on purpose.',
    description:
      'Located behind the forehead, the frontal lobe coordinates working memory, decision-making, impulse regulation, and voluntary movement via the primary motor cortex and prefrontal circuits.',
    primary_functions: [
      'Working memory & executive planning',
      'Voluntary motor command initiation',
      "Speech production (Broca's area)",
    ],
    dominant_neurotransmitters: ['Glutamate', 'GABA', 'Dopamine'],
    approximate_neuron_scale: '~22 billion cortical neurons (literature estimate)',
    marker_position: [0.0, 0.52, 1.08],
    accent_color: '#22d3ee',
    is_illustrative_placeholder: true,
  },
  {
    id: 'parietal',
    name: 'Parietal Lobe',
    short_label: 'Parietal',
    subtitle: 'Touch, space, and body sense',
    simple_summary:
      'Processes what you feel with your skin and helps you know where objects are around you.',
    description:
      'Positioned near the crown of the cerebrum, the parietal lobe integrates touch, temperature, proprioception, and visuospatial coordinates to guide attention and sensorimotor coordination.',
    primary_functions: [
      'Tactile & proprioceptive processing',
      'Spatial navigation & coordinate mapping',
      'Multisensory attention integration',
    ],
    dominant_neurotransmitters: ['Glutamate', 'GABA', 'Acetylcholine'],
    approximate_neuron_scale: '~14 billion cortical neurons (literature estimate)',
    marker_position: [0.0, 0.98, -0.18],
    accent_color: '#38bdf8',
    is_illustrative_placeholder: true,
  },
  {
    id: 'temporal',
    name: 'Temporal Lobe',
    short_label: 'Temporal',
    subtitle: 'Sound, language, and memory',
    simple_summary:
      'Helps you understand spoken words, recognize faces or music, and remember past events.',
    description:
      'Spanning the lateral flanks of the cerebrum, the temporal lobe processes auditory patterns, speech comprehension, object recognition, and episodic memory encoding with adjacent medial structures.',
    primary_functions: [
      'Auditory frequency & speech decoding',
      'Semantic & episodic memory formation',
      'High-level visual object recognition',
    ],
    dominant_neurotransmitters: ['Glutamate', 'GABA', 'Acetylcholine'],
    approximate_neuron_scale: '~16 billion cortical neurons (literature estimate)',
    marker_position: [1.02, -0.05, 0.12],
    accent_color: '#a78bfa',
    is_illustrative_placeholder: true,
  },
  {
    id: 'occipital',
    name: 'Occipital Lobe',
    short_label: 'Occipital',
    subtitle: 'Vision, color, and motion',
    simple_summary:
      'Turns light signals from your eyes into shapes, colors, edges, and moving scenes.',
    description:
      'At the posterior pole of the brain, the occipital lobe receives retinotopic inputs from the thalamus and extracts edges, orientation, motion, and color across hierarchical visual areas.',
    primary_functions: [
      'Edge, orientation & contrast detection',
      'Color & motion pathway routing',
      'Retinotopic visual field mapping',
    ],
    dominant_neurotransmitters: ['Glutamate', 'GABA'],
    approximate_neuron_scale: '~9 billion cortical neurons (literature estimate)',
    marker_position: [0.0, 0.18, -1.16],
    accent_color: '#818cf8',
    is_illustrative_placeholder: true,
  },
  {
    id: 'cerebellum',
    name: 'Cerebellum',
    short_label: 'Cerebellum',
    subtitle: 'Balance, timing, and smooth motion',
    simple_summary:
      'Keeps your movements smooth and balanced—like riding a bike or catching a ball.',
    description:
      'Tucked beneath the occipital lobe, the densely folded cerebellum compares intended motor commands against sensory feedback to refine posture, timing, and smooth movement execution.',
    primary_functions: [
      'Sub-second motor timing & coordination',
      'Postural equilibrium & eye-movement calibration',
      'Procedural motor learning',
    ],
    dominant_neurotransmitters: ['Glutamate', 'GABA'],
    approximate_neuron_scale: '~69 billion neurons (dense granule cells)',
    marker_position: [0.0, -0.58, -0.88],
    accent_color: '#2dd4bf',
    is_illustrative_placeholder: true,
  },
  {
    id: 'brainstem',
    name: 'Brainstem',
    short_label: 'Brainstem',
    subtitle: 'Breathing, heartbeat, and alert state',
    simple_summary:
      'Runs automatic life-support tasks like breathing and heartbeats, and carries signals to the body.',
    description:
      'Connecting the cerebral hemispheres and cerebellum to the spinal cord, the midbrain, pons, and medulla sustain respiration, heart-rate rhythms, sleep-wake transitions, and cranial nerve relays.',
    primary_functions: [
      'Cardiorespiratory autonomic pacing',
      'Ascending arousal & sleep-wake modulation',
      'Corticospinal & cranial pathway relay',
    ],
    dominant_neurotransmitters: ['Serotonin', 'Norepinephrine', 'Acetylcholine', 'GABA'],
    approximate_neuron_scale: '~1 billion subcortical neurons (literature estimate)',
    marker_position: [0.0, -1.06, -0.22],
    accent_color: '#c084fc',
    is_illustrative_placeholder: true,
  },
];

export const NEURON_ANATOMY_PARTS: NeuronAnatomyPart[] = [
  {
    id: 'dendrites',
    name: 'Dendrites',
    simple_explanation: 'These tree-like branches receive incoming messages from neighboring neurons.',
    role_summary: 'Branched input arbors collecting excitatory and inhibitory post-synaptic potentials.',
    biophysics_note:
      'Passive cable attenuation and ligand-gated receptor currents funnel graded depolarizations toward the cell body.',
    lif_mapping: 'Summed into total input current I(t) in the Leaky Integrate-and-Fire equation.',
    accent_color: '#22d3ee',
  },
  {
    id: 'soma',
    name: 'Soma',
    simple_explanation: 'This is the main body of the neuron. It adds up incoming messages and decides whether to fire.',
    role_summary: 'Metabolic cell body and spike-initiation zone integrating incoming membrane charge.',
    biophysics_note:
      'Voltage-gated Na+ channels at the axon hillock trigger an action potential when voltage reaches threshold V_th.',
    lif_mapping: 'Represented by membrane capacitance C_m, leak resistance R_m, and voltage V(t).',
    accent_color: '#38bdf8',
  },
  {
    id: 'axon',
    name: 'Axon',
    simple_explanation: 'This long cable carries the electrical spike away from the cell body toward other neurons.',
    role_summary: 'Long conducting projection fiber propagating all-or-nothing action potentials.',
    biophysics_note:
      'Maintains signal amplitude over long distances with a finite conduction delay.',
    lif_mapping: 'Modeled as signal transmission delay (delay_ms) along each directed edge.',
    accent_color: '#818cf8',
  },
  {
    id: 'myelin',
    name: 'Myelin Sheath',
    simple_explanation: 'Protective fatty sleeves wrapped around some axons that help messages travel much faster.',
    role_summary: 'Segmented glial lipid insulation separated by exposed Nodes of Ranvier.',
    biophysics_note:
      'Decreases effective membrane capacitance and increases transverse resistance for saltatory conduction.',
    lif_mapping: 'Corresponds to shorter conduction delays between connected neurons.',
    accent_color: '#2dd4bf',
  },
  {
    id: 'terminals',
    name: 'Axon Terminals',
    simple_explanation: 'The branching end tips of the axon that release chemical messengers across a synapse.',
    role_summary: 'Distal synaptic boutons releasing neurotransmitters across the synaptic cleft.',
    biophysics_note:
      'Spike arrival triggers Ca2+-dependent vesicle fusion, exciting or inhibiting downstream targets.',
    lif_mapping: 'Delivers weighted synaptic current (+ excitatory, - inhibitory) when a spike arrives.',
    accent_color: '#a78bfa',
  },
  {
    id: 'synapse',
    name: 'Synapse',
    simple_explanation: 'This is where one neuron passes a message across a tiny gap to the next neuron.',
    role_summary: 'Directional junction coupling an axon terminal to a postsynaptic dendrite.',
    biophysics_note:
      'Neurotransmitters bind postsynaptic receptors, creating a decaying excitatory or inhibitory current pulse.',
    lif_mapping: 'Represented as a directed edge with synaptic weight w and transmission delay_ms.',
    accent_color: '#f59e0b',
  },
];
