import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
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
    selectedDendriteGeos,
    selectedEdgeDetails,
    selectedMyelinSegs,
    closeupLabels,
  } = useMemo(() => {
    const emptySel = {
      selectedNeuron: null as BiologicalNeuronNode | null,
      connectedNodeSet: new Set<string>(),
      selectedDendriteGeos: [] as THREE.BufferGeometry[],
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
        dendrites: null as [number, number, number] | null,
        myelin: null as [number, number, number] | null,
        terminal: null as [number, number, number] | null,
        synapse: null as [number, number, number] | null,
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

    const dendGeos = neuron.dendrite_branches
      .filter((b) => b.length >= 2)
      .map((b) => buildNormalizedTube(b, 0.036 * neuron.scale, 10, 7));

    const edgeDetails = connEdges.map((edge) => {
      const isOutgoing = edge.source === neuron.id;
      const geo = buildNormalizedTube(edge.curve_points, 0.032, 20, 8);
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
        for (const t of [0.24, 0.5, 0.72]) {
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
    let terminalLabel: [number, number, number] | null = null;
    let synapseLabel: [number, number, number] | null = null;

    if (primaryOut) {
      const outCurve = edgeCurves.get(primaryOut.id);
      if (neuron.has_myelin && outCurve) {
        myelinLabel = pickClearAnchor(
          outCurve.getPoint(0.45).add(new THREE.Vector3(0, 0.34, 0)),
          new THREE.Vector3(0, 0.28, 0.2)
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
    }

    return {
      selectedNeuron: neuron,
      connectedNodeSet: connNodes,
      selectedDendriteGeos: dendGeos,
      selectedEdgeDetails: edgeDetails,
      selectedMyelinSegs: myelinSegs,
      closeupLabels: {
        soma: somaLabel,
        dendrites: dendLabel,
        myelin: myelinLabel,
        terminal: terminalLabel,
        synapse: synapseLabel,
      },
    };
  }, [activeNetwork, selectedNeuronId, edgeCurves]);

  useEffect(() => {
    return () => {
      selectedDendriteGeos.forEach((g) => g.dispose());
      selectedEdgeDetails.forEach((e) => e.geo.dispose());
    };
  }, [selectedDendriteGeos, selectedEdgeDetails]);

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
          {/* Highlighted Soma */}
          <group position={selectedNeuron.position} {...partClickProps('soma')}>
            <mesh scale={selectedNeuron.scale * 1.15}>
              <icosahedronGeometry args={[0.22, 2]} />
              <meshPhysicalMaterial
                color={selectedAnatomyPart === 'soma' ? '#38bdf8' : '#22d3ee'}
                emissive="#22d3ee"
                emissiveIntensity={0.85}
                roughness={0.22}
                transparent
                opacity={0.92}
                clearcoat={0.5}
              />
            </mesh>
            <mesh scale={selectedNeuron.scale}>
              <sphereGeometry args={[0.095, 12, 12]} />
              <meshBasicMaterial color="#f0f9ff" />
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
                  roughness={0.3}
                />
              </mesh>
            ))}
          </group>

          {/* Highlighted Myelin Sheaths on outgoing axons */}
          <group {...partClickProps('myelin')}>
            {selectedMyelinSegs.map((seg, idx) => (
              <mesh key={idx} position={seg.pos} quaternion={seg.quat}>
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

                {/* Presynaptic Axon Terminal Bouton (stops before cleft) */}
                <mesh
                  position={edge.terminal_position}
                  quaternion={cleftQuat}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEdge(edge.id);
                    selectAnatomyPart('terminals');
                  }}
                >
                  <sphereGeometry args={[0.068, 10, 10]} />
                  <meshStandardMaterial
                    color="#a78bfa"
                    emissive="#8b5cf6"
                    emissiveIntensity={selectedAnatomyPart === 'terminals' ? 1.25 : 0.75}
                  />
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
                  <torusGeometry args={[0.068, 0.014, 8, 16]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#f59e0b"
                    emissiveIntensity={selectedAnatomyPart === 'synapse' ? 1.35 : 0.8}
                    transparent
                    opacity={edge.enabled ? 0.9 : 0.25}
                  />
                </mesh>

                {/* Postsynaptic Dendritic Spine Receptor Cap (receiving neuron side) */}
                <mesh
                  position={spinePos}
                  quaternion={cleftQuat}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectEdge(edge.id);
                    selectAnatomyPart('dendrites');
                  }}
                >
                  <cylinderGeometry args={[0.056, 0.032, 0.065, 10]} />
                  <meshStandardMaterial
                    color="#2dd4bf"
                    emissive="#14b8a6"
                    emissiveIntensity={selectedAnatomyPart === 'dendrites' ? 1.1 : 0.65}
                  />
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
                <Html
                  position={closeupLabels.soma}
                  center
                  distanceFactor={6}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="rounded border border-cyan-400/60 bg-slate-950/90 px-2 py-0.5 text-[11px] font-medium text-cyan-200 whitespace-nowrap">
                    Soma ({selectedNeuron.label})
                  </div>
                </Html>
              )}

              {closeupLabels.dendrites && (
                <Html
                  position={closeupLabels.dendrites}
                  center
                  distanceFactor={6}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="rounded border border-teal-400/50 bg-slate-950/85 px-1.5 py-0.5 text-[10px] text-teal-200 whitespace-nowrap">
                    Dendrites
                  </div>
                </Html>
              )}

              {closeupLabels.myelin && (
                <Html
                  position={closeupLabels.myelin}
                  center
                  distanceFactor={6}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="rounded border border-emerald-400/50 bg-slate-950/85 px-1.5 py-0.5 text-[10px] text-emerald-200 whitespace-nowrap">
                    Myelin Sheath
                  </div>
                </Html>
              )}

              {closeupLabels.terminal && (
                <Html
                  position={closeupLabels.terminal}
                  center
                  distanceFactor={6}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="rounded border border-violet-400/50 bg-slate-950/85 px-1.5 py-0.5 text-[10px] text-violet-200 whitespace-nowrap">
                    Presynaptic Terminal
                  </div>
                </Html>
              )}

              {closeupLabels.synapse && (
                <Html
                  position={closeupLabels.synapse}
                  center
                  distanceFactor={6}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="rounded border border-amber-400/60 bg-slate-950/85 px-1.5 py-0.5 text-[10px] text-amber-200 whitespace-nowrap">
                    Synaptic Cleft &amp; Spine
                  </div>
                </Html>
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
