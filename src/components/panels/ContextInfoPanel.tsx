import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Info,
  Navigation,
  PanelLeftClose,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ILLUSTRATIVE_BRAIN_DISCLAIMER,
  NEURON_ANATOMY_PARTS,
} from '@/src/data/brainRegions';
import { getRegionById } from '@/src/exploration/ExplorationController';
import { useExplorationStore } from '@/src/store/explorationStore';
import { PanelHeading, StatusBadge } from '@/src/components/ui/InterfacePrimitives';

interface ParamSliderProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}

function ParamSlider({ label, value, unit, min, max, step, onChange }: ParamSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono-tabular text-cyan-300">
          {value.toFixed(step < 0.2 ? 2 : 1)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400"
      />
    </div>
  );
}

export function ContextInfoPanel() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const regions = useExplorationStore((s) => s.regions);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const hoveredRegionId = useExplorationStore((s) => s.hoveredRegionId);
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const selectedEdgeId = useExplorationStore((s) => s.selectedEdgeId);
  const selectedAnatomyPart = useExplorationStore((s) => s.selectedAnatomyPart);
  const neuronFiringLog = useExplorationStore((s) => s.neuronFiringLog);
  const signalStory = useExplorationStore((s) => s.signalStory);
  const networkSimResult = useExplorationStore((s) => s.networkSimResult);
  const lastSolverSource = useExplorationStore((s) => s.lastSolverSource);
  const isSimulating = useExplorationStore((s) => s.isSimulating);
  const isPlayingSignals = useExplorationStore((s) => s.isPlayingSignals);
  const playbackTimeMs = useExplorationStore((s) => s.playbackTimeMs);
  const lifParams = useExplorationStore((s) => s.lifParams);
  const experimentOpen = useExplorationStore((s) => s.experimentOpen);
  const showChartDrawer = useExplorationStore((s) => s.showChartDrawer);

  const [journeyOpen, setJourneyOpen] = useState(true);
  const [journeyTab, setJourneyTab] = useState<'spikes' | 'pathways'>('spikes');

  const selectRegion = useExplorationStore((s) => s.selectRegion);
  const setHoveredRegion = useExplorationStore((s) => s.setHoveredRegion);
  const selectAnatomyPart = useExplorationStore((s) => s.selectAnatomyPart);
  const zoomIntoSelectedNeuron = useExplorationStore((s) => s.zoomIntoSelectedNeuron);
  const returnToTissueView = useExplorationStore((s) => s.returnToTissueView);
  const sendSignalFromSelectedNeuron = useExplorationStore(
    (s) => s.sendSignalFromSelectedNeuron
  );
  const followNextSignalHop = useExplorationStore((s) => s.followNextSignalHop);
  const focusNeuronAtTime = useExplorationStore((s) => s.focusNeuronAtTime);
  const setPlayingSignals = useExplorationStore((s) => s.setPlayingSignals);
  const setPlaybackTimeMs = useExplorationStore((s) => s.setPlaybackTimeMs);
  const setExperimentOpen = useExplorationStore((s) => s.setExperimentOpen);
  const setShowChartDrawer = useExplorationStore((s) => s.setShowChartDrawer);
  const setShowInfoPanel = useExplorationStore((s) => s.setShowInfoPanel);
  const updateLifParam = useExplorationStore((s) => s.updateLifParam);
  const resetLifParams = useExplorationStore((s) => s.resetLifParams);
  const selectEdge = useExplorationStore((s) => s.selectEdge);
  const updateEdgeWeight = useExplorationStore((s) => s.updateEdgeWeight);
  const updateEdgeDelay = useExplorationStore((s) => s.updateEdgeDelay);
  const toggleEdgeEnabled = useExplorationStore((s) => s.toggleEdgeEnabled);
  const runNetworkSimulation = useExplorationStore((s) => s.runNetworkSimulation);
  const resetActiveNetwork = useExplorationStore((s) => s.resetActiveNetwork);

  const activeRegion = getRegionById(regions, hoveredRegionId ?? selectedRegionId);
  const selectedRegion = getRegionById(regions, selectedRegionId);
  const selectedNeuron =
    activeNetwork?.nodes.find((n) => n.id === selectedNeuronId) ?? null;
  const anatomyPart =
    NEURON_ANATOMY_PARTS.find((p) => p.id === selectedAnatomyPart) ??
    NEURON_ANATOMY_PARTS[1];

  const connectedEdges =
    activeNetwork && selectedNeuron
      ? activeNetwork.edges.filter(
          (e) => e.source === selectedNeuron.id || e.target === selectedNeuron.id
        )
      : [];
  const outgoingEdges = connectedEdges.filter(
    (e) => e.enabled && e.source === selectedNeuron?.id
  );
  const incomingEdges = connectedEdges.filter(
    (e) => e.enabled && e.target === selectedNeuron?.id
  );
  const activeEdge =
    connectedEdges.find((e) => e.id === selectedEdgeId) ?? outgoingEdges[0] ?? connectedEdges[0] ?? null;

  return (
    <aside className="nv-context-panel nv-scroll flex h-full w-full flex-col gap-4 overflow-y-auto p-4 text-slate-200">
      {/* WHOLE BRAIN VIEW */}
      {explorationState === 'BRAIN_VIEW' && (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <PanelHeading eyebrow="Exploration level 01" title="Whole brain atlas" />
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Spin and zoom the 3D brain, then pick a region to fly inside its branching neural
                tissue.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoPanel(false)}
              className="mt-0.5 rounded-lg border border-slate-700/50 bg-slate-800/40 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors shrink-0"
              title="Hide guide panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {regions.map((region) => {
              const isActive = (hoveredRegionId ?? selectedRegionId) === region.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => selectRegion(region.id)}
                  className={`nv-region-card group flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                    isActive
                      ? 'border-cyan-400/60 bg-cyan-400/12 text-cyan-100 shadow-[inset_3px_0_0_#22d3ee]'
                      : 'border-slate-700/50 bg-slate-900/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: region.accent_color }}
                      />
                      <span className="font-semibold text-slate-100">{region.name}</span>
                      <span className="ml-auto text-[10px] font-mono-tabular text-slate-500 uppercase tracking-wider">{region.short_label}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-400 group-hover:text-slate-300">
                      {region.subtitle}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300" />
                </button>
              );
            })}
          </div>

          {activeRegion && (
            <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
              <h3 className="font-display text-sm font-semibold text-cyan-300">
                {activeRegion.name}
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                {activeRegion.simple_summary}
              </p>
            </div>
          )}

          <div className="nv-surface mt-auto rounded-xl p-3 text-[11px] leading-relaxed text-slate-400">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <span>{ILLUSTRATIVE_BRAIN_DISCLAIMER}</span>
            </div>
          </div>
        </>
      )}

      {/* DENSE NEURAL TISSUE & INDIVIDUAL NEURON EXPLORATION */}
      {explorationState !== 'BRAIN_VIEW' && selectedRegion && (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="nv-eyebrow mb-0">Exploration level {explorationState === 'NEURON_VIEW' ? '03' : '02'}</span>
                <StatusBadge tone={explorationState === 'NEURON_VIEW' ? 'violet' : 'cyan'}>{explorationState === 'NEURON_VIEW' ? 'Neuron focus' : 'Tissue map'}</StatusBadge>
              </div>
              <div className="text-[11px] text-cyan-400">
                {selectedRegion.name} ·{' '}
                {activeNetwork ? `${activeNetwork.nodes.length} neurons` : 'Tissue'}
              </div>
              <h2 className="mt-0.5 font-display text-base font-semibold text-slate-100">
                {explorationState === 'NEURON_VIEW' && selectedNeuron
                  ? `${selectedNeuron.label} Close-Up`
                  : 'Neural Tissue Environment'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {explorationState === 'NEURON_VIEW'
                  ? 'Click any part of this cell—dendrites, soma, axon, myelin, terminals, or synapse—to learn what it does.'
                  : 'Click any branching neuron in the 3D tissue to inspect its connections and send a real electrical signal.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoPanel(false)}
              className="mt-0.5 rounded-lg border border-slate-700/50 bg-slate-800/40 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors shrink-0"
              title="Hide guide panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* Selected Neuron Card (Beginner-Friendly Primary Actions) */}
          {selectedNeuron && (
            <div className="nv-surface space-y-3 rounded-xl p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-sm font-semibold text-slate-100">
                    {selectedNeuron.label}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedNeuron.role === 'inhibitory'
                      ? 'Inhibitory cell (quiets neighbors)'
                      : 'Excitatory cell (activates neighbors)'}
                    {' · '}
                    {incomingEdges.length} in / {outgoingEdges.length} out
                  </div>
                </div>

                {explorationState === 'NEURON_VIEW' ? (
                  <button
                    type="button"
                    onClick={returnToTissueView}
                    className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800 whitespace-nowrap"
                  >
                    <ZoomOut className="h-3 w-3" />
                    Tissue View
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={zoomIntoSelectedNeuron}
                    className="flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20 whitespace-nowrap"
                  >
                    <ZoomIn className="h-3 w-3" />
                    Zoom Closer
                  </button>
                )}
              </div>

              {/* Primary Beginner Action: Send Signal */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => void sendSignalFromSelectedNeuron()}
                    className="nv-signal-action flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {isSimulating ? 'Calculating Signal...' : 'Send Signal'}
                </button>

                {networkSimResult && signalStory.length > 0 && (
                  <button
                    type="button"
                    onClick={followNextSignalHop}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/45 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/25 transition-colors"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Follow Signal to Next Neuron
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Plain-English Signal Narrative, Chronological Firing Log & Playback Controls */}
          {networkSimResult && (
            <div className="nv-surface space-y-2.5 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setJourneyOpen(!journeyOpen)}
                  className="flex items-center gap-1 font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {journeyOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <span>Signal Journey</span>
                </button>
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  {networkSimResult.total_spikes}{' '}
                  {networkSimResult.total_spikes === 1 ? 'spike' : 'spikes'} ·{' '}
                  {lastSolverSource === 'fastapi-python' ? 'Python LIF' : 'Local TS LIF'}
                </span>
              </div>

              {networkSimResult.total_spikes > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlayingSignals && playbackTimeMs >= lifParams.duration_ms - 0.05) {
                        setPlaybackTimeMs(0);
                      }
                      setPlayingSignals(!isPlayingSignals);
                    }}
                    className="flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 whitespace-nowrap"
                  >
                    {isPlayingSignals ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    {isPlayingSignals
                      ? 'Pause'
                      : playbackTimeMs >= lifParams.duration_ms - 0.05
                        ? 'Replay'
                        : 'Play'}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={lifParams.duration_ms}
                    step={0.25}
                    value={Math.min(playbackTimeMs, lifParams.duration_ms)}
                    onChange={(e) => {
                      setPlayingSignals(false);
                      setPlaybackTimeMs(parseFloat(e.target.value));
                    }}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400"
                  />
                  <span className="font-mono-tabular text-[11px] text-slate-400 whitespace-nowrap">
                    {playbackTimeMs.toFixed(1)} ms
                  </span>
                </div>
              )}

              {journeyOpen && (
                <>
                  {networkSimResult.total_spikes > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-800 bg-[#060911]/70 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setJourneyTab('spikes')}
                          className={`rounded py-1 font-medium transition-colors ${
                            journeyTab === 'spikes'
                              ? 'bg-cyan-500/20 text-cyan-200'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Firing Log ({neuronFiringLog.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setJourneyTab('pathways')}
                          className={`rounded py-1 font-medium transition-colors ${
                            journeyTab === 'pathways'
                              ? 'bg-violet-500/20 text-violet-200'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Pathways ({signalStory.length})
                        </button>
                      </div>

                      {journeyTab === 'spikes' ? (
                        <div className="nv-scroll max-h-36 space-y-1 overflow-y-auto pr-1 text-[11px]">
                          {neuronFiringLog.map((ev) => (
                            <button
                              key={`${ev.nodeId}-${ev.spikeOrdinal}-${ev.spikeTimeMs}`}
                              type="button"
                              onClick={() => focusNeuronAtTime(ev.nodeId, ev.spikeTimeMs)}
                              className="flex w-full items-center justify-between rounded border border-slate-800/80 bg-[#060911]/75 px-2.5 py-1.5 text-left text-slate-200 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-colors"
                            >
                              <span className="truncate">
                                <span className="font-medium text-cyan-200">{ev.label}</span>
                                <span className="text-slate-400">
                                  {' '}
                                  · spike #{ev.spikeOrdinal}
                                  {ev.outgoingCount === 0 ? ' (terminal)' : ''}
                                </span>
                              </span>
                              <span className="ml-2 shrink-0 font-mono-tabular text-amber-300">
                                {ev.spikeTimeMs.toFixed(1)} ms
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : signalStory.length > 0 ? (
                        <div className="nv-scroll max-h-36 space-y-1.5 overflow-y-auto pr-1 text-[11px] leading-relaxed text-slate-300">
                          {signalStory.map((step, idx) => (
                            <button
                              key={`${step.edgeId}-${step.fireTimeMs}-${idx}`}
                              type="button"
                              onClick={() =>
                                focusNeuronAtTime(step.targetId, step.fireTimeMs, step.edgeId)
                              }
                              className="block w-full rounded border border-slate-800/80 bg-[#060911]/75 px-2.5 py-1.5 text-left hover:border-violet-500/40 hover:bg-slate-900/90 transition-colors"
                            >
                              {step.summary}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          {selectedNeuron?.label ?? 'This neuron'} fired, and it has no active
                          outgoing synapses to pass the signal onward.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      The signal did not reach firing threshold with the current input strength. Try
                      increasing Input Current inside Experiment.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Beginner Neuron Parts Guide */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-200">Anatomy reference</div>
              <span className="text-[10px] uppercase tracking-[.12em] text-slate-500">Interactive key</span>
            </div>
            <div className="flex gap-1" aria-label="Neuron anatomy color key">
              {NEURON_ANATOMY_PARTS.map((part) => (
                <span key={part.id} title={part.name} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: part.accent_color }} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {NEURON_ANATOMY_PARTS.map((part) => {
                const active = selectedAnatomyPart === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => selectAnatomyPart(part.id)}
                    className={`rounded border px-2 py-1 text-[11px] font-medium truncate transition-colors ${
                      active
                        ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {part.name}
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-slate-700/60 bg-[#070b16]/65 p-2.5 text-xs">
              <div className="font-medium text-cyan-300">{anatomyPart.name}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                {anatomyPart.simple_explanation}
              </p>
            </div>
          </div>

          {/* Progressive Disclosure: Optional Expandable "Experiment" Controls */}
          <div className="border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={() => setExperimentOpen(!experimentOpen)}
              className="nv-action flex w-full items-center justify-between border-slate-700/55 bg-slate-900/45 px-3 py-2 text-xs font-medium text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-violet-300" />
                Experiment (Scientific Controls)
              </span>
              {experimentOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {experimentOpen && (
              <div className="mt-3 space-y-3 rounded-xl border border-violet-500/20 bg-[#070b16]/82 p-3">
                <div className="text-[11px] text-slate-400">
                  LIF Equation: <span className="font-mono-tabular text-cyan-300">C_m·dV/dt = -(V-V_rest)/R_m + I</span>
                </div>

                <ParamSlider
                  label="Input Current I(t)"
                  value={lifParams.input_current_na}
                  unit="nA"
                  min={0.5}
                  max={6.0}
                  step={0.1}
                  onChange={(v) => updateLifParam('input_current_na', v)}
                />
                <ParamSlider
                  label="Membrane Threshold V_th"
                  value={lifParams.v_threshold_mv}
                  unit="mV"
                  min={-65}
                  max={-40}
                  step={0.5}
                  onChange={(v) => updateLifParam('v_threshold_mv', v)}
                />
                <ParamSlider
                  label="Membrane Resistance R_m"
                  value={lifParams.membrane_resistance_mohm}
                  unit="MΩ"
                  min={4}
                  max={25}
                  step={0.5}
                  onChange={(v) => updateLifParam('membrane_resistance_mohm', v)}
                />
                <ParamSlider
                  label="Membrane Capacitance C_m"
                  value={lifParams.membrane_capacitance_nf}
                  unit="nF"
                  min={0.4}
                  max={3.0}
                  step={0.1}
                  onChange={(v) => updateLifParam('membrane_capacitance_nf', v)}
                />
                <ParamSlider
                  label="Refractory Period"
                  value={lifParams.refractory_period_ms}
                  unit="ms"
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) => updateLifParam('refractory_period_ms', v)}
                />

                {connectedEdges.length > 0 && activeEdge && (
                  <div className="space-y-2.5 border-t border-slate-800 pt-2.5">
                    <div className="text-[11px] font-medium text-slate-300">
                      Connected Synapse
                    </div>
                    <select
                      value={activeEdge.id}
                      onChange={(e) => selectEdge(e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
                    >
                      {connectedEdges.map((edge) => (
                        <option key={edge.id} value={edge.id}>
                          {edge.source} → {edge.target} ({edge.enabled ? `w=${edge.weight}` : 'off'})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Synapse Active</span>
                      <button
                        type="button"
                        onClick={() => toggleEdgeEnabled(activeEdge.id)}
                        className={`rounded px-2 py-0.5 font-medium ${
                          activeEdge.enabled
                            ? 'bg-cyan-500/20 text-cyan-200'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {activeEdge.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <ParamSlider
                      label="Synaptic Weight"
                      value={activeEdge.weight}
                      unit="nA"
                      min={-5}
                      max={6}
                      step={0.1}
                      onChange={(v) => updateEdgeWeight(activeEdge.id, v)}
                    />
                    <ParamSlider
                      label="Transmission Delay"
                      value={activeEdge.delay_ms}
                      unit="ms"
                      min={0.5}
                      max={10}
                      step={0.5}
                      onChange={(v) => updateEdgeDelay(activeEdge.id, v)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void runNetworkSimulation()}
                    className="rounded border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/25"
                  >
                    Re-Run Solver
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChartDrawer(!showChartDrawer)}
                    className="flex items-center justify-center gap-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
                  >
                    <Activity className="h-3 w-3" />
                    {showChartDrawer ? 'Hide Graph' : 'Voltage Graph'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={resetLifParams}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Params
                  </button>
                  <button
                    type="button"
                    onClick={resetActiveNetwork}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Reset Tissue
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5 text-[11px] leading-relaxed text-slate-400">
            {activeNetwork?.model_note}
          </div>
        </>
      )}
    </aside>
  );
}
