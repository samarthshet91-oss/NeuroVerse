import { useEffect, useMemo, useRef } from 'react';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SignalAnimator } from '@/src/simulation/SignalAnimator';
import { useExplorationStore } from '@/src/store/explorationStore';
import type {
  BiologicalNeuronNode,
  BiologicalSynapseEdge,
  NeuronAnatomyPartId,
} from '@/src/types/neuroverse';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

function buildNormalizedTube(
  points: [number, number, number][],
  radius: number,
  tubularSegments: number,
  radialSegments: number
): THREE.BufferGeometry {
  const vecs = points.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(vecs);
  const raw = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const nonIndexed = raw.index ? raw.toNonIndexed() : raw;
  if (raw !== nonIndexed) raw.dispose();
  nonIndexed.deleteAttribute('uv');
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

/** A lightweight swept tube with a radius that narrows from base to tip. Used only for the focused cell. */
function buildTaperedTube(
  points: [number, number, number][],
  baseRadius: number,
  tipRadius: number,
  tubularSegments: number,
  radialSegments: number
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, t * t * (3 - 2 * t));
    const center = curve.getPointAt(t);
    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const normal = frames.normals[i]
        .clone()
        .multiplyScalar(Math.cos(theta))
        .addScaledVector(frames.binormals[i], Math.sin(theta));
      positions.push(
        center.x + normal.x * radius,
        center.y + normal.y * radius,
        center.z + normal.z * radius
      );
      normals.push(normal.x, normal.y, normal.z);
    }
  }

  const ring = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function buildOrganicSomaGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(0.22, 4);
  const pos = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const unit = vertex.clone().normalize();
    const ripple =
      Math.sin(unit.x * 5.7 + unit.z * 2.1) * 0.026 +
      Math.cos(unit.y * 7.3 - unit.x * 1.8) * 0.017 +
      Math.sin((unit.x + unit.y) * 10.0) * 0.009;
    const asymmetry = 1 + unit.x * 0.045 - unit.y * 0.025;
    vertex.multiplyScalar((1 + ripple) * asymmetry);
    vertex.x *= 1.1;
    vertex.y *= 0.94;
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function anatomyLabelColor(part: NeuronAnatomyPartId | 'nucleus' | 'spine'): string {
  if (part === 'myelin' || part === 'spine') return '#5eead4';
  if (part === 'terminals') return '#fbbf24';
  if (part === 'synapse') return '#fcd34d';
  if (part === 'axon') return '#a5b4fc';
  if (part === 'nucleus') return '#c4b5fd';
  return '#67e8f9';
}

function AnatomyCallout({
  label,
  anchor,
  target,
  tone,
}: {
  label: string;
  anchor: [number, number, number];
  target: [number, number, number];
  tone: string;
}) {
  return (
    <group>
      <Line points={[target, anchor]} color={tone} transparent opacity={0.5} lineWidth={0.75} />
      <Html position={anchor} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div className="rounded border bg-slate-950/88 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-lg" style={{ borderColor: `${tone}99`, color: tone }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

export function DenseNeuralEnvironment() {
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const explorationState = useExplorationStore((s) => s.explorationState);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const hoveredNeuronId = useExplorationStore((s) => s.hoveredNeuronId);
  const selectedEdgeId = useExplorationStore((s) => s.selectedEdgeId);
  const selectedAnatomyPart = useExplorationStore((s) => s.selectedAnatomyPart);
  const networkSimResult = useExplorationStore((s) => s.networkSimResult);
  const lifParams = useExplorationStore((s) => s.lifParams);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const showLabels = useExplorationStore((s) => s.showLabels);

  const selectNeuron = useExplorationStore((s) => s.selectNeuron);
  const setHoveredNeuron = useExplorationStore((s) => s.setHoveredNeuron);
  const selectEdge = useExplorationStore((s) => s.selectEdge);
  const selectAnatomyPart = useExplorationStore((s) => s.selectAnatomyPart);

  const somaInstRef = useRef<THREE.InstancedMesh>(null);
  const nucleusInstRef = useRef<THREE.InstancedMesh>(null);
  const myelinInstRef = useRef<THREE.InstancedMesh>(null);
  const synapseInstRef = useRef<THREE.InstancedMesh>(null);

  const isNeuronFocus = explorationState === 'NEURON_VIEW';

  // Build reusable biological primitives & merged background arbors (keeps draw calls < 15 for 140+ neurons)
  const {
    somaGeo,
    nucleusGeo,
    myelinGeo,
    synapseGeo,
    mergedDendritesGeo,
    mergedAxonsGeo,
    edgeCurves,
    synapsePositions,
    myelinTransforms,
  } = useMemo(() => {
    const empty = {
      somaGeo: new THREE.IcosahedronGeometry(0.18, 1),
      nucleusGeo: new THREE.SphereGeometry(0.075, 8, 8),
      myelinGeo: new THREE.CapsuleGeometry(0.045, 0.22, 4, 8),
      synapseGeo: new THREE.SphereGeometry(0.052, 8, 8),
      mergedDendritesGeo: null as THREE.BufferGeometry | null,
      mergedAxonsGeo: null as THREE.BufferGeometry | null,
      edgeCurves: new Map<string, THREE.CatmullRomCurve3>(),
      synapsePositions: new Map<string, THREE.Vector3>(),
      myelinTransforms: [] as { pos: THREE.Vector3; quat: THREE.Quaternion }[],
    };

    if (!activeNetwork) return empty;

    // Slight organic soma asymmetry
    const somaPos = empty.somaGeo.attributes.position;
    const sv = new THREE.Vector3();
    for (let i = 0; i < somaPos.count; i++) {
      sv.fromBufferAttribute(somaPos, i);
      sv.x *= 1.12;
      sv.y *= 0.94 + Math.sin(sv.x * 8) * 0.06;
      sv.z *= 0.96;
      somaPos.setXYZ(i, sv.x, sv.y, sv.z);
    }
    empty.somaGeo.computeVertexNormals();

    const dendriteParts: THREE.BufferGeometry[] = [];
    const axonParts: THREE.BufferGeometry[] = [];

    const tubSegD = reducedQuality ? 4 : 6;
    const radSegD = reducedQuality ? 4 : 5;
    const tubSegA = reducedQuality ? 8 : 12;
    const radSegA = reducedQuality ? 4 : 5;

    for (const node of activeNetwork.nodes) {
      for (const branch of node.dendrite_branches) {
        if (branch.length >= 2) {
          dendriteParts.push(
            buildNormalizedTube(branch, 0.022 * node.scale, tubSegD, radSegD)
          );
        }
      }
    }

    for (const edge of activeNetwork.edges) {
      const vecs = edge.curve_points.map((p) => new THREE.Vector3(...p));
      const curve = new THREE.CatmullRomCurve3(vecs);
      empty.edgeCurves.set(edge.id, curve);
      empty.synapsePositions.set(edge.id, new THREE.Vector3(...edge.synapse_position));

      axonParts.push(buildNormalizedTube(edge.curve_points, 0.016, tubSegA, radSegA));

      // Place 2 myelin segments along myelinated excitatory axons
      const srcNode = activeNetwork.nodes.find((n) => n.id === edge.source);
      if (srcNode?.has_myelin && edge.enabled) {
        for (const t of [0.32, 0.62]) {
          const pos = curve.getPoint(t);
          const tangent = curve.getTangent(t).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(_up, tangent);
          empty.myelinTransforms.push({ pos, quat });
        }
      }
    }

    if (dendriteParts.length > 0) {
      empty.mergedDendritesGeo = mergeGeometries(dendriteParts, false);
      dendriteParts.forEach((g) => g.dispose());
    }
    if (axonParts.length > 0) {
      empty.mergedAxonsGeo = mergeGeometries(axonParts, false);
      axonParts.forEach((g) => g.dispose());
    }

    return empty;
  }, [activeNetwork, reducedQuality]);

  useEffect(() => {
    return () => {
      somaGeo.dispose();
      nucleusGeo.dispose();
      myelinGeo.dispose();
      synapseGeo.dispose();
      mergedDendritesGeo?.dispose();
      mergedAxonsGeo?.dispose();
      document.body.style.cursor = 'auto';
    };
  }, [
    somaGeo,
    nucleusGeo,
    myelinGeo,
    synapseGeo,
    mergedDendritesGeo,
    mergedAxonsGeo,
  ]);

  // Populate static instanced transforms for somas, nuclei, myelin, and synapses
  useEffect(() => {
    if (!activeNetwork) return;

    const somaInst = somaInstRef.current;
    const nucInst = nucleusInstRef.current;
    if (somaInst && nucInst) {
      activeNetwork.nodes.forEach((node, idx) => {
        _dummy.position.set(...node.position);
        _dummy.rotation.set(...node.orientation);
        _dummy.scale.setScalar(node.scale);
        _dummy.updateMatrix();
        somaInst.setMatrixAt(idx, _dummy.matrix);
        nucInst.setMatrixAt(idx, _dummy.matrix);

        const baseHex =
          node.role === 'inhibitory'
            ? '#7c3aed'
            : node.role === 'input'
              ? '#0891b2'
              : '#0284c7';
        _color.set(baseHex);
        somaInst.setColorAt(idx, _color);
        nucInst.setColorAt(idx, _color.clone().lerp(new THREE.Color('#e0f2fe'), 0.55));
      });
      somaInst.count = activeNetwork.nodes.length;
      somaInst.instanceMatrix.needsUpdate = true;
      if (somaInst.instanceColor) somaInst.instanceColor.needsUpdate = true;
      somaInst.computeBoundingSphere();

      nucInst.count = activeNetwork.nodes.length;
      nucInst.instanceMatrix.needsUpdate = true;
      if (nucInst.instanceColor) nucInst.instanceColor.needsUpdate = true;
      nucInst.computeBoundingSphere();
    }

    const myInst = myelinInstRef.current;
    if (myInst) {
      myelinTransforms.forEach((m, idx) => {
        _dummy.position.copy(m.pos);
        _dummy.quaternion.copy(m.quat);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        myInst.setMatrixAt(idx, _dummy.matrix);
      });
      myInst.count = myelinTransforms.length;
      myInst.instanceMatrix.needsUpdate = true;
      myInst.computeBoundingSphere();
    }

    const synInst = synapseInstRef.current;
    if (synInst) {
      activeNetwork.edges.forEach((edge, idx) => {
        _dummy.position.set(...edge.synapse_position);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(edge.enabled ? 1 : 0.35);
        _dummy.updateMatrix();
        synInst.setMatrixAt(idx, _dummy.matrix);
        _color.set(edge.synapse_type === 'inhibitory' ? '#c084fc' : '#38bdf8');
        synInst.setColorAt(idx, _color);
      });
      synInst.count = activeNetwork.edges.length;
      synInst.instanceMatrix.needsUpdate = true;
      if (synInst.instanceColor) synInst.instanceColor.needsUpdate = true;
      synInst.computeBoundingSphere();
    }
  }, [activeNetwork, myelinTransforms]);

  // Real-time soma depolarization/spike color response driven strictly by LIF simulation results
  useFrame(() => {
    if (!activeNetwork || !somaInstRef.current) return;
    const simRes = networkSimResult;
    if (!simRes) return;

    const tNow = useExplorationStore.getState().playbackTimeMs;
    const somaInst = somaInstRef.current;

    for (let i = 0; i < activeNetwork.nodes.length; i++) {
      const node = activeNetwork.nodes[i];
      const metric = simRes.node_metrics[i];
      const recentlySpiked = metric?.spike_times_ms.some(
        (st) => tNow >= st && tNow <= st + 3.2
      );

      if (recentlySpiked) {
        _color.set('#fde047');
      } else if (node.id === selectedNeuronId) {
        _color.set('#22d3ee');
      } else if (node.role === 'inhibitory') {
        _color.set('#7c3aed');
      } else {
        _color.set('#0284c7');
      }
      somaInst.setColorAt(i, _color);
    }
    if (somaInst.instanceColor) somaInst.instanceColor.needsUpdate = true;
  });

  // Compute selected neuron + connected incoming/outgoing edges for crisp foreground highlighting
  const {
    selectedNeuron,
    connectedNodeSet,
    selectedSomaGeo,
    selectedDendriteGeos,
    selectedTertiaryGeos,
    selectedEdgeDetails,
    selectedMyelinSegs,
    closeupLabels,
  } = useMemo(() => {
    const emptySel = {
      selectedNeuron: null as BiologicalNeuronNode | null,
      connectedNodeSet: new Set<string>(),
      selectedSomaGeo: null as THREE.BufferGeometry | null,
      selectedDendriteGeos: [] as THREE.BufferGeometry[],
      selectedTertiaryGeos: [] as THREE.BufferGeometry[],
      selectedEdgeDetails: [] as {
        edge: BiologicalSynapseEdge;
        geo: THREE.BufferGeometry;
        isOutgoing: boolean;
        cleftQuat: THREE.Quaternion;
        spinePos: THREE.Vector3;
        chevrons: { pos: THREE.Vector3; quat: THREE.Quaternion }[];
      }[],
      selectedMyelinSegs: [] as { pos: THREE.Vector3; quat: THREE.Quaternion }[],
      closeupLabels: {
        soma: null as [number, number, number] | null,
        nucleus: null as [number, number, number] | null,
        dendrites: null as [number, number, number] | null,
        axon: null as [number, number, number] | null,
        myelin: null as [number, number, number] | null,
        terminal: null as [number, number, number] | null,
        synapse: null as [number, number, number] | null,
        spine: null as [number, number, number] | null,
      },
    };

    if (!activeNetwork || !selectedNeuronId) return emptySel;
    const neuron = activeNetwork.nodes.find((n) => n.id === selectedNeuronId) ?? null;
    if (!neuron) return emptySel;

    const connEdges = activeNetwork.edges.filter(
      (e) => e.source === neuron.id || e.target === neuron.id
    );
    const connNodes = new Set<string>();
    connEdges.forEach((e) => {
      connNodes.add(e.source);
      connNodes.add(e.target);
    });

    const branchSegments = reducedQuality ? 6 : 12;
    const branchRadial = reducedQuality ? 5 : 8;
    const dendGeos = neuron.dendrite_branches
      .filter((b) => b.length >= 2)
      .map((b, branchIndex) => {
        const isPrimary = b.length >= 3;
        const base = (isPrimary ? 0.052 : 0.035) * neuron.scale;
        const tip = (isPrimary ? 0.015 : 0.011) * neuron.scale;
        return buildTaperedTube(b, base, tip, branchSegments, branchRadial);
      });

    // A few deterministic tertiary twigs enrich only the focused morphology. They do not change graph edges.
    const tertiaryGeos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < neuron.dendrite_branches.length; i++) {
      const branch = neuron.dendrite_branches[i];
      if (branch.length < 3 || i % 2 !== 0) continue;
      const root = new THREE.Vector3(...branch[1]);
      const tip = new THREE.Vector3(...branch[branch.length - 1]);
      const direction = tip.clone().sub(root).normalize();
      const side = new THREE.Vector3(-direction.z, 0.34 + (i % 3) * 0.1, direction.x)
        .normalize()
        .multiplyScalar((i % 4 === 0 ? 0.38 : -0.31) * neuron.scale);
      const twigTip = root.clone().lerp(tip, 0.64).add(side);
      tertiaryGeos.push(
        buildTaperedTube(
          [
            [root.x, root.y, root.z],
            [root.x + side.x * 0.38, root.y + side.y * 0.38, root.z + side.z * 0.38],
            [twigTip.x, twigTip.y, twigTip.z],
          ],
          0.018 * neuron.scale,
          0.006 * neuron.scale,
          reducedQuality ? 4 : 7,
          reducedQuality ? 4 : 6
        )
      );
    }

    const edgeDetails = connEdges.map((edge) => {
      const isOutgoing = edge.source === neuron.id;
      const geo = buildTaperedTube(
        edge.curve_points,
        isOutgoing ? 0.041 : 0.032,
        isOutgoing ? 0.017 : 0.014,
        reducedQuality ? 12 : 22,
        reducedQuality ? 6 : 9
      );
      const termVec = new THREE.Vector3(...edge.terminal_position);
      const tipVec = new THREE.Vector3(...edge.target_dendrite_tip);
      const synAxis = tipVec.clone().sub(termVec);
      if (synAxis.lengthSq() < 1e-6) synAxis.set(1, 0, 0);
      synAxis.normalize();
      const cleftQuat = new THREE.Quaternion().setFromUnitVectors(_up, synAxis);

      const chevrons: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
      const curve = edgeCurves.get(edge.id);
      if (curve && isOutgoing && edge.enabled) {
        for (const t of [0.38, 0.78]) {
          const pos = curve.getPoint(t);
          const tangent = curve.getTangent(t).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(_up, tangent);
          chevrons.push({ pos, quat });
        }
      }

      return {
        edge,
        geo,
        isOutgoing,
        cleftQuat,
        spinePos: tipVec,
        chevrons,
      };
    });

    const myelinSegs: { pos: THREE.Vector3; quat: THREE.Quaternion }[] = [];
    if (neuron.has_myelin) {
      for (const edge of connEdges) {
        if (edge.source !== neuron.id || !edge.enabled) continue;
        const curve = edgeCurves.get(edge.id);
        if (!curve) continue;
        // Uneven deterministic intervals make the sheath read as biological, while preserving the axon path.
        for (const t of [0.19, 0.43, 0.69]) {
          const pos = curve.getPoint(t);
          const tangent = curve.getTangent(t).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(_up, tangent);
          myelinSegs.push({ pos, quat });
        }
      }
    }

    // Compute well-separated 3D label anchors so labels never pile on top of one another
    const placed: THREE.Vector3[] = [];
    const pickClearAnchor = (candidate: THREE.Vector3, fallbackOffset: THREE.Vector3): [number, number, number] => {
      const p = candidate.clone();
      for (let attempt = 0; attempt < 3; attempt++) {
        const tooClose = placed.some((other) => other.distanceTo(p) < 0.78);
        if (!tooClose) break;
        p.add(fallbackOffset);
      }
      placed.push(p.clone());
      return [Number(p.x.toFixed(3)), Number(p.y.toFixed(3)), Number(p.z.toFixed(3))];
    };

    const somaVec = new THREE.Vector3(...neuron.position);
    const somaLabel = pickClearAnchor(
      somaVec.clone().add(new THREE.Vector3(0, 0.48, 0)),
      new THREE.Vector3(0, 0.25, 0)
    );
    const nucleusLabel = pickClearAnchor(
      somaVec.clone().add(new THREE.Vector3(0.2, -0.15, 0.2)),
      new THREE.Vector3(0.22, -0.2, 0)
    );

    const primaryOut = connEdges.find((e) => e.source === neuron.id) ?? null;
    let dendLabel: [number, number, number] | null = null;
    if (neuron.dendrite_tips.length > 0) {
      // Pick the dendrite tip furthest from the primary axon terminal so labels stay spread out
      let bestTip = new THREE.Vector3(...neuron.dendrite_tips[0]);
      if (primaryOut) {
        const term = new THREE.Vector3(...primaryOut.terminal_position);
        let maxD = -1;
        for (const t of neuron.dendrite_tips) {
          const tv = new THREE.Vector3(...t);
          const d = tv.distanceTo(term);
          if (d > maxD) {
            maxD = d;
            bestTip = tv;
          }
        }
      }
      const outward = bestTip.clone().sub(somaVec).normalize().multiplyScalar(0.24);
      dendLabel = pickClearAnchor(
        bestTip.clone().add(outward).add(new THREE.Vector3(0, 0.14, 0)),
        new THREE.Vector3(-0.32, 0.2, 0)
      );
    }

    let myelinLabel: [number, number, number] | null = null;
    let axonLabel: [number, number, number] | null = null;
    let terminalLabel: [number, number, number] | null = null;
    let synapseLabel: [number, number, number] | null = null;
    let spineLabel: [number, number, number] | null = null;

    if (primaryOut) {
      const outCurve = edgeCurves.get(primaryOut.id);
      if (neuron.has_myelin && outCurve) {
        myelinLabel = pickClearAnchor(
          outCurve.getPoint(0.45).add(new THREE.Vector3(0, 0.34, 0)),
          new THREE.Vector3(0, 0.28, 0.2)
        );
      }
      if (outCurve) {
        axonLabel = pickClearAnchor(
          outCurve.getPoint(0.23).add(new THREE.Vector3(0, -0.34, 0)),
          new THREE.Vector3(0.28, -0.2, 0)
        );
      }
      terminalLabel = pickClearAnchor(
        new THREE.Vector3(...primaryOut.terminal_position).add(new THREE.Vector3(0, 0.34, 0)),
        new THREE.Vector3(0.25, 0.28, 0)
      );
      synapseLabel = pickClearAnchor(
        new THREE.Vector3(...primaryOut.target_dendrite_tip).add(new THREE.Vector3(0, -0.34, 0)),
        new THREE.Vector3(0.25, -0.28, 0)
      );
      spineLabel = pickClearAnchor(
        new THREE.Vector3(...primaryOut.target_dendrite_tip).add(new THREE.Vector3(0.26, 0.1, 0)),
        new THREE.Vector3(0.28, 0.14, 0)
      );
    }

    return {
      selectedNeuron: neuron,
      connectedNodeSet: connNodes,
      selectedSomaGeo: buildOrganicSomaGeometry(),
      selectedDendriteGeos: dendGeos,
      selectedTertiaryGeos: tertiaryGeos,
      selectedEdgeDetails: edgeDetails,
      selectedMyelinSegs: myelinSegs,
      closeupLabels: {
        soma: somaLabel,
        nucleus: nucleusLabel,
        dendrites: dendLabel,
        axon: axonLabel,
        myelin: myelinLabel,
        terminal: terminalLabel,
        synapse: synapseLabel,
        spine: spineLabel,
      },
    };
  }, [activeNetwork, selectedNeuronId, edgeCurves, reducedQuality]);

  useEffect(() => {
    return () => {
      selectedSomaGeo?.dispose();
      selectedDendriteGeos.forEach((g) => g.dispose());
      selectedTertiaryGeos.forEach((g) => g.dispose());
      selectedEdgeDetails.forEach((e) => e.geo.dispose());
    };
  }, [selectedSomaGeo, selectedDendriteGeos, selectedTertiaryGeos, selectedEdgeDetails]);

  if (!activeNetwork) return null;

  const hoverNeuron = hoveredNeuronId
    ? activeNetwork.nodes.find((n) => n.id === hoveredNeuronId) ?? null
    : null;

  const partClickProps = (part: NeuronAnatomyPartId) => ({
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
    },
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      selectAnatomyPart(part);
    },
  });

  const tissueOpacity = isNeuronFocus ? 0.22 : 0.48;

  return (
    <group>
      {/* 1. Background biological neural tissue (1 merged mesh for dendrites, 1 for axons) */}
      {mergedDendritesGeo && (
        <mesh geometry={mergedDendritesGeo}>
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#0369a1"
            emissiveIntensity={0.25}
            roughness={0.45}
            transparent
            opacity={tissueOpacity}
          />
        </mesh>
      )}

      {mergedAxonsGeo && (
        <mesh geometry={mergedAxonsGeo}>
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#1e3a8a"
            emissiveIntensity={0.2}
            roughness={0.45}
            transparent
            opacity={isNeuronFocus ? 0.16 : 0.34}
          />
        </mesh>
      )}

      {/* 2. Instanced Somas (clickable across all 70–140 neurons) */}
      <instancedMesh
        ref={somaInstRef}
        args={[somaGeo, undefined, Math.max(1, activeNetwork.nodes.length)]}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (typeof e.instanceId === 'number' && activeNetwork.nodes[e.instanceId]) {
            setHoveredNeuron(activeNetwork.nodes[e.instanceId].id);
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          setHoveredNeuron(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (typeof e.instanceId === 'number' && activeNetwork.nodes[e.instanceId]) {
            selectNeuron(activeNetwork.nodes[e.instanceId].id);
          }
        }}
      >
        <meshStandardMaterial
          roughness={0.32}
          metalness={0.12}
          transparent
          opacity={isNeuronFocus ? 0.55 : 0.9}
        />
      </instancedMesh>

      {/* Instanced Nuclei */}
      <instancedMesh
        ref={nucleusInstRef}
        args={[nucleusGeo, undefined, Math.max(1, activeNetwork.nodes.length)]}
      >
        <meshBasicMaterial transparent opacity={isNeuronFocus ? 0.5 : 0.85} />
      </instancedMesh>

      {/* Instanced Myelin Segments */}
      {myelinTransforms.length > 0 && (
        <instancedMesh
          ref={myelinInstRef}
          args={[myelinGeo, undefined, myelinTransforms.length]}
        >
          <meshStandardMaterial
            color="#14b8a6"
            emissive="#0f766e"
            emissiveIntensity={0.22}
            roughness={0.28}
            transparent
            opacity={isNeuronFocus ? 0.28 : 0.62}
          />
        </instancedMesh>
      )}

      {/* Instanced Synapses across tissue */}
      {activeNetwork.edges.length > 0 && (
        <instancedMesh
          ref={synapseInstRef}
          args={[synapseGeo, undefined, activeNetwork.edges.length]}
        >
          <meshBasicMaterial transparent opacity={isNeuronFocus ? 0.25 : 0.65} />
        </instancedMesh>
      )}

      {/* 3. Selected Biological Neuron High-Detail Highlight + Connected Pathways */}
      {selectedNeuron && (
        <group>
          {/* Local, low-cost key and rim lights give the focused cell its own microscopy-like identity. */}
          <pointLight
            position={[selectedNeuron.position[0] - 1.4, selectedNeuron.position[1] + 1.8, selectedNeuron.position[2] + 1.6]}
            color="#67e8f9"
            intensity={1.15}
            distance={5.5}
            decay={2}
          />
          <pointLight
            position={[selectedNeuron.position[0] + 1.3, selectedNeuron.position[1] - 0.5, selectedNeuron.position[2] - 1.1]}
            color="#a78bfa"
            intensity={0.45}
            distance={4.2}
            decay={2}
          />
          {/* Highlighted Soma */}
          <group position={selectedNeuron.position} {...partClickProps('soma')}>
            <mesh geometry={selectedSomaGeo ?? undefined} scale={selectedNeuron.scale * 1.18}>
              <meshPhysicalMaterial
                color={selectedAnatomyPart === 'soma' ? '#65d7ed' : '#238db2'}
                emissive="#0f5270"
                emissiveIntensity={selectedAnatomyPart === 'soma' ? 0.48 : 0.2}
                roughness={0.46}
                metalness={0.02}
                transparent
                opacity={0.96}
                clearcoat={0.16}
                clearcoatRoughness={0.7}
              />
            </mesh>
            <mesh scale={selectedNeuron.scale * 0.68}>
              <sphereGeometry args={[0.13, reducedQuality ? 10 : 18, reducedQuality ? 10 : 18]} />
              <meshPhysicalMaterial color="#7561a8" emissive="#5b4a89" emissiveIntensity={0.42} roughness={0.55} metalness={0} />
            </mesh>
            <mesh position={[0.035, 0.02, 0.075]} scale={selectedNeuron.scale * 0.35}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshBasicMaterial color="#ddd6fe" transparent opacity={0.36} depthWrite={false} />
            </mesh>
          </group>

          {/* Highlighted Dendrites */}
          <group {...partClickProps('dendrites')}>
            {selectedDendriteGeos.map((geo, idx) => (
              <mesh key={idx} geometry={geo}>
                <meshStandardMaterial
                  color={selectedAnatomyPart === 'dendrites' ? '#67e8f9' : '#22d3ee'}
                  emissive="#22d3ee"
                  emissiveIntensity={selectedAnatomyPart === 'dendrites' ? 1.1 : 0.6}
                  roughness={0.48}
                  metalness={0.02}
                />
              </mesh>
            ))}
            {selectedTertiaryGeos.map((geo, idx) => (
              <mesh key={`twig-${idx}`} geometry={geo}>
                <meshStandardMaterial color="#2aa4c5" emissive="#0c5673" emissiveIntensity={0.22} roughness={0.56} metalness={0} />
              </mesh>
            ))}
          </group>

          {/* Highlighted Myelin Sheaths on outgoing axons */}
          <group {...partClickProps('myelin')}>
            {selectedMyelinSegs.map((seg, idx) => (
              <group key={idx}>
                <mesh position={seg.pos} quaternion={seg.quat}>
                  <capsuleGeometry args={[0.068, 0.28, 5, 10]} />
                  <meshPhysicalMaterial
                    color={selectedAnatomyPart === 'myelin' ? '#5eead4' : '#2dd4bf'}
                    emissive="#14b8a6"
                    emissiveIntensity={selectedAnatomyPart === 'myelin' ? 0.9 : 0.4}
                    roughness={0.22}
                    transparent
                    opacity={0.88}
                  />
                </mesh>
                <mesh position={seg.pos} quaternion={seg.quat} scale={[1.15, 1, 1.15]}>
                  <torusGeometry args={[0.073, 0.007, 6, 10]} />
                  <meshBasicMaterial color="#073b3b" transparent opacity={0.75} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Connected Axons, Directional Chevrons, Presynaptic Terminals, Synaptic Clefts & Postsynaptic Spines */}
          {selectedEdgeDetails.map(({ edge, geo, isOutgoing, cleftQuat, spinePos, chevrons }) => {
            const isSelectedEdge = selectedEdgeId === edge.id;
            const baseColor = !edge.enabled
              ? '#475569'
              : edge.synapse_type === 'inhibitory'
                ? '#c084fc'
                : isOutgoing
                  ? '#22d3ee'
                  : '#38bdf8';

            return (
              <group key={edge.id}>
                {/* Axon Pathway */}
                <mesh
                  geometry={geo}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEdge(edge.id);
                    selectAnatomyPart('axon');
                  }}
                >
                  <meshStandardMaterial
                    color={isSelectedEdge ? '#fde047' : baseColor}
                    emissive={isSelectedEdge ? '#fde047' : baseColor}
                    emissiveIntensity={isSelectedEdge ? 0.95 : isOutgoing ? 0.65 : 0.45}
                    roughness={0.28}
                    transparent
                    opacity={edge.enabled ? 0.92 : 0.25}
                  />
                </mesh>

                {/* Directional Signal-Flow Chevrons (Soma -> Axon -> Terminal) */}
                {chevrons.map((ch, cIdx) => (
                  <mesh key={cIdx} position={ch.pos} quaternion={ch.quat}>
                    <coneGeometry args={[0.052, 0.12, 8]} />
                    <meshStandardMaterial
                      color={edge.synapse_type === 'inhibitory' ? '#e879f9' : '#67e8f9'}
                      emissive={edge.synapse_type === 'inhibitory' ? '#c084fc' : '#22d3ee'}
                      emissiveIntensity={0.85}
                    />
                  </mesh>
                ))}

                {/* Presynaptic bouton, cleft and spine use graph-provided positions without shifting connectivity. */}
                <mesh
                  position={edge.terminal_position}
                  quaternion={cleftQuat}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEdge(edge.id);
                    selectAnatomyPart('terminals');
                  }}
                >
                  <sphereGeometry args={[0.081, reducedQuality ? 8 : 14, reducedQuality ? 8 : 14]} />
                  <meshPhysicalMaterial
                    color="#ca8a52"
                    emissive="#b45309"
                    emissiveIntensity={selectedAnatomyPart === 'terminals' ? 0.95 : 0.35}
                    roughness={0.5}
                    metalness={0}
                  />
                </mesh>

                <mesh position={edge.terminal_position} quaternion={cleftQuat} scale={[1.35, 0.72, 0.72]}>
                  <sphereGeometry args={[0.081, reducedQuality ? 8 : 14, reducedQuality ? 8 : 14]} />
                  <meshBasicMaterial color="#fcd34d" transparent opacity={0.2} depthWrite={false} />
                </mesh>

                {/* Visible Synaptic Cleft Ring (extracellular gap between pre & post membranes) */}
                <mesh
                  position={edge.synapse_position}
                  quaternion={cleftQuat}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEdge(edge.id);
                    selectAnatomyPart('synapse');
                  }}
                >
                  <torusGeometry args={[0.063, 0.009, 8, 16]} />
                  <meshStandardMaterial
                    color="#eab308"
                    emissive="#a16207"
                    emissiveIntensity={selectedAnatomyPart === 'synapse' ? 0.9 : 0.35}
                    transparent
                    opacity={edge.enabled ? 0.9 : 0.25}
                  />
                </mesh>

                {/* Postsynaptic neck + spine head make the receiving side legible at close range. */}
                <mesh
                  position={spinePos}
                  quaternion={cleftQuat}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEdge(edge.id);
                    selectAnatomyPart('dendrites');
                  }}
                >
                  <cylinderGeometry args={[0.027, 0.047, 0.11, 10]} />
                  <meshStandardMaterial
                    color="#4bb8ad"
                    emissive="#0f766e"
                    emissiveIntensity={selectedAnatomyPart === 'dendrites' ? 0.68 : 0.22}
                    roughness={0.48}
                  />
                </mesh>
                <mesh position={spinePos} quaternion={cleftQuat} scale={[1.35, 1, 1.35]}>
                  <sphereGeometry args={[0.052, 10, 10]} />
                  <meshStandardMaterial color="#6ee7d9" emissive="#0f766e" emissiveIntensity={0.28} roughness={0.48} />
                </mesh>
              </group>
            );
          })}

          {/* Highlight Connected Partner Neuron Somas */}
          {activeNetwork.nodes
            .filter((n) => n.id !== selectedNeuron.id && connectedNodeSet.has(n.id))
            .map((partner) => (
              <mesh
                key={partner.id}
                position={partner.position}
                scale={partner.scale * 1.08}
                onClick={(e) => {
                  e.stopPropagation();
                  selectNeuron(partner.id);
                }}
              >
                <icosahedronGeometry args={[0.21, 1]} />
                <meshStandardMaterial
                  color={partner.role === 'inhibitory' ? '#c084fc' : '#38bdf8'}
                  emissive={partner.role === 'inhibitory' ? '#a855f7' : '#0ea5e9'}
                  emissiveIntensity={0.65}
                  transparent
                  opacity={0.92}
                />
              </mesh>
            ))}

          {/* Non-overlapping Anatomy Labels when zoomed into a single neuron */}
          {isNeuronFocus && showLabels && (
            <>
              {closeupLabels.soma && (
                <AnatomyCallout label={`Soma · ${selectedNeuron.label}`} anchor={closeupLabels.soma} target={selectedNeuron.position} tone={anatomyLabelColor('soma')} />
              )}
              {closeupLabels.nucleus && (
                <AnatomyCallout label="Nucleus" anchor={closeupLabels.nucleus} target={[selectedNeuron.position[0] + 0.03, selectedNeuron.position[1] + 0.02, selectedNeuron.position[2] + 0.08]} tone={anatomyLabelColor('nucleus')} />
              )}
              {closeupLabels.dendrites && (
                <AnatomyCallout label="Dendritic arbor" anchor={closeupLabels.dendrites} target={selectedNeuron.dendrite_tips[0] ?? selectedNeuron.position} tone={anatomyLabelColor('dendrites')} />
              )}
              {closeupLabels.axon && selectedEdgeDetails.find((detail) => detail.isOutgoing) && (
                <AnatomyCallout label="Axon" anchor={closeupLabels.axon} target={selectedEdgeDetails.find((detail) => detail.isOutgoing)?.edge.curve_points[1] ?? selectedNeuron.position} tone={anatomyLabelColor('axon')} />
              )}
              {closeupLabels.myelin && (
                <AnatomyCallout label="Myelin sheath" anchor={closeupLabels.myelin} target={selectedMyelinSegs[1] ? [selectedMyelinSegs[1].pos.x, selectedMyelinSegs[1].pos.y, selectedMyelinSegs[1].pos.z] : selectedNeuron.position} tone={anatomyLabelColor('myelin')} />
              )}
              {closeupLabels.terminal && selectedEdgeDetails.find((detail) => detail.isOutgoing) && (
                <AnatomyCallout label="Axon terminal" anchor={closeupLabels.terminal} target={selectedEdgeDetails.find((detail) => detail.isOutgoing)?.edge.terminal_position ?? selectedNeuron.position} tone={anatomyLabelColor('terminals')} />
              )}
              {closeupLabels.synapse && selectedEdgeDetails.find((detail) => detail.isOutgoing) && (
                <AnatomyCallout label="Synaptic cleft" anchor={closeupLabels.synapse} target={selectedEdgeDetails.find((detail) => detail.isOutgoing)?.edge.synapse_position ?? selectedNeuron.position} tone={anatomyLabelColor('synapse')} />
              )}
              {closeupLabels.spine && selectedEdgeDetails.find((detail) => detail.isOutgoing) && (
                <AnatomyCallout label="Dendritic spine" anchor={closeupLabels.spine} target={selectedEdgeDetails.find((detail) => detail.isOutgoing)?.edge.target_dendrite_tip ?? selectedNeuron.position} tone={anatomyLabelColor('spine')} />
              )}
            </>
          )}
        </group>
      )}

      {/* Lightweight hover highlight & tooltip only for the currently hovered neuron */}
      {hoverNeuron && !isNeuronFocus && (
        <group position={hoverNeuron.position}>
          {hoverNeuron.id !== selectedNeuronId && (
            <mesh scale={hoverNeuron.scale * 1.45}>
              <sphereGeometry args={[0.21, 14, 14]} />
              <meshBasicMaterial
                color="#67e8f9"
                transparent
                opacity={0.22}
                depthWrite={false}
              />
            </mesh>
          )}
          {showLabels && (
            <Html
              position={[0, 0.38, 0]}
              center
              distanceFactor={9}
              style={{ pointerEvents: 'none' }}
            >
              <div className="rounded border border-cyan-400/50 bg-slate-950/90 px-2 py-0.5 text-[11px] font-medium text-cyan-100 whitespace-nowrap">
                {hoverNeuron.label} · {hoverNeuron.role}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Real Spike Propagation Animation driven strictly by LIF simulation results */}
      {networkSimResult && (
        <SignalAnimator
          edgeCurves={edgeCurves}
          synapsePositions={synapsePositions}
          spikeEvents={networkSimResult.spike_events}
          durationMs={lifParams.duration_ms}
        />
      )}
    </group>
  );
}
