import { useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { NeuronAnatomyPartId } from '@/src/types/neuroverse';

function buildDendriteTubes(): THREE.BufferGeometry[] {
  const branches: THREE.Vector3[][] = [
    [new THREE.Vector3(-1.8, 0.0, 0.0), new THREE.Vector3(-2.5, 0.65, 0.35), new THREE.Vector3(-3.15, 1.15, 0.55)],
    [new THREE.Vector3(-2.5, 0.65, 0.35), new THREE.Vector3(-2.9, 0.95, -0.2)],
    [new THREE.Vector3(-1.8, 0.1, 0.0), new THREE.Vector3(-2.6, -0.5, 0.45), new THREE.Vector3(-3.2, -0.95, 0.7)],
    [new THREE.Vector3(-1.85, -0.1, -0.1), new THREE.Vector3(-2.5, 0.25, -0.7), new THREE.Vector3(-3.1, 0.55, -1.15)],
    [new THREE.Vector3(-1.75, 0.2, 0.1), new THREE.Vector3(-2.3, 1.0, -0.1), new THREE.Vector3(-2.7, 1.55, -0.25)],
    [new THREE.Vector3(-1.85, -0.2, -0.1), new THREE.Vector3(-2.45, -0.85, -0.55), new THREE.Vector3(-3.0, -1.35, -0.85)],
  ];
  return branches.map((pts) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 16, 0.055, 8, false);
  });
}

function buildAxonCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.25, 0.0, 0.0),
    new THREE.Vector3(-0.3, 0.05, 0.08),
    new THREE.Vector3(0.8, -0.04, -0.05),
    new THREE.Vector3(1.9, 0.04, 0.04),
    new THREE.Vector3(2.85, 0.0, 0.0),
  ]);
}

function buildTerminalBranches(): { tube: THREE.BufferGeometry; tip: THREE.Vector3 }[] {
  const endpoints: THREE.Vector3[] = [
    new THREE.Vector3(3.65, 0.85, 0.35),
    new THREE.Vector3(3.75, 0.25, -0.55),
    new THREE.Vector3(3.7, -0.35, 0.52),
    new THREE.Vector3(3.55, -0.9, -0.28),
  ];
  return endpoints.map((end) => {
    const mid = new THREE.Vector3(3.2, end.y * 0.45, end.z * 0.45);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.85, 0.0, 0.0),
      mid,
      end,
    ]);
    return {
      tube: new THREE.TubeGeometry(curve, 12, 0.038, 7, false),
      tip: end,
    };
  });
}

export function NeuronScene() {
  const selectedPart = useExplorationStore((s) => s.selectedAnatomyPart);
  const selectPart = useExplorationStore((s) => s.selectAnatomyPart);
  const showLabels = useExplorationStore((s) => s.showLabels);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const neuronSimResult = useExplorationStore((s) => s.neuronSimResult);

  const dendriteGeos = useMemo(() => buildDendriteTubes(), []);
  const axonCurve = useMemo(() => buildAxonCurve(), []);
  const axonGeo = useMemo(
    () => new THREE.TubeGeometry(axonCurve, reducedQuality ? 20 : 32, 0.072, 10, false),
    [axonCurve, reducedQuality]
  );
  const terminalBranches = useMemo(() => buildTerminalBranches(), []);

  const myelinSegments = useMemo(() => {
    const tValues = [0.22, 0.42, 0.62, 0.82];
    return tValues.map((t) => {
      const pos = axonCurve.getPoint(t);
      const tangent = axonCurve.getTangent(t).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tangent
      );
      return { pos, quat };
    });
  }, [axonCurve]);

  useEffect(() => {
    return () => {
      dendriteGeos.forEach((g) => g.dispose());
      axonGeo.dispose();
      terminalBranches.forEach((b) => b.tube.dispose());
      document.body.style.cursor = 'auto';
    };
  }, [dendriteGeos, axonGeo, terminalBranches]);

  const partProps = (part: NeuronAnatomyPartId) => ({
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
      selectPart(part);
    },
  });

  const hasSpikes = (neuronSimResult?.spike_count ?? 0) > 0;

  return (
    <group position={[0.1, 0.0, 0.0]}>
      {/* 1. Dendrites */}
      <group {...partProps('dendrites')}>
        {dendriteGeos.map((geo, idx) => (
          <mesh key={idx} geometry={geo}>
            <meshStandardMaterial
              color={selectedPart === 'dendrites' ? '#22d3ee' : '#0284c7'}
              emissive="#22d3ee"
              emissiveIntensity={selectedPart === 'dendrites' ? 0.95 : 0.3}
              roughness={0.35}
              metalness={0.15}
            />
          </mesh>
        ))}
        {showLabels && (
          <Html position={[-2.95, 1.7, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div
              className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                selectedPart === 'dendrites'
                  ? 'bg-slate-950/95 text-cyan-200 border-cyan-400/60'
                  : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
              }`}
            >
              Dendrites
            </div>
          </Html>
        )}
      </group>

      {/* 2. Soma & Nucleus & Axon Hillock */}
      <group position={[-1.65, 0, 0]} {...partProps('soma')}>
        <mesh scale={[1.15, 0.95, 0.95]}>
          <icosahedronGeometry args={[0.56, reducedQuality ? 1 : 2]} />
          <meshPhysicalMaterial
            color={selectedPart === 'soma' ? '#38bdf8' : '#1d4ed8'}
            emissive={hasSpikes ? '#22d3ee' : '#0ea5e9'}
            emissiveIntensity={selectedPart === 'soma' ? 0.9 : hasSpikes ? 0.65 : 0.25}
            roughness={0.25}
            metalness={0.1}
            transparent
            opacity={0.82}
            clearcoat={0.5}
          />
        </mesh>
        {/* Nucleus */}
        <mesh>
          <sphereGeometry args={[0.24, 14, 14]} />
          <meshStandardMaterial
            color="#e0f2fe"
            emissive="#38bdf8"
            emissiveIntensity={selectedPart === 'soma' ? 1.4 : 0.7}
            roughness={0.2}
          />
        </mesh>
        {/* Axon hillock taper */}
        <mesh position={[0.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.24, 0.45, 14]} />
          <meshStandardMaterial
            color={selectedPart === 'soma' ? '#38bdf8' : '#1e40af'}
            roughness={0.35}
            transparent
            opacity={0.85}
          />
        </mesh>
        {showLabels && (
          <Html position={[0, 0.82, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div
              className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                selectedPart === 'soma'
                  ? 'bg-slate-950/95 text-cyan-200 border-cyan-400/60'
                  : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
              }`}
            >
              Soma
            </div>
          </Html>
        )}
      </group>

      {/* 3. Axon shaft */}
      <group {...partProps('axon')}>
        <mesh geometry={axonGeo}>
          <meshStandardMaterial
            color={selectedPart === 'axon' ? '#818cf8' : '#4f46e5'}
            emissive="#818cf8"
            emissiveIntensity={selectedPart === 'axon' ? 1.0 : 0.35}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        {showLabels && (
          <Html position={[0.8, -0.45, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div
              className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                selectedPart === 'axon'
                  ? 'bg-slate-950/95 text-indigo-200 border-indigo-400/60'
                  : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
              }`}
            >
              Axon &amp; Nodes of Ranvier
            </div>
          </Html>
        )}
      </group>

      {/* 4. Myelin Sheath segments */}
      <group {...partProps('myelin')}>
        {myelinSegments.map((seg, idx) => (
          <mesh key={idx} position={seg.pos} quaternion={seg.quat}>
            <capsuleGeometry args={[0.165, 0.48, 6, 14]} />
            <meshPhysicalMaterial
              color={selectedPart === 'myelin' ? '#2dd4bf' : '#0f766e'}
              emissive="#14b8a6"
              emissiveIntensity={selectedPart === 'myelin' ? 0.75 : 0.22}
              roughness={0.22}
              metalness={0.05}
              transparent
              opacity={0.78}
              clearcoat={0.6}
            />
          </mesh>
        ))}
        {showLabels && (
          <Html position={[0.25, 0.48, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div
              className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                selectedPart === 'myelin'
                  ? 'bg-slate-950/95 text-teal-200 border-teal-400/60'
                  : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
              }`}
            >
              Myelin Sheath
            </div>
          </Html>
        )}
      </group>

      {/* 5. Axon Terminals & Synaptic Boutons */}
      <group {...partProps('terminals')}>
        {terminalBranches.map((branch, idx) => (
          <group key={idx}>
            <mesh geometry={branch.tube}>
              <meshStandardMaterial
                color={selectedPart === 'terminals' ? '#c084fc' : '#7e22ce'}
                emissive="#a855f7"
                emissiveIntensity={selectedPart === 'terminals' ? 0.95 : 0.35}
                roughness={0.35}
              />
            </mesh>
            <mesh position={branch.tip}>
              <sphereGeometry args={[0.11, 12, 12]} />
              <meshStandardMaterial
                color="#e9d5ff"
                emissive="#a855f7"
                emissiveIntensity={selectedPart === 'terminals' ? 1.5 : 0.75}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}
        {showLabels && (
          <Html position={[3.65, 1.15, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div
              className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border ${
                selectedPart === 'terminals'
                  ? 'bg-slate-950/95 text-purple-200 border-purple-400/60'
                  : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
              }`}
            >
              Axon Terminals
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
