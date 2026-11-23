import {
  simulateNetworkLocal,
  simulateSingleLifLocal,
} from '@/src/simulation/localLifSolver';
import type {
  BackendHealth,
  BrainRegion,
  BrainRegionId,
  CompareSimulationResponse,
  LIFParams,
  NetworkSimulationResponse,
  NeuronNode,
  NeuronSimulationResponse,
  RegionNetwork,
  SimulationSource,
  SynapseEdge,
} from '@/src/types/neuroverse';

const API_BASE = ((import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export class BackendApiError extends Error {
  public readonly status: number | null;
  public readonly isNetworkError: boolean;

  constructor(message: string, status: number | null = null, isNetworkError = false) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok) {
      let detail = `Backend returned HTTP ${response.status}`;
      if (contentType.includes('application/json')) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null;
        if (body?.detail) detail = body.detail;
      }
      throw new BackendApiError(detail, response.status, false);
    }

    if (!contentType.includes('application/json')) {
      throw new BackendApiError(
        'FastAPI backend is not reachable at /api/v1.',
        response.status,
        true
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof BackendApiError) {
      throw error;
    }
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    throw new BackendApiError(
      isAbort ? 'FastAPI backend request timed out.' : 'FastAPI backend is unreachable.',
      null,
      true
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export const simulationApi = {
  checkHealth(): Promise<BackendHealth> {
    return requestJson<BackendHealth>('/api/v1/health');
  },

  fetchBrainRegions(): Promise<{ regions: BrainRegion[]; model_disclaimer: string }> {
    return requestJson<{ regions: BrainRegion[]; model_disclaimer: string }>(
      '/api/v1/brain/regions'
    );
  },

  fetchRegionNetwork(regionId: BrainRegionId): Promise<RegionNetwork> {
    return requestJson<RegionNetwork>(`/api/v1/brain/regions/${regionId}/network`);
  },

  async simulateNeuron(
    params: LIFParams,
    allowBackend: boolean
  ): Promise<{ result: NeuronSimulationResponse; source: SimulationSource }> {
    if (allowBackend) {
      try {
        const res = await requestJson<NeuronSimulationResponse>('/api/v1/simulation/neuron', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return {
          result: { ...res, solver_source: 'fastapi-python' },
          source: 'fastapi-python',
        };
      } catch (err) {
        if (err instanceof BackendApiError && !err.isNetworkError) {
          throw err;
        }
      }
    }

    const local = simulateSingleLifLocal(params);
    return { result: local, source: 'local-typescript' };
  },

  async simulateNetwork(
    payload: {
      region_id: string;
      nodes: NeuronNode[];
      edges: SynapseEdge[];
      external_inputs_na: Record<string, number>;
      lif: LIFParams;
      pulseWindowMs?: [number, number];
    },
    allowBackend: boolean
  ): Promise<{ result: NetworkSimulationResponse; source: SimulationSource }> {
    const cleanNodes: NeuronNode[] = payload.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      role: n.role,
      position: n.position,
      baseline_input_na: n.baseline_input_na,
    }));

    const cleanEdges: SynapseEdge[] = payload.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight,
      delay_ms: e.delay_ms,
      enabled: e.enabled,
      synapse_type: e.synapse_type,
    }));

    if (allowBackend) {
      try {
        const res = await requestJson<NetworkSimulationResponse>('/api/v1/simulation/network', {
          method: 'POST',
          body: JSON.stringify({
            region_id: payload.region_id,
            nodes: cleanNodes,
            edges: cleanEdges,
            external_inputs_na: payload.external_inputs_na,
            membrane_capacitance_nf: payload.lif.membrane_capacitance_nf,
            membrane_resistance_mohm: payload.lif.membrane_resistance_mohm,
            v_rest_mv: payload.lif.v_rest_mv,
            v_reset_mv: payload.lif.v_reset_mv,
            v_threshold_mv: payload.lif.v_threshold_mv,
            refractory_period_ms: payload.lif.refractory_period_ms,
            duration_ms: payload.lif.duration_ms,
            dt_ms: Math.max(payload.lif.dt_ms, 0.25),
          }),
        });
        return {
          result: { ...res, solver_source: 'fastapi-python' },
          source: 'fastapi-python',
        };
      } catch (err) {
        if (err instanceof BackendApiError && !err.isNetworkError) {
          throw err;
        }
      }
    }

    const local = simulateNetworkLocal({
      region_id: payload.region_id,
      nodes: cleanNodes,
      edges: cleanEdges,
      external_inputs_na: payload.external_inputs_na,
      lif: payload.lif,
      pulseWindowMs: payload.pulseWindowMs,
    });
    return { result: local, source: 'local-typescript' };
  },

  async compareNeurons(
    baseline: LIFParams,
    variant: LIFParams,
    allowBackend: boolean
  ): Promise<{ result: CompareSimulationResponse; source: SimulationSource }> {
    if (allowBackend) {
      try {
        const res = await requestJson<CompareSimulationResponse>('/api/v1/simulation/compare', {
          method: 'POST',
          body: JSON.stringify({ baseline, variant }),
        });
        return { result: res, source: 'fastapi-python' };
      } catch (err) {
        if (err instanceof BackendApiError && !err.isNetworkError) {
          throw err;
        }
      }
    }

    const baseRes = simulateSingleLifLocal(baseline);
    const varRes = simulateSingleLifLocal(variant);
    const baseFirst = baseRes.spike_times_ms[0] ?? null;
    const varFirst = varRes.spike_times_ms[0] ?? null;
    return {
      result: {
        baseline: baseRes,
        variant: varRes,
        delta_spike_count: varRes.spike_count - baseRes.spike_count,
        delta_firing_rate_hz: Number((varRes.firing_rate_hz - baseRes.firing_rate_hz).toFixed(2)),
        delta_first_spike_ms:
          baseFirst !== null && varFirst !== null ? Number((varFirst - baseFirst).toFixed(4)) : null,
      },
      source: 'local-typescript',
    };
  },
};
