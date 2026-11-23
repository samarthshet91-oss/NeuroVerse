import { ArrowLeft, BrainCircuit, ChevronRight, Orbit } from 'lucide-react';
import { getRegionById } from '@/src/exploration/ExplorationController';
import { useExplorationStore } from '@/src/store/explorationStore';

export function TopNavBar() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const regions = useExplorationStore((s) => s.regions);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);

  const resetToBrainView = useExplorationStore((s) => s.resetToBrainView);
  const returnToTissueView = useExplorationStore((s) => s.returnToTissueView);
  const stepBack = useExplorationStore((s) => s.stepBack);
  const triggerCameraReset = useExplorationStore((s) => s.triggerCameraReset);

  const selectedRegion = getRegionById(regions, selectedRegionId);
  const selectedNeuron =
    activeNetwork?.nodes.find((n) => n.id === selectedNeuronId) ?? null;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-400/12 bg-[#101a2a]/92 px-3 backdrop-blur-xl sm:px-5">
      <button
        type="button"
        onClick={resetToBrainView}
        className="group flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-lg border border-[#55c9d6]/30 bg-[#55c9d6]/10 text-[#80dde6] shadow-[0_0_18px_rgba(85,201,214,.1)] transition group-hover:border-[#55c9d6]/70">
          <BrainCircuit className="h-4.5 w-4.5" />
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-[#E5EAF2] sm:text-base">Neuro<span className="text-[#55c9d6]">Verse</span></span>
      </button>

      {/* Zone 2: Continuous hierarchical exploration breadcrumb (no separate app tabs) */}
      <nav
        aria-label="Exploration hierarchy"
        className="hidden min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto text-sm md:flex"
      >
        <button
          type="button"
          onClick={resetToBrainView}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            explorationState === 'BRAIN_VIEW'
              ? 'font-semibold text-[#8ce0e8]'
              : 'text-[#9AA9BC] hover:text-[#E5EAF2]'
          }`}
        >
          Whole Brain
        </button>

        {selectedRegion && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
            <button
              type="button"
              onClick={returnToTissueView}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                explorationState === 'REGION_VIEW'
                ? 'font-semibold text-[#8ce0e8]'
                : 'text-[#9AA9BC] hover:text-[#E5EAF2]'
              }`}
            >
              {selectedRegion.name}
            </button>
          </>
        )}

        {explorationState === 'NEURON_VIEW' && selectedNeuron && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
            <span className="font-semibold text-[#8ce0e8] whitespace-nowrap shrink-0">
              {selectedNeuron.label}
            </span>
          </>
        )}
      </nav>

      {/* Zone 3: Single contextual primary action */}
      <div className="flex items-center shrink-0">
        {explorationState === 'BRAIN_VIEW' ? (
          <button
            type="button"
            onClick={triggerCameraReset}
            className="nv-action flex items-center gap-1.5 border-[#55c9d6]/25 bg-[#55c9d6]/10 px-3 py-1.5 text-xs font-medium text-[#d3f6f8] whitespace-nowrap shrink-0"
          >
            <Orbit className="h-3.5 w-3.5" />
            Reset View
          </button>
        ) : (
          <button
            type="button"
            onClick={stepBack}
            className="nv-action flex items-center gap-1.5 border-[#55c9d6]/25 bg-[#55c9d6]/10 px-3.5 py-1.5 text-xs font-medium text-[#d3f6f8] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>
              {explorationState === 'NEURON_VIEW' ? 'Back to Tissue' : 'Back to Brain'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
