import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { NeuronNode, SynapseEdge } from '@/src/types/neuroverse';

const ROLE_COLOR: Record<NeuronNode['role'], string> = {
  input: '#22d3ee',
  excitatory: '#38bdf8',
  inhibitory: '#a78bfa',
  output: '#2dd4bf',
};

function buildSynapseCurve(
  from: [number, number, number],
  to: [number, number, number],
  indexOffset: number
): THREE.CatmullRomCurve3 {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const mid = start.clone().lerp(end, 0.5);
  const perp = new THREE.Vector3(-(end.z - start.z), 0.35 + (indexOffset % 2) * 0.25, end.x - start.x)
    .normalize()
    .multiplyScalar(0.45);
  mid.add(perp);
  return new THREE.CatmullRomCurve3([start, mid, end]);
}

function buildBackgroundFilaments(reducedQuality: boolean): THREE.BufferGeometry[] {
  const count = reducedQuality ? 6 : 14;
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = 4.6 + (i % 3) * 0.7;
    const p1 = new THREE.Vector3(Math.cos(angle) * r, -1.8 + (i % 4) * 0.6, Math.sin(angle) * r);
    const p2 = new THREE.Vector3(
      Math.cos(angle + 0.5) * (r - 1.1),
      0.2 + ((i + 1) % 3) * 0.5,
      Math.sin(angle + 0.5) * (r - 1.1)
    );
    const p3 = new THREE.Vector3(
      Math.cos(angle + 1.0) * (r + 0.4),
      1.7 - (i % 3) * 0.4,
      Math.sin(angle + 1.0) * (r + 0.4)
    );
    const curve = new THREE.CatmullRomCurve3([p1, p2, p3]);
    geos.push(new THREE.TubeGeometry(curve, 16, 0.015, 6, false));
  }
  return geos;
}

export function RegionScene() {
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const hoveredNeuronId = useExplorationStore((s) => s.hoveredNeuronId);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const showLabels = useExplorationStore((s) => s.showLabels);
  const selectNeuron = useExplorationStore((s) => s.selectNeuron);
  const setHoveredNeuron = useExplorationStore((s) => s.setHoveredNeuron);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NeuronNode>();
    activeNetwork?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [activeNetwork]);

  const edgeGeometries = useMemo(() => {
    if (!activeNetwork) return [];
    return activeNetwork.edges
      .map((edge, idx) => {
        const src = nodeMap.get(edge.source);
        const dst = nodeMap.get(edge.target);
        if (!src || !dst) return null;
        const curve = buildSynapseCurve(src.position, dst.position, idx);
        const geo = new THREE.TubeGeometry(curve, reducedQuality ? 16 : 24, 0.032, 8, false);
        const tipPos = curve.getPoint(0.84);
        const tangent = curve.getTangent(0.84);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tangent.normalize()
        );
        return { edge, geo, tipPos, quat };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [activeNetwork, nodeMap, reducedQuality]);

  const filamentGeos = useMemo(
    () => buildBackgroundFilaments(reducedQuality),
    [reducedQuality]
  );

  useEffect(() => {
    return () => {
      edgeGeometries.forEach((e) => e.geo.dispose());
      filamentGeos.forEach((g) => g.dispose());
      document.body.style.cursor = 'auto';
    };
  }, [edgeGeometries, filamentGeos]);

  if (!activeNetwork) return null;

  const focusNeuronId = hoveredNeuronId ?? selectedNeuronId;

  return (
    <group>
      {/* Ambient branching neural environment filaments */}
      {filamentGeos.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshBasicMaterial color="#1e3a5f" transparent opacity={0.28} />
        </mesh>
      ))}

      {/* Directed synaptic pathways */}
      {edgeGeometries.map(({ edge, geo, tipPos, quat }) => {
        const isIncoming = focusNeuronId !== null && edge.target === focusNeuronId;
        const isOutgoing = focusNeuronId !== null && edge.source === focusNeuronId;
        const isHighlighted = isIncoming || isOutgoing;

        let color = edge.synapse_type === 'inhibitory' ? '#8b5cf6' : '#0ea5e9';
        if (isIncoming) color = '#22d3ee';
        if (isOutgoing) color = '#c084fc';

        const opacity = !edge.enabled
          ? 0.12
          : focusNeuronId && !isHighlighted
            ? 0.24
            : isHighlighted
              ? 0.92
              : 0.56;

        return (
          <group key={edge.id}>
            <mesh geometry={geo}>
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHighlighted ? 0.9 : 0.25}
                roughness={0.35}
                metalness={0.2}
                transparent
                opacity={opacity}
              />
            </mesh>
            {edge.enabled && (
              <mesh position={tipPos} quaternion={quat}>
                <coneGeometry args={[0.075, 0.2, 8]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isHighlighted ? 1.0 : 0.3}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Multi-part illustrative regional neurons (soma + dendritic crown) */}
      {activeNetwork.nodes.map((node) => {
        const isSelected = selectedNeuronId === node.id;
        const isHovered = hoveredNeuronId === node.id;
        const baseColor = ROLE_COLOR[node.role];
        const active = isSelected || isHovered;

        return (
          <group
            key={node.id}
            position={node.position}
            scale={active ? 1.15 : 1.0}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredNeuron(node.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredNeuron(null);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectNeuron(node.id);
            }}
          >
            {/* Outer translucent soma membrane */}
            <mesh>
              <icosahedronGeometry args={[0.34, reducedQuality ? 1 : 2]} />
              <meshPhysicalMaterial
                color={baseColor}
                emissive={baseColor}
                emissiveIntensity={active ? 0.85 : 0.35}
                roughness={0.28}
                metalness={0.15}
                transparent
                opacity={0.86}
                clearcoat={0.4}
              />
            </mesh>

            {/* Inner nucleus core */}
            <mesh>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial
                color="#e0f2fe"
                emissive={baseColor}
                emissiveIntensity={active ? 1.5 : 0.7}
                roughness={0.2}
              />
            </mesh>

            {/* Dendritic spine collar */}
            <mesh rotation={[Math.PI / 3, 0.4, 0]}>
              <torusGeometry args={[0.42, 0.018, 8, 24]} />
              <meshBasicMaterial
                color={baseColor}
                transparent
                opacity={active ? 0.9 : 0.32}
              />
            </mesh>

            {showLabels && (
              <Html position={[0, 0.54, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
                <div
                  className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                    active
                      ? 'bg-slate-950/95 text-cyan-200 border-cyan-400/60'
                      : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
                  }`}
                >
                  {node.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
