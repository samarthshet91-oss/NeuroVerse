import { Eye, EyeOff, Gauge, PanelLeft, RotateCcw } from 'lucide-react';
import { StatusBadge } from '@/src/components/ui/InterfacePrimitives';
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

  const solver = backendState === 'online'
    ? <StatusBadge tone="emerald">Solver online</StatusBadge>
    : backendState === 'checking'
      ? <StatusBadge tone="slate">Checking solver</StatusBadge>
      : <StatusBadge tone="amber">{lastSolverSource === 'fastapi-python' ? 'Python solver' : 'Local solver'}</StatusBadge>;

  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-slate-700/35 bg-[#0b1120]/80 px-3 py-1.5 text-xs backdrop-blur-xl sm:px-4">
      <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-slate-400">
        <button type="button" onClick={() => void initializeBackend()} title="Check simulation backend" className="nv-action border-transparent px-1 py-0.5">
          {solver}
        </button>
        <span className="hidden whitespace-nowrap text-slate-500 lg:inline">Illustrative procedural model · live exploration workspace</span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {explorationState !== 'BRAIN_VIEW' && (
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-950/35 p-0.5">
            {DENSITY_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setTissueDensity(opt.value)} className={`rounded-md px-2 py-1 text-[10px] font-mono-tabular whitespace-nowrap transition-colors ${tissueDensity === opt.value ? 'bg-cyan-400/15 text-cyan-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={triggerCameraReset} className="nv-action flex items-center gap-1 border-transparent px-2 py-1 text-slate-300 whitespace-nowrap shrink-0" title="Recenter 3D camera">
          <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Recenter</span>
        </button>
        <button type="button" onClick={toggleLabels} className="nv-action flex items-center gap-1 border-transparent px-2 py-1 text-slate-300 whitespace-nowrap shrink-0" title="Toggle 3D labels">
          {showLabels ? <Eye className="h-3.5 w-3.5 text-cyan-400" /> : <EyeOff className="h-3.5 w-3.5" />}<span className="hidden sm:inline">Labels</span>
        </button>
        <button type="button" onClick={toggleReducedQuality} className={`nv-action flex items-center gap-1 border-transparent px-2 py-1 whitespace-nowrap shrink-0 ${reducedQuality ? 'bg-amber-500/15 text-amber-200' : 'text-slate-300'}`} title="Toggle reduced-quality mode for modest laptops">
          <Gauge className="h-3.5 w-3.5" /><span className="hidden sm:inline">{reducedQuality ? 'Low GPU' : 'Standard'}</span>
        </button>
        <button type="button" onClick={() => setShowInfoPanel(!showInfoPanel)} className={`nv-action flex items-center gap-1 px-2 py-1 whitespace-nowrap shrink-0 ${showInfoPanel ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' : 'border-transparent text-slate-400'}`} title="Toggle guide panel">
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
