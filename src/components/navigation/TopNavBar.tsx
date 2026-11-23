import { ArrowLeft, ChevronRight } from 'lucide-react';
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
    <header className="flex h-13 shrink-0 items-center justify-between gap-8 border-b border-slate-800/80 bg-[#080d18]/95 px-5">
      {/* Zone 1: Single-element wordmark */}
      <button
        type="button"
        onClick={resetToBrainView}
        className="font-display text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 hover:text-cyan-300 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        NeuroVerse
      </button>

      {/* Zone 2: Continuous hierarchical exploration breadcrumb (no separate app tabs) */}
      <nav
        aria-label="Exploration hierarchy"
        className="hidden sm:flex items-center gap-2 text-sm overflow-x-auto"
      >
        <button
          type="button"
          onClick={resetToBrainView}
          className={`whitespace-nowrap shrink-0 transition-colors ${
            explorationState === 'BRAIN_VIEW'
              ? 'font-semibold text-cyan-300'
              : 'text-slate-400 hover:text-slate-100'
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
                  ? 'font-semibold text-cyan-300'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {selectedRegion.name}
            </button>
          </>
        )}

        {explorationState === 'NEURON_VIEW' && selectedNeuron && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
            <span className="font-semibold text-cyan-300 whitespace-nowrap shrink-0">
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
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-1.5 text-xs font-medium text-cyan-200 whitespace-nowrap shrink-0 hover:bg-cyan-500/25 transition-colors"
          >
            Reset View
          </button>
        ) : (
          <button
            type="button"
            onClick={stepBack}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-1.5 text-xs font-medium text-cyan-200 whitespace-nowrap shrink-0 hover:bg-cyan-500/25 transition-colors"
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
