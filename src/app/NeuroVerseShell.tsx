import { useEffect } from 'react';
import { TopNavBar } from '@/src/components/navigation/TopNavBar';
import { ContextInfoPanel } from '@/src/components/panels/ContextInfoPanel';
import { Breadcrumb } from '@/src/exploration/Breadcrumb';
import { ExplorationScene } from '@/src/exploration/ExplorationScene';
import { ResultsPanel } from '@/src/simulation/ResultsPanel';
import { ViewportHud } from '@/src/components/hud/ViewportHud';
import { useExplorationStore } from '@/src/store/explorationStore';

export function NeuroVerseShell() {
  const initializeBackend = useExplorationStore((s) => s.initializeBackend);
  const showInfoPanel = useExplorationStore((s) => s.showInfoPanel);
  const explorationState = useExplorationStore((s) => s.explorationState);

  useEffect(() => {
    void initializeBackend();
  }, [initializeBackend]);

  return (
    <div className={`nv-shell nv-mode-${explorationState.toLowerCase()} flex h-screen w-screen flex-col overflow-hidden text-slate-100`}>
      <TopNavBar />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <main className="absolute inset-0 overflow-hidden">
          <ExplorationScene />
        </main>
        <div className="absolute left-3 right-3 top-3 z-30 sm:left-auto sm:right-4 sm:top-4">
          <Breadcrumb />
        </div>
        <ViewportHud />
        {showInfoPanel && (
          <div className="nv-context-float absolute bottom-4 left-3 top-16 z-20 w-[21rem] max-w-[calc(100vw-1.5rem)] sm:left-4 sm:top-4 lg:top-4">
            <ContextInfoPanel />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <ResultsPanel />
        </div>
      </div>
    </div>
  );
}
