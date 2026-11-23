import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CompareSimulationResponse,
  NetworkSimulationResponse,
  NeuronSimulationResponse,
} from '@/src/types/neuroverse';

const TRACE_COLORS = ['#22d3ee', '#a78bfa', '#38bdf8', '#2dd4bf', '#f59e0b', '#f472b6'];

interface MembraneChartProps {
  mode: 'neuron' | 'network';
  neuronResult: NeuronSimulationResponse | null;
  compareResult: CompareSimulationResponse | null;
  networkResult: NetworkSimulationResponse | null;
  vThresholdMv: number;
}

export function MembraneChart({
  mode,
  neuronResult,
  compareResult,
  networkResult,
  vThresholdMv,
}: MembraneChartProps) {
  const neuronData = useMemo(() => {
    if (!neuronResult) return [];
    const stride = Math.max(1, Math.floor(neuronResult.time_ms.length / 260));
    const rows: { time: number; v: number; baselineV?: number; current: number }[] = [];
    for (let i = 0; i < neuronResult.time_ms.length; i += stride) {
      rows.push({
        time: neuronResult.time_ms[i],
        v: neuronResult.membrane_potential_mv[i],
        baselineV: compareResult?.baseline.membrane_potential_mv[i],
        current: neuronResult.input_current_trace_na[i],
      });
    }
    return rows;
  }, [neuronResult, compareResult]);

  const { networkData, traceKeys } = useMemo(() => {
    if (!networkResult) return { networkData: [], traceKeys: [] as string[] };
    const keys = Object.keys(networkResult.membrane_traces_mv).slice(0, 6);
    const stride = Math.max(1, Math.floor(networkResult.time_ms.length / 220));
    const rows: Record<string, number>[] = [];

    for (let i = 0; i < networkResult.time_ms.length; i += stride) {
      const row: Record<string, number> = { time: networkResult.time_ms[i] };
      for (const k of keys) {
        row[k] = networkResult.membrane_traces_mv[k][i];
      }
      rows.push(row);
    }
    return { networkData: rows, traceKeys: keys };
  }, [networkResult]);

  if (mode === 'neuron' && neuronData.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={neuronData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v}ms`}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v}mV`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0b1220',
              borderColor: '#334155',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
            formatter={(val: number, name: string) => [`${val.toFixed(2)} mV`, name]}
            labelFormatter={(label) => `t = ${label} ms`}
          />
          <ReferenceLine
            y={vThresholdMv}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'V_th', fill: '#fbbf24', fontSize: 10, position: 'insideTopRight' }}
          />
          {compareResult && (
            <Line
              type="monotone"
              dataKey="baselineV"
              name="Baseline V(t)"
              stroke="#64748b"
              strokeDasharray="4 3"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="v"
            name="Membrane V(t)"
            stroke="#22d3ee"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (mode === 'network' && networkData.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={networkData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v}ms`}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => `${v}mV`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0b1220',
              borderColor: '#334155',
              fontSize: '11px',
              color: '#e2e8f0',
            }}
            labelFormatter={(label) => `t = ${label} ms`}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <ReferenceLine y={vThresholdMv} stroke="#f59e0b" strokeDasharray="4 4" />
          {traceKeys.map((key, idx) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={TRACE_COLORS[idx % TRACE_COLORS.length]}
              dot={false}
              strokeWidth={1.6}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
