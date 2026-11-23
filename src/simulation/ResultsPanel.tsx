import { Activity, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/src/components/ui/InterfacePrimitives';
import { MembraneChart } from '@/src/components/charts/MembraneChart';
import { useExplorationStore } from '@/src/store/explorationStore';

export function ResultsPanel() {
  const explorationState = useExplorationStore((s) => s.explorationState);
  const showChartDrawer = useExplorationStore((s) => s.showChartDrawer);
  const setShowChartDrawer = useExplorationStore((s) => s.setShowChartDrawer);
  const isSimulating = useExplorationStore((s) => s.isSimulating);
  const simError = useExplorationStore((s) => s.simError);
  const neuronSimResult = useExplorationStore((s) => s.neuronSimResult);
  const compareSimResult = useExplorationStore((s) => s.compareSimResult);
  const networkSimResult = useExplorationStore((s) => s.networkSimResult);
  const selectedNeuronId = useExplorationStore((s) => s.selectedNeuronId);
  const lastSolverSource = useExplorationStore((s) => s.lastSolverSource);
  const lifParams = useExplorationStore((s) => s.lifParams);

  if (explorationState === 'BRAIN_VIEW') {
    return null;
  }

  // Only show the bottom chart drawer if opened from Experiment or actively simulating/errored
  if (!showChartDrawer && !simError) {
    return null;
  }

  // Show the stimulated neuron + up to 4 most active downstream neurons in the network chart
  const focusedNetworkResult = (() => {
    if (!networkSimResult) return null;
    const activeNodes = networkSimResult.node_metrics
      .filter((m) => m.spike_count > 0 || m.node_id === selectedNeuronId)
      .slice(0, 5);
    const traces: Record<string, number[]> = {};
    for (const m of activeNodes) {
      if (networkSimResult.membrane_traces_mv[m.node_id]) {
        traces[m.label] = networkSimResult.membrane_traces_mv[m.node_id];
      }
    }
    return {
      ...networkSimResult,
      membrane_traces_mv: traces,
      activeMetrics: activeNodes,
    };
  })();

  return (
    <section className="border-t border-slate-700/50 bg-[#0b1120]/96 text-slate-200 shadow-[0_-18px_40px_rgba(0,0,0,.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setShowChartDrawer(!showChartDrawer)}
          className="group flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-cyan-300 transition-colors"
        >
          {showChartDrawer ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          <span>Membrane potential</span>
          {lastSolverSource && (
            <span className="hidden font-mono-tabular text-[10px] text-cyan-300 sm:inline">· {lastSolverSource === 'fastapi-python' ? 'Python FastAPI' : 'Local TypeScript LIF'}</span>
          )}
        </button>

        {isSimulating && (
          <div className="flex items-center gap-1.5 text-xs text-cyan-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Solving LIF equations...</span>
          </div>
        )}
      </div>

      {showChartDrawer && (
        <div className="border-t border-slate-700/45 px-4 py-3">
          {simError && (
            <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {simError}
            </div>
          )}

          {focusedNetworkResult && Object.keys(focusedNetworkResult.membrane_traces_mv).length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="rounded-xl border border-slate-700/50 bg-[#070b16]/65 p-2.5 lg:col-span-8">
                <MembraneChart
                  mode="network"
                  neuronResult={null}
                  compareResult={null}
                  networkResult={focusedNetworkResult}
                  vThresholdMv={lifParams.v_threshold_mv}
                />
              </div>
              <div className="nv-scroll max-h-[180px] overflow-y-auto rounded-xl border border-slate-700/50 bg-[#070b16]/50 p-2.5 lg:col-span-4">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[11px] text-slate-400">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Neuron</th>
                      <th className="py-1 pr-2 font-medium">Spikes</th>
                      <th className="py-1 font-medium">1st Spike</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-tabular text-[11px]">
                    {focusedNetworkResult.activeMetrics.map((m) => (
                      <tr key={m.node_id}>
                        <td className="py-1.5 pr-2 font-sans text-slate-200">{m.label}</td>
                        <td className="py-1.5 pr-2 text-cyan-300">{m.spike_count}</td>
                        <td className="py-1.5 text-slate-400">
                          {m.first_spike_ms !== null ? `${m.first_spike_ms} ms` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : neuronSimResult ? (
            <MembraneChart
              mode="neuron"
              neuronResult={neuronSimResult}
              compareResult={compareSimResult}
              networkResult={null}
              vThresholdMv={lifParams.v_threshold_mv}
            />
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              Press &ldquo;Send Signal&rdquo; on any neuron to calculate and plot its membrane response.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
