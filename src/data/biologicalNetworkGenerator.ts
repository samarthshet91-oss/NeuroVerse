import * as THREE from 'three';
import type {
  BiologicalNeuronNode,
  BiologicalSynapseEdge,
  BrainRegionId,
  NeuronRole,
  RegionNetwork,
  TissueDensity,
} from '@/src/types/neuroverse';

const REGION_SEEDS: Record<BrainRegionId, number> = {
  frontal: 104729,
  parietal: 224737,
  temporal: 350377,
  occipital: 479909,
  cerebellum: 611953,
  brainstem: 746773,
};

const REGION_NAMES: Record<BrainRegionId, string> = {
  frontal: 'Frontal Lobe',
  parietal: 'Parietal Lobe',
  temporal: 'Temporal Lobe',
  occipital: 'Occipital Lobe',
  cerebellum: 'Cerebellum',
  brainstem: 'Brainstem',
};

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTuple(v: THREE.Vector3): [number, number, number] {
  return [
    Number(v.x.toFixed(3)),
    Number(v.y.toFixed(3)),
    Number(v.z.toFixed(3)),
  ];
}

/**
 * Generates an illustrative, 3D biologically-structured neural microcircuit
 * of 70–140 branching neurons with soma, dendrites, curving axons, optional
 * myelin flags, axon terminals, and physical synapse connections.
 *
 * Clearly labeled as a procedural educational model, NOT an anatomical connectome.
 */
export function generateBiologicalRegionNetwork(
  regionId: BrainRegionId,
  density: TissueDensity = 110
): RegionNetwork {
  const rng = createRng(REGION_SEEDS[regionId] + density * 31);
  const nodes: BiologicalNeuronNode[] = [];

  // Organic 3D neural tissue volume (spread naturally, never a circle or grid)
  const spreadX = 15.5;
  const spreadY = 9.5;
  const spreadZ = 13.5;
  const minDist = density >= 140 ? 1.55 : density >= 110 ? 1.75 : 2.1;

  const positions: THREE.Vector3[] = [];
  let attempts = 0;
  while (positions.length < density && attempts < density * 40) {
    attempts++;
    // Slight organic layered undulation mimicking cortical/nuclear tissue pockets
    const u = rng() * 2 - 1;
    const v = rng() * 2 - 1;
    const w = rng() * 2 - 1;
    // Soft radial falloff so the cloud feels organic rather than a sharp box
    if (u * u * 0.6 + v * v * 0.8 + w * w * 0.6 > 1.25) continue;

    const candidate = new THREE.Vector3(
      u * (spreadX * 0.5),
      v * (spreadY * 0.5) + Math.sin(u * 2.1 + w * 1.4) * 0.65,
      w * (spreadZ * 0.5)
    );

    let tooClose = false;
    for (let i = 0; i < positions.length; i++) {
      if (positions[i].distanceToSquared(candidate) < minDist * minDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      positions.push(candidate);
    }
  }

  // Fallback fill if rejection sampling left a few slots short
  while (positions.length < density) {
    positions.push(
      new THREE.Vector3(
        (rng() * 2 - 1) * (spreadX * 0.48),
        (rng() * 2 - 1) * (spreadY * 0.48),
        (rng() * 2 - 1) * (spreadZ * 0.48)
      )
    );
  }

  // Build biological morphology per neuron
  for (let i = 0; i < positions.length; i++) {
    const somaPos = positions[i];
    const scale = 0.78 + rng() * 0.44;
    const orientation: [number, number, number] = [
      (rng() - 0.5) * 1.4,
      rng() * Math.PI * 2,
      (rng() - 0.5) * 1.4,
    ];
    const rotEuler = new THREE.Euler(...orientation);

    // Assign biological role organically (mostly excitatory pyramidal-like, ~18% inhibitory)
    let role: NeuronRole = 'excitatory';
    const roleRoll = rng();
    if (i < 8) {
      role = 'input';
    } else if (roleRoll < 0.18) {
      role = 'inhibitory';
    } else if (roleRoll > 0.9) {
      role = 'output';
    }

    // Generate 4–5 branching dendritic arbors radiating unevenly around the soma
    const branchCount = role === 'inhibitory' ? 4 : 5;
    const dendrite_branches: [number, number, number][][] = [];
    const dendrite_tips: [number, number, number][] = [];

    for (let b = 0; b < branchCount; b++) {
      const theta = (b / branchCount) * Math.PI * 2 + (rng() - 0.5) * 0.65;
      const phi = (rng() - 0.35) * 1.45;
      const dir = new THREE.Vector3(
        Math.cos(theta) * Math.cos(phi),
        Math.sin(phi) + 0.25,
        Math.sin(theta) * Math.cos(phi)
      )
        .normalize()
        .applyEuler(rotEuler);

      const len1 = (0.52 + rng() * 0.35) * scale;
      const len2 = (0.45 + rng() * 0.38) * scale;

      const p0 = somaPos.clone().addScaledVector(dir, 0.14 * scale);
      const midJitter = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.22);
      const p1 = somaPos.clone().addScaledVector(dir, len1).add(midJitter);
      const tipJitter = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.32);
      const p2 = p1.clone().addScaledVector(dir, len2).add(tipJitter);

      dendrite_branches.push([toTuple(p0), toTuple(p1), toTuple(p2)]);
      dendrite_tips.push(toTuple(p2));

      // Add secondary sub-fork on alternating dendrites for organic tree appearance
      if (b % 2 === 0) {
        const subDir = dir
          .clone()
          .add(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.85))
          .normalize();
        const subTip = p1.clone().addScaledVector(subDir, (0.36 + rng() * 0.24) * scale);
        dendrite_branches.push([toTuple(p1), toTuple(subTip)]);
        dendrite_tips.push(toTuple(subTip));
      }
    }

    // Default primary axon direction (pointing away from main dendritic crown)
    const axonDir = new THREE.Vector3(0.4 + (rng() - 0.5) * 1.2, -0.35 + (rng() - 0.5) * 0.8, (rng() - 0.5) * 1.2)
      .normalize()
      .applyEuler(rotEuler);
    const axonLen = (1.6 + rng() * 1.4) * scale;
    const ax1 = somaPos.clone().addScaledVector(axonDir, axonLen * 0.45).add(
      new THREE.Vector3((rng() - 0.5) * 0.35, (rng() - 0.5) * 0.35, (rng() - 0.5) * 0.35)
    );
    const ax2 = somaPos.clone().addScaledVector(axonDir, axonLen);

    nodes.push({
      id: `${regionId}-n-${i + 1}`,
      index: i,
      label: `Neuron ${i + 1}`,
      role,
      position: toTuple(somaPos),
      baseline_input_na: 0.0,
      orientation,
      scale: Number(scale.toFixed(3)),
      has_myelin: role !== 'inhibitory' && rng() > 0.3,
      dendrite_branches,
      dendrite_tips,
      axon_points: [toTuple(somaPos), toTuple(ax1), toTuple(ax2)],
    });
  }

  // Connect each neuron's axon physically to 1–3 nearby neighbors' dendrite tips
  // to form multi-hop cascading neural pathways through the 3D tissue.
  const edges: BiologicalSynapseEdge[] = [];
  const edgePairSet = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const src = nodes[i];
    const srcPos = new THREE.Vector3(...src.position);

    // Find 6 nearest neighbors within local biological arbor range
    const candidates: { idx: number; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dstPos = new THREE.Vector3(...nodes[j].position);
      const dist = srcPos.distanceTo(dstPos);
      if (dist >= 1.4 && dist <= 5.8) {
        candidates.push({ idx: j, dist });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);

    const outDegree = src.role === 'output' ? 1 : 2 + (rng() > 0.55 ? 1 : 0);
    let added = 0;

    for (let c = 0; c < Math.min(candidates.length, 6) && added < outDegree; c++) {
      const targetIdx = candidates[c].idx;
      const pairKey = `${i}->${targetIdx}`;
      if (edgePairSet.has(pairKey)) continue;
      edgePairSet.add(pairKey);

      const dst = nodes[targetIdx];
      // Pick closest dendrite tip on target neuron for physical synaptic docking
      let bestTip = dst.dendrite_tips[0];
      let bestTipDist = Infinity;
      for (const tip of dst.dendrite_tips) {
        const d = srcPos.distanceTo(new THREE.Vector3(...tip));
        if (d < bestTipDist) {
          bestTipDist = d;
          bestTip = tip;
        }
      }

      const startVec = srcPos.clone();
      const tipVec = new THREE.Vector3(...bestTip);
      const dirToTip = tipVec.clone().sub(startVec);
      const dist = dirToTip.length() || 1;
      const unitDir = dirToTip.clone().normalize();

      // Presynaptic terminal stops short of the postsynaptic dendrite tip to show a clear synaptic cleft
      const terminalVec = tipVec.clone().addScaledVector(unitDir, -0.26);
      const synapseVec = tipVec.clone().addScaledVector(unitDir, -0.13);

      // Build organic curving axon control points
      const ortho = new THREE.Vector3(-unitDir.z, 0.35 + (rng() - 0.5) * 0.5, unitDir.x).normalize();
      const bendAmp = Math.min(0.85, dist * 0.22) * (rng() > 0.5 ? 1 : -1);
      const mid1 = startVec
        .clone()
        .lerp(terminalVec, 0.34)
        .addScaledVector(ortho, bendAmp)
        .add(new THREE.Vector3(0, (rng() - 0.5) * 0.35, 0));
      const mid2 = startVec
        .clone()
        .lerp(terminalVec, 0.7)
        .addScaledVector(ortho, -bendAmp * 0.45);

      // Update first outgoing edge as primary axon direction reference for the source neuron
      if (added === 0) {
        src.axon_points = [toTuple(startVec), toTuple(mid1), toTuple(mid2), toTuple(terminalVec)];
      }

      const isInhibitory = src.role === 'inhibitory';
      // Weight calibrated so a spiking presynaptic neuron reliably drives connected excitatory targets
      const weight = isInhibitory
        ? Number((-2.2 - rng() * 1.1).toFixed(2))
        : Number((3.4 + rng() * 1.2).toFixed(2));
      const delayMs = Number((1.6 + dist * 0.42).toFixed(2));

      edges.push({
        id: `${regionId}-s-${edges.length + 1}`,
        source: src.id,
        target: dst.id,
        weight,
        delay_ms: delayMs,
        enabled: true,
        synapse_type: isInhibitory ? 'inhibitory' : 'excitatory',
        curve_points: [toTuple(startVec), toTuple(mid1), toTuple(mid2), toTuple(terminalVec)],
        terminal_position: toTuple(terminalVec),
        synapse_position: toTuple(synapseVec),
        target_dendrite_tip: bestTip,
      });

      added++;
    }
  }

  return {
    region_id: regionId,
    region_name: REGION_NAMES[regionId],
    is_illustrative_model: true,
    model_note: `Illustrative ${nodes.length}-neuron 3D tissue model (procedurally generated microcircuit, not a human connectome).`,
    nodes,
    edges,
    graph_summary: {
      node_count: nodes.length,
      active_edge_count: edges.length,
      total_defined_edges: edges.length,
      density: Number((edges.length / Math.max(1, nodes.length * (nodes.length - 1))).toFixed(4)),
      recurrent_components: 1,
      is_dag: false,
    },
  };
}
