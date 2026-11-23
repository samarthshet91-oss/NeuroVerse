import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { TopNavBar } from '@/src/components/navigation/TopNavBar';
import { ContextInfoPanel } from '@/src/components/panels/ContextInfoPanel';
import { Breadcrumb } from '@/src/exploration/Breadcrumb';
import { getRegionById } from '@/src/exploration/ExplorationController';
import { ExplorationScene } from '@/src/exploration/ExplorationScene';
import { ResultsPanel } from '@/src/simulation/ResultsPanel';
import { useExplorationStore } from '@/src/store/explorationStore';

export function NeuroVerseShell() {
  const initializeBackend = useExplorationStore((s) => s.initializeBackend);
  const showInfoPanel = useExplorationStore((s) => s.showInfoPanel);
  const explorationState = useExplorationStore((s) => s.explorationState);
  const regions = useExplorationStore((s) => s.regions);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);

  const resetToBrainView = useExplorationStore((s) => s.resetToBrainView);
  const returnToTissueView = useExplorationStore((s) => s.returnToTissueView);

  const selectedRegion = getRegionById(regions, selectedRegionId);
  const selectedNeuron =
    activeNetwork?.nodes.find((n) => n.id === selectedNeuronId) ?? null;

  useEffect(() => {
    void initializeBackend();
  }, [initializeBackend]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#060911] text-slate-100">
      <TopNavBar />
      <Breadcrumb />

      {/* Mobile compact hierarchy breadcrumb */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/70 bg-[#080d18] px-3 py-1.5 text-xs sm:hidden">
        <button
          type="button"
          onClick={resetToBrainView}
          className={
            explorationState === 'BRAIN_VIEW' ? 'font-semibold text-cyan-300' : 'text-slate-400'
          }
        >
          Brain
        </button>
        {selectedRegion && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <button
              type="button"
              onClick={returnToTissueView}
              className={
                explorationState === 'REGION_VIEW'
                  ? 'font-semibold text-cyan-300'
                  : 'text-slate-400'
              }
            >
              {selectedRegion.short_label}
            </button>
          </>
        )}
        {explorationState === 'NEURON_VIEW' && selectedNeuron && (
          <>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="font-semibold text-cyan-300">{selectedNeuron.label}</span>
          </>
        )}
      </div>

      {/* Main Workspace: Clean Left Guide/Experiment Panel + Unobstructed 3D Viewport */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {showInfoPanel && (
          <div className="absolute inset-y-0 left-0 z-20 w-80 max-w-[88vw] lg:static lg:w-84 lg:shrink-0">
            <ContextInfoPanel />
          </div>
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <ExplorationScene />
        </main>
      </div>

      <ResultsPanel />
    </div>
  );
}
