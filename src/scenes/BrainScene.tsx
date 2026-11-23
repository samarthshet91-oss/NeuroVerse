import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { BrainRegion } from '@/src/types/neuroverse';

function buildHemisphereGeometry(side: -1 | 1, segW: number, segH: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1.0, segW, segH);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Flatten medial wall along the longitudinal fissure (x near 0)
    const isMedial = side === 1 ? v.x < 0 : v.x > 0;
    if (isMedial) {
      v.x *= 0.22;
    } else {
      v.x *= 0.72;
    }

    // Offset hemisphere laterally from midline fissure
    v.x += side * 0.17;

    // Elongate anterior-posterior (Z) and shape dorsal crown (Y)
    v.z *= 1.32;
    v.y *= 0.94;

    // Subtle ventral flattening and temporal lobe downward curve
    if (v.y < -0.15) {
      v.y *= 0.72;
      if (v.z > -0.35 && v.z < 0.55 && Math.abs(v.x) > 0.35) {
        v.y -= 0.14 * (1.0 - Math.abs(v.z - 0.1) * 1.4);
      }
    }

    // Slight frontal pole taper (+Z)
    if (v.z > 0.3) {
      const taper = 1.0 - (v.z - 0.3) * 0.14;
      v.x *= taper;
    }

    // Procedural cortical gyri/sulci wave relief
    const fold =
      Math.sin(v.x * 11.5 + v.z * 7.2) * 0.022 +
      Math.cos(v.y * 13.0 - v.z * 9.5) * 0.018;
    const len = v.length() || 1;
    v.addScaledVector(v.clone().divideScalar(len), fold);

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

function buildCerebellumGeometry(segW: number, segH: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.46, segW, segH);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.x *= 1.48;
    v.y *= 0.78;
    v.z *= 0.92;
    // Characteristic cerebellar transverse folia striations
    const folia = Math.sin(v.y * 38.0) * 0.016;
    v.z += folia * (v.z < 0 ? -1 : 1);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

function buildBrainstemGeometry(): THREE.BufferGeometry {
  const points = [
    new THREE.Vector2(0.01, -0.68),
    new THREE.Vector2(0.14, -0.62),
    new THREE.Vector2(0.17, -0.36),
    new THREE.Vector2(0.24, -0.14), // Pons bulge
    new THREE.Vector2(0.21, 0.08),
    new THREE.Vector2(0.18, 0.28),
    new THREE.Vector2(0.01, 0.32),
  ];
  const geo = new THREE.LatheGeometry(points, 20);
  geo.computeVertexNormals();
  return geo;
}

function buildPathwayTubes(): THREE.BufferGeometry[] {
  const curves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 0.35, 0.75),
      new THREE.Vector3(-0.12, 0.45, 0.1),
      new THREE.Vector3(0.12, 0.45, 0.1),
      new THREE.Vector3(0.35, 0.35, 0.75),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.55, -0.1),
      new THREE.Vector3(0.0, 0.62, -0.15),
      new THREE.Vector3(0.42, 0.55, -0.1),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.2, 0.55),
      new THREE.Vector3(0.0, -0.25, -0.12),
      new THREE.Vector3(0.0, -0.95, -0.22),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, -0.05, 0.1),
      new THREE.Vector3(-0.25, 0.25, -0.45),
      new THREE.Vector3(0.0, 0.15, -0.88),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.55, -0.05, 0.1),
      new THREE.Vector3(0.25, 0.25, -0.45),
      new THREE.Vector3(0.0, 0.15, -0.88),
    ]),
  ];
  return curves.map((c) => new THREE.TubeGeometry(c, 22, 0.018, 8, false));
}

interface RegionMarkerProps {
  region: BrainRegion;
  isHovered: boolean;
  isSelected: boolean;
  showLabels: boolean;
  onHover: (id: BrainRegion['id'] | null) => void;
  onSelect: (id: BrainRegion['id']) => void;
}

function RegionMarker({
  region,
  isHovered,
  isSelected,
  showLabels,
  onHover,
  onSelect,
}: RegionMarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const active = isHovered || isSelected;

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    const targetScale = active ? 1.35 : 1.0;
    const dt = Math.min(delta, 0.05);
    ringRef.current.scale.x = THREE.MathUtils.damp(ringRef.current.scale.x, targetScale, 8, dt);
    ringRef.current.scale.y = THREE.MathUtils.damp(ringRef.current.scale.y, targetScale, 8, dt);
    ringRef.current.scale.z = THREE.MathUtils.damp(ringRef.current.scale.z, targetScale, 8, dt);
  });

  return (
    <group position={region.marker_position}>
      {/* Interactive beacon core */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(region.id);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(region.id);
        }}
      >
        <sphereGeometry args={[active ? 0.115 : 0.088, 16, 16]} />
        <meshStandardMaterial
          color={region.accent_color}
          emissive={region.accent_color}
          emissiveIntensity={active ? 1.8 : 0.9}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Halo ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.012, 10, 28]} />
        <meshBasicMaterial
          color={region.accent_color}
          transparent
          opacity={active ? 0.92 : 0.45}
        />
      </mesh>

      {/* Regional highlight volume */}
      {active && (
        <mesh>
          <sphereGeometry args={[0.38, 16, 16]} />
          <meshBasicMaterial
            color={region.accent_color}
            transparent
            opacity={0.14}
            depthWrite={false}
          />
        </mesh>
      )}

      {showLabels && (
        <Html
          position={[0, 0.22, 0]}
          center
          distanceFactor={6.5}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded border transition-colors ${
              active
                ? 'bg-slate-950/95 text-cyan-200 border-cyan-400/60'
                : 'bg-slate-950/80 text-slate-300 border-slate-700/70'
            }`}
          >
            {region.short_label}
          </div>
        </Html>
      )}
    </group>
  );
}

export function BrainScene() {
  const brainGroupRef = useRef<THREE.Group>(null);

  const regions = useExplorationStore((s) => s.regions);
  const hoveredRegionId = useExplorationStore((s) => s.hoveredRegionId);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const showLabels = useExplorationStore((s) => s.showLabels);
  const setHoveredRegion = useExplorationStore((s) => s.setHoveredRegion);
  const selectRegion = useExplorationStore((s) => s.selectRegion);

  const segW = reducedQuality ? 20 : 32;
  const segH = reducedQuality ? 16 : 24;

  const { leftGeo, rightGeo, cerebellumGeo, brainstemGeo, pathwayGeos } = useMemo(() => {
    return {
      leftGeo: buildHemisphereGeometry(-1, segW, segH),
      rightGeo: buildHemisphereGeometry(1, segW, segH),
      cerebellumGeo: buildCerebellumGeometry(reducedQuality ? 16 : 26, reducedQuality ? 12 : 18),
      brainstemGeo: buildBrainstemGeometry(),
      pathwayGeos: buildPathwayTubes(),
    };
  }, [segW, segH, reducedQuality]);

  useEffect(() => {
    return () => {
      leftGeo.dispose();
      rightGeo.dispose();
      cerebellumGeo.dispose();
      brainstemGeo.dispose();
      pathwayGeos.forEach((g) => g.dispose());
      document.body.style.cursor = 'auto';
    };
  }, [leftGeo, rightGeo, cerebellumGeo, brainstemGeo, pathwayGeos]);

  useFrame((_, delta) => {
    if (!brainGroupRef.current || reducedQuality || hoveredRegionId !== null) return;
    brainGroupRef.current.rotation.y += Math.min(delta, 0.05) * 0.09;
  });

  return (
    <group ref={brainGroupRef} position={[0, 0.08, 0]}>
      {/* Left Cerebral Hemisphere */}
      <mesh geometry={leftGeo}>
        <meshPhysicalMaterial
          color="#13253e"
          emissive="#0c263f"
          emissiveIntensity={0.35}
          roughness={0.38}
          metalness={0.12}
          transparent
          opacity={0.78}
          clearcoat={0.5}
          clearcoatRoughness={0.35}
        />
      </mesh>

      {/* Right Cerebral Hemisphere */}
      <mesh geometry={rightGeo}>
        <meshPhysicalMaterial
          color="#13253e"
          emissive="#0c263f"
          emissiveIntensity={0.35}
          roughness={0.38}
          metalness={0.12}
          transparent
          opacity={0.78}
          clearcoat={0.5}
          clearcoatRoughness={0.35}
        />
      </mesh>

      {/* Subtle structural wireframe overlay on cortex for scientific contour legibility */}
      {!reducedQuality && (
        <>
          <mesh geometry={leftGeo} scale={1.003}>
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.07} />
          </mesh>
          <mesh geometry={rightGeo} scale={1.003}>
            <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.07} />
          </mesh>
        </>
      )}

      {/* Cerebellum */}
      <mesh geometry={cerebellumGeo} position={[0, -0.56, -0.78]}>
        <meshStandardMaterial
          color="#16354d"
          emissive="#0d9488"
          emissiveIntensity={0.22}
          roughness={0.55}
          metalness={0.15}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Brainstem */}
      <mesh geometry={brainstemGeo} position={[0, -0.68, -0.18]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial
          color="#1f2347"
          emissive="#6d28d9"
          emissiveIntensity={0.22}
          roughness={0.5}
          metalness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Internal commissural & projection neural tracts */}
      {pathwayGeos.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshBasicMaterial
            color={idx % 2 === 0 ? '#22d3ee' : '#a78bfa'}
            transparent
            opacity={0.45}
          />
        </mesh>
      ))}

      {/* Selectable Region Markers */}
      {regions.map((region) => (
        <RegionMarker
          key={region.id}
          region={region}
          isHovered={hoveredRegionId === region.id}
          isSelected={selectedRegionId === region.id}
          showLabels={showLabels}
          onHover={setHoveredRegion}
          onSelect={(id) => void selectRegion(id)}
        />
      ))}
    </group>
  );
}
