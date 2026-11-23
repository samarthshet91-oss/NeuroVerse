"""Illustrative brain region metadata and synthetic network topologies.

Note: These networks are intentionally simplified, configurable educational
models designed for exploring Leaky Integrate-and-Fire dynamics. They do NOT
represent anatomical human connectome reconstructions.
"""

from typing import Dict, List

BRAIN_REGIONS: List[dict] = [
    {
        "id": "frontal",
        "name": "Frontal Lobe",
        "short_label": "Frontal",
        "subtitle": "Executive control, planning, and motor initiation",
        "description": (
            "Located behind the forehead, the frontal lobe coordinates working memory, "
            "decision-making, impulse regulation, and voluntary movement via the primary "
            "motor cortex and prefrontal circuits."
        ),
        "primary_functions": [
            "Working memory & executive planning",
            "Voluntary motor command initiation",
            "Speech production (Broca's area)",
        ],
        "dominant_neurotransmitters": ["Glutamate", "GABA", "Dopamine"],
        "approximate_neuron_scale": "~22 billion cortical neurons (literature estimate)",
        "marker_position": [0.0, 0.52, 1.08],
        "accent_color": "#22d3ee",
        "is_illustrative_placeholder": True,
    },
    {
        "id": "parietal",
        "name": "Parietal Lobe",
        "short_label": "Parietal",
        "subtitle": "Somatosensory integration and spatial awareness",
        "description": (
            "Positioned near the crown of the cerebrum, the parietal lobe integrates touch, "
            "temperature, proprioception, and visuospatial coordinates to guide attention "
            "and sensorimotor coordination."
        ),
        "primary_functions": [
            "Tactile & proprioceptive processing",
            "Spatial navigation & coordinate mapping",
            "Multisensory attention integration",
        ],
        "dominant_neurotransmitters": ["Glutamate", "GABA", "Acetylcholine"],
        "approximate_neuron_scale": "~14 billion cortical neurons (literature estimate)",
        "marker_position": [0.0, 0.98, -0.18],
        "accent_color": "#38bdf8",
        "is_illustrative_placeholder": True,
    },
    {
        "id": "temporal",
        "name": "Temporal Lobe",
        "short_label": "Temporal",
        "subtitle": "Auditory processing, language comprehension, and memory",
        "description": (
            "Spanning the lateral flanks of the cerebrum, the temporal lobe processes "
            "auditory patterns, speech comprehension, object recognition, and episodic "
            "memory encoding with adjacent medial structures."
        ),
        "primary_functions": [
            "Auditory frequency & speech decoding",
            "Semantic & episodic memory formation",
            "High-level visual object recognition",
        ],
        "dominant_neurotransmitters": ["Glutamate", "GABA", "Acetylcholine"],
        "approximate_neuron_scale": "~16 billion cortical neurons (literature estimate)",
        "marker_position": [1.02, -0.05, 0.12],
        "accent_color": "#a78bfa",
        "is_illustrative_placeholder": True,
    },
    {
        "id": "occipital",
        "name": "Occipital Lobe",
        "short_label": "Occipital",
        "subtitle": "Primary visual feature extraction and cortical mapping",
        "description": (
            "At the posterior pole of the brain, the occipital lobe receives retinotopic "
            "inputs from the thalamus and extracts edges, orientation, motion, and color "
            "across hierarchical visual areas."
        ),
        "primary_functions": [
            "Edge, orientation & contrast detection",
            "Color & motion pathway routing",
            "Retinotopic visual field mapping",
        ],
        "dominant_neurotransmitters": ["Glutamate", "GABA"],
        "approximate_neuron_scale": "~9 billion cortical neurons (literature estimate)",
        "marker_position": [0.0, 0.18, -1.16],
        "accent_color": "#818cf8",
        "is_illustrative_placeholder": True,
    },
    {
        "id": "cerebellum",
        "name": "Cerebellum",
        "short_label": "Cerebellum",
        "subtitle": "Fine motor timing, balance, and error-driven adaptation",
        "description": (
            "Tucked beneath the occipital lobe, the densely folded cerebellum compares "
            "intended motor commands against sensory feedback to refine posture, timing, "
            "and smooth movement execution."
        ),
        "primary_functions": [
            "Sub-second motor timing & coordination",
            "Postural equilibrium & eye-movement calibration",
            "Procedural motor learning",
        ],
        "dominant_neurotransmitters": ["Glutamate", "GABA"],
        "approximate_neuron_scale": "~69 billion neurons (dense granule cells)",
        "marker_position": [0.0, -0.58, -0.88],
        "accent_color": "#2dd4bf",
        "is_illustrative_placeholder": True,
    },
    {
        "id": "brainstem",
        "name": "Brainstem",
        "short_label": "Brainstem",
        "subtitle": "Autonomic regulation, arousal, and sensorimotor relay",
        "description": (
            "Connecting the cerebral hemispheres and cerebellum to the spinal cord, "
            "the midbrain, pons, and medulla sustain respiration, heart-rate rhythms, "
            "sleep-wake transitions, and cranial nerve relays."
        ),
        "primary_functions": [
            "Cardiorespiratory autonomic pacing",
            "Ascending arousal & sleep-wake modulation",
            "Corticospinal & cranial pathway relay",
        ],
        "dominant_neurotransmitters": ["Serotonin", "Norepinephrine", "Acetylcholine", "GABA"],
        "approximate_neuron_scale": "~1 billion subcortical neurons (literature estimate)",
        "marker_position": [0.0, -1.06, -0.22],
        "accent_color": "#c084fc",
        "is_illustrative_placeholder": True,
    },
]


REGION_NETWORKS: Dict[str, dict] = {
    "frontal": {
        "region_id": "frontal",
        "region_name": "Frontal Lobe",
        "is_illustrative_model": True,
        "model_note": "Illustrative recurrent executive microcircuit (synthetic graph, not a human connectome).",
        "nodes": [
            {"id": "fr-in-1", "label": "Prefrontal Input A", "role": "input", "position": [-3.2, 0.8, 0.5], "baseline_input_na": 2.4},
            {"id": "fr-in-2", "label": "Prefrontal Input B", "role": "input", "position": [-3.1, -0.9, -0.6], "baseline_input_na": 1.6},
            {"id": "fr-exc-1", "label": "Pyramidal Relay 1", "role": "excitatory", "position": [-0.8, 1.0, 0.2], "baseline_input_na": 0.4},
            {"id": "fr-exc-2", "label": "Pyramidal Loop 2", "role": "excitatory", "position": [-0.4, -0.7, 0.9], "baseline_input_na": 0.2},
            {"id": "fr-inh-1", "label": "PV Interneuron", "role": "inhibitory", "position": [1.1, 0.2, -1.0], "baseline_input_na": 0.0},
            {"id": "fr-out-1", "label": "Motor Output Unit", "role": "output", "position": [3.0, 0.3, 0.1], "baseline_input_na": 0.0},
        ],
        "edges": [
            {"id": "fr-e1", "source": "fr-in-1", "target": "fr-exc-1", "weight": 3.4, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "fr-e2", "source": "fr-in-2", "target": "fr-exc-2", "weight": 3.0, "delay_ms": 2.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "fr-e3", "source": "fr-exc-1", "target": "fr-exc-2", "weight": 2.4, "delay_ms": 3.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "fr-e4", "source": "fr-exc-2", "target": "fr-exc-1", "weight": 1.8, "delay_ms": 3.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "fr-e5", "source": "fr-exc-1", "target": "fr-inh-1", "weight": 2.6, "delay_ms": 1.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "fr-e6", "source": "fr-inh-1", "target": "fr-exc-2", "weight": -2.2, "delay_ms": 2.0, "enabled": True, "synapse_type": "inhibitory"},
            {"id": "fr-e7", "source": "fr-exc-1", "target": "fr-out-1", "weight": 3.2, "delay_ms": 2.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "fr-e8", "source": "fr-exc-2", "target": "fr-out-1", "weight": 2.8, "delay_ms": 2.5, "enabled": True, "synapse_type": "excitatory"},
        ],
    },
    "parietal": {
        "region_id": "parietal",
        "region_name": "Parietal Lobe",
        "is_illustrative_model": True,
        "model_note": "Illustrative multisensory convergence circuit (synthetic graph, not a human connectome).",
        "nodes": [
            {"id": "pa-in-1", "label": "Tactile Afferent", "role": "input", "position": [-3.0, 1.1, 0.3], "baseline_input_na": 2.3},
            {"id": "pa-in-2", "label": "Spatial Visual Cue", "role": "input", "position": [-3.0, -0.8, -0.4], "baseline_input_na": 2.1},
            {"id": "pa-exc-1", "label": "Multimodal Hub", "role": "excitatory", "position": [-0.3, 0.2, 0.5], "baseline_input_na": 0.3},
            {"id": "pa-inh-1", "label": "Gain Modulator", "role": "inhibitory", "position": [0.4, -1.0, -0.8], "baseline_input_na": 0.0},
            {"id": "pa-out-1", "label": "Spatial Map Readout", "role": "output", "position": [2.9, 0.4, 0.0], "baseline_input_na": 0.0},
        ],
        "edges": [
            {"id": "pa-e1", "source": "pa-in-1", "target": "pa-exc-1", "weight": 3.1, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "pa-e2", "source": "pa-in-2", "target": "pa-exc-1", "weight": 2.9, "delay_ms": 2.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "pa-e3", "source": "pa-exc-1", "target": "pa-inh-1", "weight": 2.5, "delay_ms": 1.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "pa-e4", "source": "pa-inh-1", "target": "pa-exc-1", "weight": -1.8, "delay_ms": 2.5, "enabled": True, "synapse_type": "inhibitory"},
            {"id": "pa-e5", "source": "pa-exc-1", "target": "pa-out-1", "weight": 3.6, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
        ],
    },
    "temporal": {
        "region_id": "temporal",
        "region_name": "Temporal Lobe",
        "is_illustrative_model": True,
        "model_note": "Illustrative auditory-memory sequence circuit (synthetic graph, not a human connectome).",
        "nodes": [
            {"id": "te-in-1", "label": "Auditory Stream", "role": "input", "position": [-3.2, 0.4, 0.2], "baseline_input_na": 2.5},
            {"id": "te-exc-1", "label": "Spectral Decoder", "role": "excitatory", "position": [-1.2, 1.0, -0.3], "baseline_input_na": 0.2},
            {"id": "te-exc-2", "label": "Associative Cell", "role": "excitatory", "position": [0.7, 0.6, 0.8], "baseline_input_na": 0.4},
            {"id": "te-inh-1", "label": "Timing Gate", "role": "inhibitory", "position": [0.3, -1.0, -0.5], "baseline_input_na": 0.0},
            {"id": "te-out-1", "label": "Semantic Output", "role": "output", "position": [3.0, 0.2, 0.1], "baseline_input_na": 0.0},
        ],
        "edges": [
            {"id": "te-e1", "source": "te-in-1", "target": "te-exc-1", "weight": 3.5, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "te-e2", "source": "te-exc-1", "target": "te-exc-2", "weight": 3.2, "delay_ms": 3.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "te-e3", "source": "te-exc-2", "target": "te-inh-1", "weight": 2.3, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "te-e4", "source": "te-inh-1", "target": "te-exc-1", "weight": -1.6, "delay_ms": 2.5, "enabled": True, "synapse_type": "inhibitory"},
            {"id": "te-e5", "source": "te-exc-2", "target": "te-out-1", "weight": 3.4, "delay_ms": 2.5, "enabled": True, "synapse_type": "excitatory"},
        ],
    },
    "occipital": {
        "region_id": "occipital",
        "region_name": "Occipital Lobe",
        "is_illustrative_model": True,
        "model_note": "Illustrative hierarchical visual feed-forward circuit (synthetic graph, not a human connectome).",
        "nodes": [
            {"id": "oc-in-1", "label": "Thalamic LGN A", "role": "input", "position": [-3.2, 0.9, 0.0], "baseline_input_na": 2.4},
            {"id": "oc-in-2", "label": "Thalamic LGN B", "role": "input", "position": [-3.2, -0.9, 0.0], "baseline_input_na": 1.8},
            {"id": "oc-exc-1", "label": "V1 Simple Cell", "role": "excitatory", "position": [-0.9, 0.5, 0.5], "baseline_input_na": 0.2},
            {"id": "oc-inh-1", "label": "Surround Inhibition", "role": "inhibitory", "position": [-0.5, -0.9, -0.6], "baseline_input_na": 0.0},
            {"id": "oc-exc-2", "label": "V2 Orientation Cell", "role": "excitatory", "position": [1.3, 0.4, 0.2], "baseline_input_na": 0.0},
            {"id": "oc-out-1", "label": "Dorsal/Ventral Relay", "role": "output", "position": [3.2, 0.1, 0.0], "baseline_input_na": 0.0},
        ],
        "edges": [
            {"id": "oc-e1", "source": "oc-in-1", "target": "oc-exc-1", "weight": 3.3, "delay_ms": 1.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "oc-e2", "source": "oc-in-2", "target": "oc-inh-1", "weight": 2.8, "delay_ms": 1.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "oc-e3", "source": "oc-inh-1", "target": "oc-exc-1", "weight": -1.5, "delay_ms": 2.0, "enabled": True, "synapse_type": "inhibitory"},
            {"id": "oc-e4", "source": "oc-exc-1", "target": "oc-exc-2", "weight": 3.6, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "oc-e5", "source": "oc-exc-2", "target": "oc-out-1", "weight": 3.4, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
        ],
    },
    "cerebellum": {
        "region_id": "cerebellum",
        "region_name": "Cerebellum",
        "is_illustrative_model": True,
        "model_note": "Illustrative granule-Purkinje-deep nuclei microcircuit (synthetic graph, not a human connectome).",
        "nodes": [
            {"id": "cb-in-1", "label": "Mossy Fiber Input", "role": "input", "position": [-3.1, 0.5, 0.3], "baseline_input_na": 2.6},
            {"id": "cb-exc-1", "label": "Granule Cell", "role": "excitatory", "position": [-1.0, 0.9, 0.1], "baseline_input_na": 0.3},
            {"id": "cb-inh-1", "label": "Purkinje Cell", "role": "inhibitory", "position": [0.9, 0.7, -0.4], "baseline_input_na": 0.8},
            {"id": "cb-out-1", "label": "Deep Cerebellar Nucleus", "role": "output", "position": [2.9, -0.3, 0.2], "baseline_input_na": 2.0},
        ],
        "edges": [
            {"id": "cb-e1", "source": "cb-in-1", "target": "cb-exc-1", "weight": 3.4, "delay_ms": 1.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "cb-e2", "source": "cb-in-1", "target": "cb-out-1", "weight": 2.4, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "cb-e3", "source": "cb-exc-1", "target": "cb-inh-1", "weight": 3.1, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "cb-e4", "source": "cb-inh-1", "target": "cb-out-1", "weight": -2.6, "delay_ms": 2.0, "enabled": True, "synapse_type": "inhibitory"},
        ],
    },
    "brainstem": {
        "region_id": "brainstem",
        "region_name": "Brainstem",
        "is_illustrative_model": True,
        "model_note": "Illustrative autonomic pacemaker-relay loop (synthetic graph, not a human connectome).",
        "nodes": [
            {"id": "bs-in-1", "label": "Pacemaker Drive", "role": "input", "position": [-3.0, 0.2, 0.0], "baseline_input_na": 2.4},
            {"id": "bs-exc-1", "label": "Reticular Relay", "role": "excitatory", "position": [-0.7, 0.7, 0.5], "baseline_input_na": 0.2},
            {"id": "bs-inh-1", "label": "Reflex Dampener", "role": "inhibitory", "position": [-0.4, -0.9, -0.4], "baseline_input_na": 0.0},
            {"id": "bs-out-1", "label": "Autonomic Output", "role": "output", "position": [2.8, 0.1, 0.1], "baseline_input_na": 0.0},
        ],
        "edges": [
            {"id": "bs-e1", "source": "bs-in-1", "target": "bs-exc-1", "weight": 3.5, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
            {"id": "bs-e2", "source": "bs-exc-1", "target": "bs-inh-1", "weight": 2.7, "delay_ms": 2.5, "enabled": True, "synapse_type": "excitatory"},
            {"id": "bs-e3", "source": "bs-inh-1", "target": "bs-exc-1", "weight": -2.0, "delay_ms": 3.0, "enabled": True, "synapse_type": "inhibitory"},
            {"id": "bs-e4", "source": "bs-exc-1", "target": "bs-out-1", "weight": 3.4, "delay_ms": 2.0, "enabled": True, "synapse_type": "excitatory"},
        ],
    },
}
