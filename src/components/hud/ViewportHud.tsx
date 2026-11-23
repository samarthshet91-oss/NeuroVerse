import { Activity, Crosshair, Layers3, Microscope, ScanLine, Waves } from 'lucide-react';
import { motion } from 'motion/react';
import { getRegionById } from '@/src/exploration/ExplorationController';
import { useExplorationStore } from '@/src/store/explorationStore';
import { StatusBadge } from '@/src/components/ui/InterfacePrimitives';

export function ViewportHud() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const regions = useExplorationStore((s) => s.regions);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const networkSimResult = useExplorationStore((s) => s.networkSimResult);
  const selectedRegion = getRegionById(regions, selectedRegionId);
  const selectedNeuron = activeNetwork?.nodes.find((node) => node.id === selectedNeuronId);

  const mode = explorationState === 'BRAIN_VIEW'
    ? { label: 'Macroscopic atlas', icon: Layers3, tone: 'cyan' as const, detail: '06 selectable regions' }
    : explorationState === 'NEURON_VIEW'
      ? { label: 'Cellular close-up', icon: Microscope, tone: 'violet' as const, detail: selectedNeuron?.label ?? 'Neuron focus' }
      : { label: 'Neural tissue field', icon: ScanLine, tone: 'cyan' as const, detail: `${activeNetwork?.nodes.length ?? 0} modeled neurons` };
  const ModeIcon = mode.icon;

  return (
    <motion.div
      key={explorationState}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="pointer-events-none absolute right-4 top-4 z-10 hidden w-56 lg:block"
    >
      <div className="nv-hud-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#55c9d6]/20 bg-[#55c9d6]/8 text-[#80dde6]">
            <ModeIcon className="h-4 w-4" />
          </div>
          <StatusBadge tone={mode.tone}>{explorationState.replace('_', ' ').toLowerCase()}</StatusBadge>
        </div>
        <div className="mt-3 text-xs font-semibold text-[#E5EAF2]">{mode.label}</div>
        <div className="mt-1 text-[10px] text-[#9AA9BC]">{mode.detail}</div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-400/10 pt-2 text-[10px] text-[#9AA9BC]">
          {explorationState === 'BRAIN_VIEW' ? <Crosshair className="h-3 w-3 text-[#55c9d6]" /> : networkSimResult ? <Activity className="h-3 w-3 text-[#D9A15F]" /> : <Waves className="h-3 w-3 text-[#8273B5]" />}
          {explorationState === 'BRAIN_VIEW' ? 'Spatial region targeting online' : selectedRegion?.name ?? 'Procedural neural model'}
        </div>
      </div>
    </motion.div>
  );
}
