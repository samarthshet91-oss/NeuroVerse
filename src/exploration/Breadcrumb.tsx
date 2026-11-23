import { Eye, EyeOff, Gauge, PanelLeft, RotateCcw } from 'lucide-react';
import { useExplorationStore } from '@/src/store/explorationStore';
import type { TissueDensity } from '@/src/types/neuroverse';

const DENSITY_OPTIONS: { value: TissueDensity; label: string }[] = [
  { value: 70, label: '70 cells' },
  { value: 110, label: '110 cells' },
  { value: 140, label: '140 cells' },
];

export function Breadcrumb() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const backendState = useExplorationStore((s) => s.backendState);
  const lastSolverSource = useExplorationStore((s) => s.lastSolverSource);
  const tissueDensity = useExplorationStore((s) => s.tissueDensity);
  const reducedQuality = useExplorationStore((s) => s.reducedQuality);
  const showLabels = useExplorationStore((s) => s.showLabels);
  const showInfoPanel = useExplorationStore((s) => s.showInfoPanel);

  const setTissueDensity = useExplorationStore((s) => s.setTissueDensity);
  const triggerCameraReset = useExplorationStore((s) => s.triggerCameraReset);
  const toggleReducedQuality = useExplorationStore((s) => s.toggleReducedQuality);
  const toggleLabels = useExplorationStore((s) => s.toggleLabels);
  const setShowInfoPanel = useExplorationStore((s) => s.setShowInfoPanel);
  const initializeBackend = useExplorationStore((s) => s.initializeBackend);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 bg-[#090f1d]/90 px-4 py-1.5 text-xs">
      {/* Left: Solver & Illustrative Context */}
      <div className="flex items-center gap-3 overflow-x-auto text-[11px] text-slate-400">
        <button
          type="button"
          onClick={() => void initializeBackend()}
          title="Check FastAPI simulation backend"
          className="whitespace-nowrap shrink-0 hover:text-slate-200 transition-colors"
        >
          {backendState === 'online' ? (
            <span className="text-emerald-400">Python Backend Ready</span>
          ) : backendState === 'checking' ? (
            <span className="text-slate-300">Checking Solver...</span>
          ) : (
            <span className="text-cyan-300">
              {lastSolverSource === 'fastapi-python'
                ? 'Python Backend'
                : 'Local Browser Solver Active'}
            </span>
          )}
        </button>

        <span className="text-slate-700" aria-hidden="true">
          ·
        </span>

        <span className="whitespace-nowrap shrink-0 text-slate-400">
          Illustrative Procedural Model
        </span>
      </div>

      {/* Right: Density, Camera, Labels, Quality, Panel Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {explorationState !== 'BRAIN_VIEW' && (
          <div className="hidden md:flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900/70 p-0.5">
            {DENSITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTissueDensity(opt.value)}
                className={`rounded px-2 py-0.5 text-[11px] font-mono-tabular whitespace-nowrap transition-colors ${
                  tissueDensity === opt.value
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={triggerCameraReset}
          className="flex items-center gap-1 rounded px-2 py-1 text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors whitespace-nowrap shrink-0"
          title="Recenter 3D camera"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Recenter</span>
        </button>

        <button
          type="button"
          onClick={toggleLabels}
          className="flex items-center gap-1 rounded px-2 py-1 text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors whitespace-nowrap shrink-0"
          title="Toggle 3D labels"
        >
          {showLabels ? (
            <Eye className="h-3.5 w-3.5 text-cyan-400" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Labels</span>
        </button>

        <button
          type="button"
          onClick={toggleReducedQuality}
          className={`flex items-center gap-1 rounded px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
            reducedQuality
              ? 'bg-amber-500/15 text-amber-200'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
          title="Toggle reduced-quality mode for modest laptops"
        >
          <Gauge className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{reducedQuality ? 'Low GPU' : 'Standard'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowInfoPanel(!showInfoPanel)}
          className={`flex items-center gap-1 rounded px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
            showInfoPanel ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle guide panel"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
