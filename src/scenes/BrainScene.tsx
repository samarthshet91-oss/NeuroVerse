import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Html, Line, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { BrainRegion, BrainRegionId } from '@/src/types/neuroverse';

// Preload the anatomically sourced brain model and Draco decoders
useGLTF.preload('/models/brain.glb', '/draco/');

// Center and scale transform for anatomical brain parenchyma
const MODEL_CENTER = [0, 1.6192, -0.0088] as const;
const MODEL_SCALE = 12.8;
const MODEL_POSITION: [number, number, number] = [
  -MODEL_CENTER[0] * MODEL_SCALE,
  -MODEL_CENTER[1] * MODEL_SCALE,
  -MODEL_CENTER[2] * MODEL_SCALE,
];

/**
 * Maps glTF mesh nodes to the six primary anatomical regions of NeuroVerse.
 * Sourced from Z-Anatomy / BodyParts3D Terminologia Anatomica 2 (TA2) classifications.
 */
function getRegionForMesh(name: string, label: string, category: string): BrainRegionId | null {
  if (category === 'cerebellum') return 'cerebellum';
  if (category === 'brainstem') return 'brainstem';
  if (category === 'cortex' || category === 'diencephalon') {
    const text = `${name} ${label}`.toLowerCase();
    if (
      text.includes('occipital') ||
      text.includes('cuneus') ||
      text.includes('lingual') ||
      text.includes('calcarine')
    ) {
      return 'occipital';
    }
    if (
      text.includes('temporal') ||
      text.includes('fusiform') ||
      text.includes('parahippocampal') ||
      text.includes('heschl') ||
      text.includes('uncus') ||
      text.includes('hippocampus') ||
      text.includes('collateral') ||
      text.includes('lat_fis')
    ) {
      return 'temporal';
    }
    if (
      text.includes('parietal') ||
      text.includes('postcentral') ||
      text.includes('precuneus') ||
      text.includes('supramarginal') ||
      text.includes('angular') ||
      text.includes('intraparietal') ||
      text.includes('marginal') ||
      text.includes('jensen') ||
      text.includes('posteroventral') ||
      text.includes('posterior dorsal')
    ) {
      return 'parietal';
    }
    // Frontal lobe / prefrontal cortex / central sulcus / insular cortex
    return 'frontal';
  }
  return null;
}

/** Non-parenchyma categories to hide so the surface reads as a clean anatomical organ */
const HIDDEN_CATEGORIES = new Set([
  'arteries',
  'veins_sinuses',
  'cranial_nerves',
  'meninges_dura',
]);

interface RegionColors {
  base: string;
  emissive: string;
}

const REGION_ACCENT_COLORS: Record<BrainRegionId, RegionColors> = {
  frontal: { base: '#55c9d6', emissive: '#176b78' },
  parietal: { base: '#73b7c0', emissive: '#285b66' },
  temporal: { base: '#8f83ad', emissive: '#514664' },
  occipital: { base: '#7393ad', emissive: '#36536a' },
  cerebellum: { base: '#77aaa0', emissive: '#315f58' },
  brainstem: { base: '#9d8190', emissive: '#604653' },
};

/**
 * Anatomical 3D Brain Model loaded from web-optimized glTF asset.
 * Derived from Z-Anatomy and BodyParts3D / DBCLS under CC BY-SA 4.0.
 */
function AnatomicalBrainModel({
  hoveredRegionId,
  selectedRegionId,
  reducedQuality,
  onHoverRegion,
  onSelectRegion,
}: {
  hoveredRegionId: BrainRegionId | null;
  selectedRegionId: BrainRegionId | null;
  reducedQuality: boolean;
  onHoverRegion: (id: BrainRegionId | null) => void;
  onSelectRegion: (id: BrainRegionId) => void;
}) {
  const { scene } = useGLTF('/models/brain.glb', '/draco/');
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  // Create shared material palette for premium scientific atlas visualization
  const materials = useMemo(() => {
    const activeRegion = hoveredRegionId ?? selectedRegionId;

    const baseCortex = new THREE.MeshPhysicalMaterial({
      color: '#d8c2af',
      emissive: '#3a2f32',
      emissiveIntensity: activeRegion ? 0.025 : 0.055,
      roughness: 0.68,
      metalness: 0,
      transparent: false,
      clearcoat: reducedQuality ? 0 : 0.08,
      clearcoatRoughness: 0.88,
    });

    const baseCerebellum = new THREE.MeshPhysicalMaterial({
      color: '#bda895',
      emissive: '#2f2829',
      emissiveIntensity: activeRegion ? 0.02 : 0.045,
      roughness: 0.76,
      metalness: 0,
      transparent: false,
      clearcoat: reducedQuality ? 0 : 0.04,
      clearcoatRoughness: 0.92,
    });

    const baseBrainstem = new THREE.MeshPhysicalMaterial({
      color: '#ae8f87',
      emissive: '#35262a',
      emissiveIntensity: activeRegion ? 0.02 : 0.05,
      roughness: 0.64,
      metalness: 0,
      transparent: false,
      clearcoat: reducedQuality ? 0 : 0.06,
      clearcoatRoughness: 0.85,
    });

    const highlightedMaterials: Partial<Record<BrainRegionId, THREE.MeshStandardMaterial>> = {};
    const regionIds: BrainRegionId[] = [
      'frontal',
      'parietal',
      'temporal',
      'occipital',
      'cerebellum',
      'brainstem',
    ];

    for (const rId of regionIds) {
      const palette = REGION_ACCENT_COLORS[rId];
      const isSelected = selectedRegionId === rId;
      const isHovered = hoveredRegionId === rId;
      const isActive = isSelected || isHovered;

      if (isActive) {
        highlightedMaterials[rId] = new THREE.MeshPhysicalMaterial({
          color: palette.base,
          emissive: palette.emissive,
          emissiveIntensity: isHovered ? 0.28 : 0.18,
          roughness: 0.56,
          metalness: 0,
          transparent: false,
          clearcoat: reducedQuality ? 0 : 0.1,
          clearcoatRoughness: 0.8,
        });
      }
    }

    return {
      baseCortex,
      baseCerebellum,
      baseBrainstem,
      highlighted: highlightedMaterials,
    };
  }, [hoveredRegionId, selectedRegionId, reducedQuality]);

  useEffect(() => {
    return () => {
      materials.baseCortex.dispose();
      materials.baseCerebellum.dispose();
      materials.baseBrainstem.dispose();
      Object.values(materials.highlighted).forEach((m) => m?.dispose());
    };
  }, [materials]);

  // Apply materials and interaction handlers across all semantic meshes
  useEffect(() => {
    clonedScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const cat = (mesh.userData?.bx_cat as string) || '';

        // Hide external non-parenchymal vessels and nerves
        if (HIDDEN_CATEGORIES.has(cat)) {
          mesh.visible = false;
          return;
        }

        mesh.visible = true;
        const regionId = getRegionForMesh(
          mesh.name,
          (mesh.userData?.bx_label as string) || '',
          cat
        );

        if (regionId && materials.highlighted[regionId]) {
          mesh.material = materials.highlighted[regionId]!;
        } else if (cat === 'cerebellum') {
          mesh.material = materials.baseCerebellum;
        } else if (cat === 'brainstem') {
          mesh.material = materials.baseBrainstem;
        } else {
          // Keep hemispheres visually distinct without modifying the sourced anatomy geometry.
          mesh.material = materials.baseCortex;
        }

        // Store regionId for pointer event dispatch
        mesh.userData.regionId = regionId;
      }
    });
  }, [clonedScene, materials]);

  return (
    <group
      position={MODEL_POSITION}
      scale={MODEL_SCALE}
      onPointerOver={(e) => {
        e.stopPropagation();
        const rId = (e.object as THREE.Mesh).userData?.regionId as BrainRegionId | undefined;
        if (rId) {
          onHoverRegion(rId);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverRegion(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        const rId = (e.object as THREE.Mesh).userData?.regionId as BrainRegionId | undefined;
        if (rId) {
          onSelectRegion(rId);
        }
      }}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// Procedural fallback geometries for resilient error boundaries
function buildFallbackHemisphereGeometry(side: -1 | 1, segW: number, segH: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1.0, segW, segH);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const isMedial = side === 1 ? v.x < 0 : v.x > 0;
    v.x = isMedial ? v.x * 0.22 : v.x * 0.72;
    v.x += side * 0.17;
    v.z *= 1.32;
    v.y *= 0.94;
    if (v.y < -0.15) {
      v.y *= 0.72;
      if (v.z > -0.35 && v.z < 0.55 && Math.abs(v.x) > 0.35) {
        v.y -= 0.14 * (1.0 - Math.abs(v.z - 0.1) * 1.4);
      }
    }
    if (v.z > 0.3) {
      v.x *= 1.0 - (v.z - 0.3) * 0.14;
    }
    const fold =
      Math.sin(v.x * 11.5 + v.z * 7.2) * 0.022 +
      Math.cos(v.y * 13.0 - v.z * 9.5) * 0.018;
    v.addScaledVector(v.clone().divideScalar(v.length() || 1), fold);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildFallbackCerebellumGeometry(segW: number, segH: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.46, segW, segH);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.x *= 1.48;
    v.y *= 0.78;
    v.z *= 0.92;
    const folia = Math.sin(v.y * 38.0) * 0.016;
    v.z += folia * (v.z < 0 ? -1 : 1);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildFallbackBrainstemGeometry(): THREE.BufferGeometry {
  const points = [
    new THREE.Vector2(0.01, -0.68),
    new THREE.Vector2(0.14, -0.62),
    new THREE.Vector2(0.17, -0.36),
    new THREE.Vector2(0.24, -0.14),
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

function ProceduralFallbackBrain({
  reducedQuality,
}: {
  reducedQuality: boolean;
}) {
  const segW = reducedQuality ? 20 : 32;
  const segH = reducedQuality ? 16 : 24;

  const { leftGeo, rightGeo, cerebellumGeo, brainstemGeo } = useMemo(() => {
    return {
      leftGeo: buildFallbackHemisphereGeometry(-1, segW, segH),
      rightGeo: buildFallbackHemisphereGeometry(1, segW, segH),
      cerebellumGeo: buildFallbackCerebellumGeometry(reducedQuality ? 16 : 26, reducedQuality ? 12 : 18),
      brainstemGeo: buildFallbackBrainstemGeometry(),
    };
  }, [segW, segH, reducedQuality]);

  useEffect(() => {
    return () => {
      leftGeo.dispose();
      rightGeo.dispose();
      cerebellumGeo.dispose();
      brainstemGeo.dispose();
    };
  }, [leftGeo, rightGeo, cerebellumGeo, brainstemGeo]);

  return (
    <group>
      <mesh geometry={leftGeo}>
        <meshPhysicalMaterial color="#1a2c46" roughness={0.45} metalness={0.1} transparent opacity={0.8} />
      </mesh>
      <mesh geometry={rightGeo}>
        <meshPhysicalMaterial color="#1a2c46" roughness={0.45} metalness={0.1} transparent opacity={0.8} />
      </mesh>
      <mesh geometry={cerebellumGeo} position={[0, -0.56, -0.78]}>
        <meshStandardMaterial color="#16354d" roughness={0.55} transparent opacity={0.88} />
      </mesh>
      <mesh geometry={brainstemGeo} position={[0, -0.68, -0.18]} rotation={[0.2, 0, 0]}>
        <meshStandardMaterial color="#1f2347" roughness={0.5} transparent opacity={0.9} />
      </mesh>
    </group>
  );
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
          color="#55c9d6"
          emissive="#176b78"
          emissiveIntensity={active ? 0.65 : 0.2}
          roughness={0.42}
          metalness={0}
        />
      </mesh>

      {/* Halo ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.012, 10, 28]} />
        <meshBasicMaterial
          color="#55c9d6"
          transparent
          opacity={active ? 0.7 : 0.28}
        />
      </mesh>

      {/* Regional highlight volume */}
      {active && (
        <mesh>
          <sphereGeometry args={[0.38, 16, 16]} />
          <meshBasicMaterial
            color="#55c9d6"
            transparent
            opacity={0.07}
            depthWrite={false}
          />
        </mesh>
      )}

      {showLabels && (
        <group>
          {/* Subtle vertical leader stem connecting beacon to label */}
          <Line
            points={[[0, active ? 0.11 : 0.088, 0], [0, 0.20, 0]]}
            color={active ? '#67e8f9' : '#55c9d6'}
            opacity={active ? 0.75 : 0.4}
            transparent
            lineWidth={1.2}
          />
          <Html
            position={[0, 0.23, 0]}
            center
            distanceFactor={6.5}
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              className={`px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap rounded border shadow-lg backdrop-blur-md select-none transition-all ${
                active
                  ? 'bg-slate-950/95 text-cyan-200 border-cyan-400/80 shadow-cyan-950/50 scale-105'
                  : 'bg-slate-950/85 text-slate-300 border-slate-700/80 shadow-black/60'
              }`}
              style={{
                boxShadow: active
                  ? '0 4px 14px rgba(0,0,0,0.7), 0 0 10px rgba(85,201,214,0.3)'
                  : '0 4px 10px rgba(0,0,0,0.6)',
              }}
            >
              {region.short_label}
            </div>
          </Html>
        </group>
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

  const pathwayGeos = useMemo(() => buildPathwayTubes(), []);

  useEffect(() => {
    return () => {
      pathwayGeos.forEach((g) => g.dispose());
      document.body.style.cursor = 'auto';
    };
  }, [pathwayGeos]);

  // Subtle ambient rotation when not hovering any interactive elements
  useFrame((_, delta) => {
    if (!brainGroupRef.current || reducedQuality || hoveredRegionId !== null) return;
    brainGroupRef.current.rotation.y += Math.min(delta, 0.05) * 0.09;
  });

  return (
    <group ref={brainGroupRef} position={[0, 0.08, 0]}>
      {/* Anatomically Sourced 3D Brain Model (CC BY-SA 4.0 Z-Anatomy / BodyParts3D) */}
      <Suspense fallback={<ProceduralFallbackBrain reducedQuality={reducedQuality} />}>
        <AnatomicalBrainModel
          hoveredRegionId={hoveredRegionId}
          selectedRegionId={selectedRegionId}
          reducedQuality={reducedQuality}
          onHoverRegion={setHoveredRegion}
          onSelectRegion={(id) => void selectRegion(id)}
        />
      </Suspense>

      {/* Internal commissural & projection neural tracts */}
      {pathwayGeos.map((geo, idx) => (
        <mesh key={idx} geometry={geo}>
          <meshBasicMaterial
            color={idx % 2 === 0 ? '#5b9eaa' : '#806f96'}
            transparent
            opacity={0.18}
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
