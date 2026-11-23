import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SignalAnimator } from '@/src/simulation/SignalAnimator';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { NeuronNode } from '@/src/types/neuroverse';

const ROLE_COLORS: Record<NeuronNode['role'], string> = {
  input: '#22d3ee',
  excitatory: '#38bdf8',
  inhibitory: '#a78bfa',
  output: '#2dd4bf',
};

export function NeuralNetworkScene() {
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const selectedEdgeId = useExplorationStore((s) => s.selectedEdgeId);
  const externalInputsNa = useExplorationStore((s) => s.externalInputsNa);
  const networkSimResult = useExplorationStore((s) => s.networkSimResult);
  const lifParams = useExplorationStore((s) => s.lifParams);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const showLabels = useExplorationStore((s) => s.showLabels);
  const selectNeuron = useExplorationStore((s) => s.selectNeuron);
  const selectEdge = useExplorationStore((s) => s.selectEdge);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NeuronNode>();
    activeNetwork?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [activeNetwork]);

  const { edgeEntries, edgeCurves } = useMemo(() => {
    const entries: {
      id: string;
      weight: number;
      enabled: boolean;
      synapse_type: 'excitatory' | 'inhibitory';
      geo: THREE.TubeGeometry;
      midPos: THREE.Vector3;
      tipPos: THREE.Vector3;
      tipQuat: THREE.Quaternion;
    }[] = [];
    const curves = new Map<string, THREE.CatmullRomCurve3>();

    if (!activeNetwork) return { edgeEntries: entries, edgeCurves: curves };

    activeNetwork.edges.forEach((edge, idx) => {
      const src = nodeMap.get(edge.source);
      const dst = nodeMap.get(edge.target);
      if (!src || !dst) return;

      const start = new THREE.Vector3(...src.position);
      const end = new THREE.Vector3(...dst.position);
      const mid = start.clone().lerp(end, 0.5);
      const offsetDir = new THREE.Vector3(
        -(end.z - start.z),
        0.38 + (idx % 2) * 0.25,
        end.x - start.x
      )
        .normalize()
        .multiplyScalar(0.45);
      mid.add(offsetDir);

      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      curves.set(edge.id, curve);

      const radius = 0.02 + Math.min(Math.abs(edge.weight), 6) * 0.006;
      const geo = new THREE.TubeGeometry(curve, reducedQuality ? 16 : 24, radius, 8, false);
      const midPos = curve.getPoint(0.5);
      const tipPos = curve.getPoint(0.84);
      const tangent = curve.getTangent(0.84).normalize();
      const tipQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent
      );

      entries.push({
        id: edge.id,
        weight: edge.weight,
        enabled: edge.enabled,
        synapse_type: edge.synapse_type,
        geo,
        midPos,
        tipPos,
        tipQuat,
      });
    });

    return { edgeEntries: entries, edgeCurves: curves };
  }, [activeNetwork, nodeMap, reducedQuality]);

  useEffect(() => {
    return () => {
      edgeEntries.forEach((e) => e.geo.dispose());
      document.body.style.cursor = 'auto';
    };
  }, [edgeEntries]);

  if (!activeNetwork) return null;

  const metricByNode = new Map(
    networkSimResult?.node_metrics.map((m) => [m.node_id, m]) ?? []
  );

  return (
    <group>
      {/* Synaptic edges + clickable weight handle */}
      {edgeEntries.map((edge) => {
        const isSelected = selectedEdgeId === edge.id;
        const baseColor = edge.synapse_type === 'inhibitory' ? '#a855f7' : '#0ea5e9';
        const color = isSelected ? '#fde047' : baseColor;
        const opacity = !edge.enabled ? 0.14 : isSelected ? 0.96 : 0.65;

        return (
          <group key={edge.id}>
            <mesh
              geometry={edge.geo}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'auto';
              }}
              onClick={(e) => {
                e.stopPropagation();
                selectEdge(edge.id);
              }}
            >
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.9 : 0.25}
                roughness={0.35}
                transparent
                opacity={opacity}
              />
            </mesh>

            {/* Clickable synaptic weight node at midpoint */}
            <mesh
              position={edge.midPos}
              onClick={(e) => {
                e.stopPropagation();
                selectEdge(edge.id);
              }}
            >
              <sphereGeometry args={[isSelected ? 0.11 : 0.075, 10, 10]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 1.2 : 0.4}
                transparent
                opacity={edge.enabled ? 0.9 : 0.28}
              />
            </mesh>

            {edge.enabled && (
              <mesh position={edge.tipPos} quaternion={edge.tipQuat}>
                <coneGeometry args={[0.08, 0.2, 8]} />
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isSelected ? 1.0 : 0.3}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Neuron nodes */}
      {activeNetwork.nodes.map((node) => {
        const isSelected = selectedNeuronId === node.id;
        const color = ROLE_COLORS[node.role];
        const metric = metricByNode.get(node.id);
        const extInput = externalInputsNa[node.id] ?? node.baseline_input_na;

        return (
          <group
            key={node.id}
            position={node.position}
            scale={isSelected ? 1.15 : 1.0}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              selectNeuron(node.id);
            }}
          >
            <mesh>
              <icosahedronGeometry args={[0.36, reducedQuality ? 1 : 2]} />
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 0.9 : 0.35}
                roughness={0.28}
                metalness={0.12}
                transparent
                opacity={0.88}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial
                color="#f0f9ff"
                emissive={color}
                emissiveIntensity={extInput > 0 ? 1.3 : 0.55}
              />
            </mesh>

            {showLabels && (
              <Html position={[0, 0.58, 0]} center distanceFactor={8.5} style={{ pointerEvents: 'none' }}>
                <div
                  className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                    isSelected
                      ? 'bg-slate-950/95 text-cyan-200 border-cyan-400/60'
                      : 'bg-slate-950/85 text-slate-300 border-slate-700/70'
                  }`}
                >
                  {node.label}
                  {metric ? ` · ${metric.spike_count} spk` : ''}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Real backend spike propagation pulses */}
      {networkSimResult && (
        <SignalAnimator
          edgeCurves={edgeCurves}
          synapsePositions={
            new Map(
              activeNetwork.edges.map((e) => [
                e.id,
                new THREE.Vector3(...e.synapse_position),
              ])
            )
          }
          spikeEvents={networkSimResult.spike_events}
          durationMs={lifParams.duration_ms}
        />
      )}
    </group>
  );
}
