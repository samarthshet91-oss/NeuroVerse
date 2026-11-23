import { Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useExplorationStore } from '@/src/store/explorationStore';

interface SliderRowProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}

function SliderRow({ label, value, unit, min, max, step, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
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

export function SimulationControls() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const selectedRegionId = useExplorationStore((s) => s.selectedRegionId);
  const activeNetwork = useExplorationStore((s) => s.activeNetwork);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const selectedEdgeId = useExplorationStore((s) => s.selectedEdgeId);
  const externalInputsNa = useExplorationStore((s) => s.externalInputsNa);
  const lifParams = useExplorationStore((s) => s.lifParams);
  const isSimulating = useExplorationStore((s) => s.isSimulating);
  const networkSimResult = useExplorationStore((s) => s.networkSimResult);
  const isPlayingSignals = useExplorationStore((s) => s.isPlayingSignals);
  const playbackTimeMs = useExplorationStore((s) => s.playbackTimeMs);

  const zoomIntoSelectedNeuron = useExplorationStore((s) => s.zoomIntoSelectedNeuron);
  const sendSignalFromSelectedNeuron = useExplorationStore(
    (s) => s.sendSignalFromSelectedNeuron
  );
  const updateLifParam = useExplorationStore((s) => s.updateLifParam);
  const resetLifParams = useExplorationStore((s) => s.resetLifParams);
  const pinCurrentAsBaseline = useExplorationStore((s) => s.pinCurrentAsBaseline);
  const runNeuronSimulation = useExplorationStore((s) => s.runNeuronSimulation);
  const runCompareSimulation = useExplorationStore((s) => s.runCompareSimulation);
  const runNetworkSimulation = useExplorationStore((s) => s.runNetworkSimulation);
  const updateNodeExternalInput = useExplorationStore((s) => s.updateNodeExternalInput);
  const updateEdgeWeight = useExplorationStore((s) => s.updateEdgeWeight);
  const updateEdgeDelay = useExplorationStore((s) => s.updateEdgeDelay);
  const toggleEdgeEnabled = useExplorationStore((s) => s.toggleEdgeEnabled);
  const selectEdge = useExplorationStore((s) => s.selectEdge);
  const resetActiveNetwork = useExplorationStore((s) => s.resetActiveNetwork);
  const setPlayingSignals = useExplorationStore((s) => s.setPlayingSignals);
  const setPlaybackTimeMs = useExplorationStore((s) => s.setPlaybackTimeMs);

  const selectedNeuron =
    activeNetwork?.nodes.find((n) => n.id === selectedNeuronId) ?? null;
  const selectedEdge =
    activeNetwork?.edges.find((e) => e.id === selectedEdgeId) ??
    activeNetwork?.edges[0] ??
    null;

  return (
    <aside className="nv-scroll flex h-full w-full flex-col gap-5 overflow-y-auto border-l border-slate-800/80 bg-[#0a101f]/94 p-4 text-slate-200">
      {/* BRAIN_VIEW / REGION_VIEW quick guidance */}
      {(explorationState === 'BRAIN_VIEW' || explorationState === 'REGION_VIEW') && (
        <>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Exploration Controls
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {explorationState === 'BRAIN_VIEW'
                ? 'Choose a cerebral lobe, cerebellum, or brainstem to enter its branching neural tissue.'
                : 'Select any neuron in the 3D tissue to inspect its biological structure or send a signal.'}
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs">
            <div className="font-medium text-slate-200">Progressive Workflow</div>
            <ol className="space-y-1.5 text-[11px] text-slate-400">
              <li>1. Select a brain region from the 3D markers</li>
              <li>2. Explore branching neurons &amp; synapses</li>
              <li>3. Zoom into an individual neuron</li>
              <li>4. Send &amp; follow a simulated LIF signal</li>
            </ol>
          </div>

          <div className="mt-auto space-y-2">
            <button
              type="button"
              onClick={zoomIntoSelectedNeuron}
              className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              {selectedRegionId ? 'Zoom Into Selected Neuron' : 'Select a Region First'}
            </button>
            <button
              type="button"
              onClick={() => void sendSignalFromSelectedNeuron()}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Send Signal
            </button>
          </div>
        </>
      )}

      {/* NEURON_VIEW controls */}
      {explorationState === 'NEURON_VIEW' && (
        <>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              LIF Simulation Parameters
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configure biophysical constants for the FastAPI Forward Euler solver.
            </p>
          </div>

          <div className="space-y-3.5">
            <SliderRow
              label="Input Current I(t)"
              value={lifParams.input_current_na}
              unit="nA"
              min={0}
              max={6}
              step={0.1}
              onChange={(v) => updateLifParam('input_current_na', v)}
            />
            <SliderRow
              label="Firing Threshold V_th"
              value={lifParams.v_threshold_mv}
              unit="mV"
              min={-65}
              max={-40}
              step={0.5}
              onChange={(v) => updateLifParam('v_threshold_mv', v)}
            />
            <SliderRow
              label="Refractory Period"
              value={lifParams.refractory_period_ms}
              unit="ms"
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateLifParam('refractory_period_ms', v)}
            />
            <SliderRow
              label="Membrane Capacitance C_m"
              value={lifParams.membrane_capacitance_nf}
              unit="nF"
              min={0.4}
              max={3.0}
              step={0.1}
              onChange={(v) => updateLifParam('membrane_capacitance_nf', v)}
            />
            <SliderRow
              label="Membrane Resistance R_m"
              value={lifParams.membrane_resistance_mohm}
              unit="MΩ"
              min={4}
              max={25}
              step={0.5}
              onChange={(v) => updateLifParam('membrane_resistance_mohm', v)}
            />
            <SliderRow
              label="Simulation Duration"
              value={lifParams.duration_ms}
              unit="ms"
              min={40}
              max={250}
              step={10}
              onChange={(v) => updateLifParam('duration_ms', v)}
            />
            <SliderRow
              label="Timestep dt"
              value={lifParams.dt_ms}
              unit="ms"
              min={0.05}
              max={1.0}
              step={0.05}
              onChange={(v) => updateLifParam('dt_ms', v)}
            />
          </div>

          <div className="mt-auto space-y-2 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => void runNeuronSimulation()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              {isSimulating ? 'Solving LIF ODE...' : 'Run LIF Simulation'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={pinCurrentAsBaseline}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Pin Baseline
              </button>
              <button
                type="button"
                disabled={isSimulating}
                onClick={() => void runCompareSimulation()}
                className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 hover:bg-violet-500/25 disabled:opacity-50 transition-colors"
              >
                Compare vs Base
              </button>
            </div>

            <button
              type="button"
              onClick={resetLifParams}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-[11px] text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Parameters
            </button>
          </div>
        </>
      )}

      {/* NETWORK_SIMULATION controls */}
      {explorationState === 'NETWORK_SIMULATION' && activeNetwork && (
        <>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Network Controls
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Adjust external input drives and synaptic weights, then run the event-driven solver.
            </p>
          </div>

          {/* Selected neuron external drive */}
          {selectedNeuron && (
            <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-900/55 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-cyan-200">{selectedNeuron.label}</span>
                <span className="font-mono-tabular text-[11px] text-slate-400">
                  {selectedNeuron.role}
                </span>
              </div>
              <SliderRow
                label="External Input I_ext"
                value={externalInputsNa[selectedNeuron.id] ?? selectedNeuron.baseline_input_na}
                unit="nA"
                min={0}
                max={6}
                step={0.1}
                onChange={(v) => updateNodeExternalInput(selectedNeuron.id, v)}
              />
            </div>
          )}

          {/* Synapse selector + weight/delay/toggle */}
          <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-900/55 p-3">
            <div className="text-xs font-medium text-slate-200">Synaptic Connection</div>
            <select
              value={selectedEdge?.id ?? ''}
              onChange={(e) => selectEdge(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-[#060911] px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            >
              {activeNetwork.edges.map((edge) => (
                <option key={edge.id} value={edge.id}>
                  {edge.source} → {edge.target} ({edge.enabled ? `w=${edge.weight}` : 'disabled'})
                </option>
              ))}
            </select>

            {selectedEdge && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Connection Active</span>
                  <button
                    type="button"
                    onClick={() => toggleEdgeEnabled(selectedEdge.id)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      selectedEdge.enabled
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {selectedEdge.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <SliderRow
                  label="Weight (w)"
                  value={selectedEdge.weight}
                  unit="nA"
                  min={-5}
                  max={6}
                  step={0.1}
                  onChange={(v) => updateEdgeWeight(selectedEdge.id, v)}
                />

                <SliderRow
                  label="Conduction Delay"
                  value={selectedEdge.delay_ms}
                  unit="ms"
                  min={0.5}
                  max={10}
                  step={0.5}
                  onChange={(v) => updateEdgeDelay(selectedEdge.id, v)}
                />
              </div>
            )}
          </div>

          {/* Playback scrubber when backend spike events exist */}
          {networkSimResult && (
            <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-violet-200">Signal Playback</span>
                <span className="font-mono-tabular text-[11px] text-violet-200">
                  {playbackTimeMs.toFixed(1)} / {lifParams.duration_ms.toFixed(0)} ms
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={lifParams.duration_ms}
                step={0.5}
                value={playbackTimeMs}
                onChange={(e) => {
                  setPlayingSignals(false);
                  setPlaybackTimeMs(parseFloat(e.target.value));
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-violet-400"
              />
              <button
                type="button"
                onClick={() => setPlayingSignals(!isPlayingSignals)}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-violet-500/25 px-2.5 py-1.5 text-[11px] font-medium text-violet-100 hover:bg-violet-500/35"
              >
                {isPlayingSignals ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isPlayingSignals ? 'Pause Propagation' : 'Play Spike Propagation'}
              </button>
            </div>
          )}

          <div className="mt-auto space-y-2 border-t border-slate-800/80 pt-3">
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => void runNetworkSimulation()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isSimulating ? 'Simulating Network...' : 'Run Network Simulation'}
            </button>
            <button
              type="button"
              onClick={resetActiveNetwork}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-[11px] text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Circuit
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
