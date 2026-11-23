import type {
  BiologicalNeuronNode,
  BrainRegion,
  BrainRegionId,
  ExplorationState,
} from '@/src/types/neuroverse';

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
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
      };
    }
    return {
      position: [2.8, 1.45, 3.65],
      target: [0, -0.05, 0],
    };
  }

  if (state === 'NEURON_VIEW' && focusedNeuron) {
    const [nx, ny, nz] = focusedNeuron.position;
    // Frame the neuron soma, dendrites, and outgoing axon cleanly from an oblique 3/4 angle
    return {
      position: [nx + 2.15, ny + 1.35, nz + 3.05],
      target: [nx + 0.25, ny, nz],
    };
  }

  if (followSignalActive && focusedNeuron) {
    const [nx, ny, nz] = focusedNeuron.position;
    return {
      position: [nx + 3.0, ny + 1.9, nz + 4.4],
      target: [nx, ny, nz],
    };
  }

  // REGION_VIEW / NETWORK_SIMULATION: wide immersive perspective inside the 3D neural tissue
  return {
    position: [0.0, 4.2, 12.2],
    target: [0, 0, 0],
  };
}

export function getRegionById(
  regions: BrainRegion[],
  regionId: BrainRegionId | null
): BrainRegion | null {
  if (!regionId) return null;
  return regions.find((r) => r.id === regionId) ?? null;
}
