import type {
  BiologicalNeuronNode,
  BrainRegion,
  BrainRegionId,
  ExplorationState,
} from '@/src/types/neuroverse';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/**
 * Compute camera position and look-at target for the continuous exploration hierarchy:
 * Whole Brain -> Dense Neural Tissue -> Selected Biological Neuron / Signal Follow.
 */
export function getCameraPoseForState(
  state: ExplorationState,
  selectedRegion: BrainRegion | null,
  focusedNeuron: BiologicalNeuronNode | null,
  followSignalActive = false
): CameraPose {
  if (state === 'BRAIN_VIEW') {
    if (selectedRegion) {
      const [mx, my, mz] = selectedRegion.marker_position;
      const scale = 2.6;
      return {
        position: [mx * scale + 1.4, my * scale + 0.7, mz * scale + 1.9],
        target: [mx * 0.35, my * 0.35, mz * 0.35],
        fov: 39,
      };
    }
    return {
      position: [2.8, 1.45, 3.65],
      target: [0, -0.05, 0],
      fov: 38,
    };
  }

  if (state === 'NEURON_VIEW' && focusedNeuron) {
    const [nx, ny, nz] = focusedNeuron.position;
    // Frame the neuron soma, dendrites, and outgoing axon cleanly from an oblique 3/4 angle
    return {
      position: [nx + 2.35, ny + 1.5, nz + 3.45],
      target: [nx + 0.18, ny + 0.04, nz],
      fov: 33,
    };
  }

  if (followSignalActive && focusedNeuron) {
    const [nx, ny, nz] = focusedNeuron.position;
    return {
      position: [nx + 3.0, ny + 1.9, nz + 4.4],
      target: [nx, ny, nz],
      fov: 39,
    };
  }

  // REGION_VIEW / NETWORK_SIMULATION: wide immersive perspective inside the 3D neural tissue
  return {
    position: [0.0, 4.5, 13.4],
    target: [0, 0.1, 0],
    fov: 42,
  };
}

export function getRegionById(
  regions: BrainRegion[],
  regionId: BrainRegionId | null
): BrainRegion | null {
  if (!regionId) return null;
  return regions.find((r) => r.id === regionId) ?? null;
}
