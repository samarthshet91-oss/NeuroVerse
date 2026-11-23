import { generateBiologicalRegionNetwork } from '@/src/data/biologicalNetworkGenerator';
import type { BrainRegionId, RegionNetwork } from '@/src/types/neuroverse';

/**
 * Generates illustrative procedural biological microcircuit presets per region
 * for structural exploration when the Python FastAPI backend is unavailable.
 */
export const ILLUSTRATIVE_REGION_NETWORKS: Record<BrainRegionId, RegionNetwork> = {
  frontal: generateBiologicalRegionNetwork('frontal', 110),
  parietal: generateBiologicalRegionNetwork('parietal', 110),
  temporal: generateBiologicalRegionNetwork('temporal', 110),
  occipital: generateBiologicalRegionNetwork('occipital', 110),
  cerebellum: generateBiologicalRegionNetwork('cerebellum', 110),
  brainstem: generateBiologicalRegionNetwork('brainstem', 110),
};
