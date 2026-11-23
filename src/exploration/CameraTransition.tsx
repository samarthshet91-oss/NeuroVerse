import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { getCameraPoseForState, getRegionById } from '@/src/exploration/ExplorationController';
import { useExplorationStore } from '@/src/store/explorationStore';

const _goalPos = new THREE.Vector3();
const _goalTarget = new THREE.Vector3();
let goalFov = 44;

interface CameraTransitionProps {
  isSoftwareGl: boolean;
}

export function CameraTransition({ isSoftwareGl }: CameraTransitionProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isTransitioningRef = useRef(false);
  const { camera } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;

  const explorationState = useExplorationStore((s) => s.explorationState);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const followedNeuronId = useExplorationStore((s) => s.followedNeuronId);
  const followSignalActive = useExplorationStore((s) => s.followSignalActive);
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const regions = useExplorationStore((s) => s.regions);
  const cameraResetNonce = useExplorationStore((s) => s.cameraResetNonce);

  useEffect(() => {
    const region = getRegionById(regions, selectedRegionId);
    const focusId = followSignalActive && followedNeuronId ? followedNeuronId : selectedNeuronId;
    const focusedNeuron =
      activeNetwork?.nodes.find((n) => n.id === focusId) ?? null;

    const pose = getCameraPoseForState(
      explorationState,
      region,
      focusedNeuron,
      followSignalActive
    );
    _goalPos.set(...pose.position);
    _goalTarget.set(...pose.target);
    goalFov = pose.fov;
    isTransitioningRef.current = true;
  }, [
    explorationState,
    selectedRegionId,
    selectedNeuronId,
    followedNeuronId,
    followSignalActive,
    activeNetwork,
    regions,
    cameraResetNonce,
  ]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current || !controlsRef.current) return;

    const dt = Math.min(delta, 0.08);
    const lambda = isSoftwareGl ? 10 : 5.2;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, _goalPos.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _goalPos.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _goalPos.z, lambda, dt);
    perspectiveCamera.fov = THREE.MathUtils.damp(perspectiveCamera.fov, goalFov, lambda, dt);
    perspectiveCamera.updateProjectionMatrix();

    controlsRef.current.target.x = THREE.MathUtils.damp(
      controlsRef.current.target.x,
      _goalTarget.x,
      lambda,
      dt
    );
    controlsRef.current.target.y = THREE.MathUtils.damp(
      controlsRef.current.target.y,
      _goalTarget.y,
      lambda,
      dt
    );
    controlsRef.current.target.z = THREE.MathUtils.damp(
      controlsRef.current.target.z,
      _goalTarget.z,
      lambda,
      dt
    );

    controlsRef.current.update();

    const posDist = camera.position.distanceTo(_goalPos);
    const targetDist = controlsRef.current.target.distanceTo(_goalTarget);
    if (posDist < 0.02 && targetDist < 0.02 && Math.abs(perspectiveCamera.fov - goalFov) < 0.04) {
      camera.position.copy(_goalPos);
      perspectiveCamera.fov = goalFov;
      perspectiveCamera.updateProjectionMatrix();
      controlsRef.current.target.copy(_goalTarget);
      controlsRef.current.update();
      isTransitioningRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!isSoftwareGl}
      dampingFactor={0.07}
      enablePan
      enableZoom
      enableRotate
      minDistance={1.2}
      maxDistance={24}
      onStart={() => {
        isTransitioningRef.current = false;
      }}
    />
  );
}
