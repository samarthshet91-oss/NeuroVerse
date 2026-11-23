import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraTransition } from '@/src/exploration/CameraTransition';
import { useExplorationStore } from '@/src/store/explorationStore';

const BrainScene = lazy(() =>
  import('@/src/scenes/BrainScene').then((m) => ({ default: m.BrainScene }))
);
const DenseNeuralEnvironment = lazy(() =>
  import('@/src/scenes/DenseNeuralEnvironment').then((m) => ({
    default: m.DenseNeuralEnvironment,
  }))
);

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function ExplorationScene() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const [contextLost, setContextLost] = useState(false);

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  if (contextLost) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#060911] p-6 text-center">
        <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/90 p-6">
          <h2 className="font-display text-lg font-semibold text-slate-100">
            3D WebGL Context Interrupted
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Your browser temporarily released the WebGL rendering context. Restore the 3D
            viewport below.
          </p>
          <button
            type="button"
            onClick={() => setContextLost(false)}
            className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 transition-colors"
          >
            Restore 3D Viewport
          </button>
        </div>
      </div>
    );
  }

  const effectiveDpr: [number, number] =
    isSoftwareGl || reducedQuality ? [1, 1] : [1, 1.75];

  return (
    <div className="nv-viewport-grid relative h-full w-full bg-[#070B16]">
      <Canvas
        dpr={effectiveDpr}
        camera={{ position: [2.8, 1.45, 3.65], fov: 44, near: 0.1, far: 90 }}
        gl={{
          antialias: !isSoftwareGl && !reducedQuality,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <color attach="background" args={['#060911']} />
        <fog attach="fog" args={['#060911', 12, 32]} />

        {/* Balanced 3-point + hemisphere studio lighting (limited dynamic lights for laptop speed) */}
        <hemisphereLight args={['#7dd3fc', '#090d1a', 0.72]} />
        <directionalLight position={[6, 8, 6]} intensity={1.3} color="#fff7ed" />
        <directionalLight position={[-6, 2, -5]} intensity={0.85} color="#38bdf8" />

        <CameraTransition isSoftwareGl={isSoftwareGl || reducedQuality} />

        <Suspense fallback={null}>
          {explorationState === 'BRAIN_VIEW' ? (
            <BrainScene />
          ) : (
            <DenseNeuralEnvironment />
          )}
        </Suspense>
      </Canvas>

      {/* Subtle viewport interaction hint */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-slate-700/45 bg-[#0b1120]/75 px-3 py-1 text-[10px] tracking-wide text-slate-400/90 shadow-xl backdrop-blur-md whitespace-nowrap">
        {explorationState === 'BRAIN_VIEW'
          ? 'Drag to rotate · Scroll to zoom · Click any brain region to enter'
          : 'Drag to orbit · Scroll to zoom · Click any neuron to inspect & send a signal'}
      </div>
    </div>
  );
}
