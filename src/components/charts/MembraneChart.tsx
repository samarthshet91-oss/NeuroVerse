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

const TRACE_COLORS = ['#55c9d6', '#8273b5', '#719bb7', '#4b9a83', '#d9a15f', '#ad7d92'];

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
          <CartesianGrid stroke="#40516a" strokeOpacity={0.42} strokeDasharray="3 5" />
          <XAxis
            dataKey="time"
            stroke="#718198"
            tick={{ fontSize: 11, fill: '#9AA9BC' }}
            label={{ value: 'Time (ms)', position: 'insideBottomRight', offset: -2, fill: '#9AA9BC', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            stroke="#718198"
            tick={{ fontSize: 11, fill: '#9AA9BC' }}
            domain={['auto', 'auto']}
            label={{ value: 'mV', position: 'insideTopLeft', offset: 8, fill: '#9AA9BC', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#172438',
              borderColor: 'rgba(85,201,214,.35)',
              fontSize: '12px',
              color: '#e2e8f0',
            }}
            formatter={(val: number, name: string) => [`${val.toFixed(2)} mV`, name]}
            labelFormatter={(label) => `t = ${label} ms`}
          />
          <ReferenceLine
            y={vThresholdMv}
            stroke="#d9a15f"
            strokeDasharray="4 4"
            label={{ value: 'V_th', fill: '#d9a15f', fontSize: 10, position: 'insideTopRight' }}
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
            stroke="#55c9d6"
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
          <CartesianGrid stroke="#40516a" strokeOpacity={0.42} strokeDasharray="3 5" />
          <XAxis
            dataKey="time"
            stroke="#718198"
            tick={{ fontSize: 11, fill: '#9AA9BC' }}
            label={{ value: 'Time (ms)', position: 'insideBottomRight', offset: -2, fill: '#9AA9BC', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            stroke="#718198"
            tick={{ fontSize: 11, fill: '#9AA9BC' }}
            label={{ value: 'mV', position: 'insideTopLeft', offset: 8, fill: '#9AA9BC', fontSize: 10 }}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#172438',
              borderColor: 'rgba(85,201,214,.35)',
              fontSize: '11px',
              color: '#e2e8f0',
            }}
            labelFormatter={(label) => `t = ${label} ms`}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <ReferenceLine y={vThresholdMv} stroke="#d9a15f" strokeDasharray="4 4" />
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
