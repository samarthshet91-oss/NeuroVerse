import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { SpikeEvent } from '@/src/types/neuroverse';

const _dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _color = new THREE.Color();

interface SignalAnimatorProps {
  edgeCurves: Map<string, THREE.CatmullRomCurve3>;
  synapsePositions: Map<string, THREE.Vector3>;
  spikeEvents: SpikeEvent[];
  durationMs: number;
}

const MAX_PULSES = 128;

export function SignalAnimator({
  edgeCurves,
  synapsePositions,
  spikeEvents,
  durationMs,
}: SignalAnimatorProps) {
  const pulseMeshRef = useRef<THREE.InstancedMesh>(null);
  const synapseFlashRef = useRef<THREE.InstancedMesh>(null);

  const isPlaying = useExplorationStore((s) => s.isPlayingSignals);
  const playbackSpeed = useExplorationStore((s) => s.playbackSpeed);
  const setPlaybackTimeMs = useExplorationStore((s) => s.setPlaybackTimeMs);
  const setPlayingSignals = useExplorationStore((s) => s.setPlayingSignals);

  const timeRef = useRef<number>(useExplorationStore.getState().playbackTimeMs);
  const lastSyncedRef = useRef<number>(timeRef.current);
  const syncTimerRef = useRef<number>(0);

  // Keep internal animation clock synced with external seeks, resets, and view transitions
  useEffect(() => {
    timeRef.current = useExplorationStore.getState().playbackTimeMs;
    lastSyncedRef.current = timeRef.current;

    const unsubscribe = useExplorationStore.subscribe((state, prevState) => {
      if (state.playbackTimeMs !== prevState.playbackTimeMs) {
        // Only adopt store value if it wasn't just pushed by our own throttled sync
        if (Math.abs(state.playbackTimeMs - lastSyncedRef.current) > 1e-4) {
          timeRef.current = state.playbackTimeMs;
          lastSyncedRef.current = state.playbackTimeMs;
        }
      }
      // If playback was paused externally, flush exact internal timestamp
      if (!state.isPlayingSignals && prevState.isPlayingSignals) {
        const clamped = THREE.MathUtils.clamp(timeRef.current, 0, Math.max(0, durationMs));
        lastSyncedRef.current = clamped;
        setPlaybackTimeMs(clamped);
      }
    });

    return () => {
      unsubscribe();
      const clamped = THREE.MathUtils.clamp(timeRef.current, 0, Math.max(0, durationMs));
      lastSyncedRef.current = clamped;
      setPlaybackTimeMs(clamped);
    };
  }, [durationMs, setPlaybackTimeMs]);

  const pulseGeo = useMemo(() => new THREE.SphereGeometry(0.095, 10, 10), []);
  const pulseMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.96,
      }),
    []
  );

  const flashGeo = useMemo(() => new THREE.SphereGeometry(0.14, 10, 10), []);
  const flashMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fde047',
        transparent: true,
        opacity: 0.88,
      }),
    []
  );

  useEffect(() => {
    return () => {
      pulseGeo.dispose();
      pulseMat.dispose();
      flashGeo.dispose();
      flashMat.dispose();
    };
  }, [pulseGeo, pulseMat, flashGeo, flashMat]);

  useFrame((_, delta) => {
    const pulseInst = pulseMeshRef.current;
    const flashInst = synapseFlashRef.current;
    if (!pulseInst || !flashInst) return;

    const clampedDelta = Math.min(delta, 0.033);
    if (isPlaying && durationMs > 0) {
      let nextTime = timeRef.current + clampedDelta * 18.0 * playbackSpeed;
      if (nextTime >= durationMs) {
        nextTime = durationMs;
        timeRef.current = nextTime;
        lastSyncedRef.current = nextTime;
        setPlaybackTimeMs(nextTime);
        setPlayingSignals(false);
      } else {
        timeRef.current = nextTime;
        syncTimerRef.current += clampedDelta;
        if (syncTimerRef.current >= 0.05) {
          syncTimerRef.current = 0;
          lastSyncedRef.current = nextTime;
          setPlaybackTimeMs(nextTime);
        }
      }
    }

    const tNow = timeRef.current;
    let activePulses = 0;
    let activeFlashes = 0;

    for (let i = 0; i < spikeEvents.length; i++) {
      const ev = spikeEvents[i];

      // Traveling impulse along the axon from fire_time_ms -> arrival_time_ms
      if (
        activePulses < MAX_PULSES &&
        tNow >= ev.fire_time_ms &&
        tNow <= ev.arrival_time_ms
      ) {
        const curve = edgeCurves.get(ev.edge_id);
        if (curve) {
          const span = Math.max(0.001, ev.arrival_time_ms - ev.fire_time_ms);
          const alpha = THREE.MathUtils.clamp((tNow - ev.fire_time_ms) / span, 0, 1);
          curve.getPoint(alpha, _pos);

          _dummy.position.copy(_pos);
          _dummy.scale.setScalar(0.9 + Math.sin(alpha * Math.PI) * 0.45);
          _dummy.updateMatrix();
          pulseInst.setMatrixAt(activePulses, _dummy.matrix);
          _color.set(ev.weight >= 0 ? '#22d3ee' : '#c084fc');
          pulseInst.setColorAt(activePulses, _color);
          activePulses++;
        }
      }

      // Synaptic cleft flash right as the impulse crosses into the receiving dendrite
      if (
        activeFlashes < MAX_PULSES &&
        tNow >= ev.arrival_time_ms &&
        tNow <= ev.arrival_time_ms + 1.8
      ) {
        const synPos = synapsePositions.get(ev.edge_id);
        if (synPos) {
          const fade = 1.0 - (tNow - ev.arrival_time_ms) / 1.8;
          _dummy.position.copy(synPos);
          _dummy.scale.setScalar(0.65 + fade * 0.85);
          _dummy.updateMatrix();
          flashInst.setMatrixAt(activeFlashes, _dummy.matrix);
          _color.set(ev.weight >= 0 ? '#fde047' : '#e879f9');
          flashInst.setColorAt(activeFlashes, _color);
          activeFlashes++;
        }
      }
    }

    pulseInst.count = activePulses;
    pulseInst.instanceMatrix.needsUpdate = true;
    if (pulseInst.instanceColor) pulseInst.instanceColor.needsUpdate = true;

    flashInst.count = activeFlashes;
    flashInst.instanceMatrix.needsUpdate = true;
    if (flashInst.instanceColor) flashInst.instanceColor.needsUpdate = true;
  });

  if (spikeEvents.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={pulseMeshRef}
        args={[pulseGeo, pulseMat, MAX_PULSES]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={synapseFlashRef}
        args={[flashGeo, flashMat, MAX_PULSES]}
        frustumCulled={false}
      />
    </group>
  );
}
