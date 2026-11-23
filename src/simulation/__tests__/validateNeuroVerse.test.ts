import assert from 'node:assert/strict';
import { generateBiologicalRegionNetwork } from '@/src/data/biologicalNetworkGenerator';
import {
  LIFCell,
  LocalSpikeEventQueue,
  simulateNetworkLocal,
  simulateSingleLifLocal,
} from '@/src/simulation/localLifSolver';
import {
  DEFAULT_LIF_PARAMS,
  buildNeuronFiringLog,
  buildSignalNarrative,
  useExplorationStore,
} from '@/src/store/explorationStore';
import type { BrainRegionId, LIFParams, NeuronNode, SynapseEdge, TissueDensity } from '@/src/types/neuroverse';

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(
    () => {
      console.log(`PASS  ${name}`);
    },
    (err) => {
      console.error(`FAIL  ${name}`);
      throw err;
    }
  );
}

async function main() {
  // ---------------------------------------------------------------------------
  // 1. LIF SOLVER VALIDATION
  // ---------------------------------------------------------------------------
  await runTest('1.1 Subthreshold input: 0 spikes and asymptotic approach to V_rest + R_m * I', () => {
    const params: LIFParams = {
      ...DEFAULT_LIF_PARAMS,
      input_current_na: 1.0, // rheobase = (-55 - -70)/10 = 1.5 nA
      pulse_start_ms: 0,
      pulse_end_ms: 100,
      duration_ms: 100,
      dt_ms: 0.1,
    };
    const res = simulateSingleLifLocal(params);
    assert.equal(res.spike_count, 0);
    assert.equal(res.spike_times_ms.length, 0);
    assert.equal(res.time_ms[0], 0);
    assert.equal(res.membrane_potential_mv[0], params.v_rest_mv);

    // Steady state V_inf = -70 + 10 * 1.0 = -60.0 mV after ~10 * tau_m (100 ms)
    const finalV = res.membrane_potential_mv[res.membrane_potential_mv.length - 1];
    assert.ok(Math.abs(finalV - -60.0) < 0.05, `Expected final V near -60.0 mV, got ${finalV}`);
  });

  await runTest('1.2 Suprathreshold input: threshold detection, spike generation, and reset', () => {
    const params: LIFParams = {
      ...DEFAULT_LIF_PARAMS,
      input_current_na: 2.8,
      pulse_start_ms: 2.0,
      pulse_end_ms: 48.0,
      duration_ms: 60.0,
      dt_ms: 0.25,
    };
    const res = simulateSingleLifLocal(params);
    assert.ok(res.spike_count >= 3, `Expected >= 3 spikes, got ${res.spike_count}`);
    assert.equal(res.spike_count, res.spike_times_ms.length);

    // Analytical first spike time from pulse_start: -tau * ln(1 - (V_th - V_rest)/(R_m * I))
    const tauM = params.membrane_resistance_mohm * params.membrane_capacitance_nf;
    const tAnalytical =
      params.pulse_start_ms -
      tauM *
        Math.log(
          1 - (params.v_threshold_mv - params.v_rest_mv) / (params.membrane_resistance_mohm * params.input_current_na)
        );
    const firstSpike = res.spike_times_ms[0];
    assert.ok(
      Math.abs(firstSpike - tAnalytical) < 0.5,
      `First spike ${firstSpike} ms deviated too far from analytical ${tAnalytical.toFixed(3)} ms`
    );

    // Verify immediate reset to V_reset on step following the spike
    const firstSpikeIdx = res.time_ms.indexOf(firstSpike);
    assert.ok(firstSpikeIdx > 0);
    assert.equal(res.membrane_potential_mv[firstSpikeIdx], params.v_threshold_mv);
    assert.equal(res.membrane_potential_mv[firstSpikeIdx + 1], params.v_reset_mv);
  });

  await runTest('1.3 Refractory period clamps V at V_reset for exact tau_ref duration', () => {
    const dt = 0.25;
    const params: LIFParams = {
      ...DEFAULT_LIF_PARAMS,
      input_current_na: 12.0,
      refractory_period_ms: 3.0,
      pulse_start_ms: 0,
      pulse_end_ms: 20,
      duration_ms: 20,
      dt_ms: dt,
    };
    const cell = new LIFCell(params);
    let spikedAt = -1;
    let t = 0;
    for (let i = 1; i <= 40; i++) {
      t = Number((i * dt).toFixed(4));
      if (cell.stepEuler(12.0, t, dt)) {
        spikedAt = t;
        break;
      }
    }
    assert.ok(spikedAt > 0, 'Cell should have fired quickly under 12 nA');

    // Exact refractory steps = 3.0 / 0.25 = 12 steps clamped at V_reset
    const refSteps = Math.round(params.refractory_period_ms / dt);
    for (let s = 1; s <= refSteps; s++) {
      const nextT = Number((spikedAt + s * dt).toFixed(4));
      const fired = cell.stepEuler(12.0, nextT, dt);
      assert.equal(fired, false, `Should not fire during refractory step ${s}/${refSteps}`);
      assert.equal(cell.vMv, params.v_reset_mv, `Should stay clamped at V_reset on step ${s}`);
    }

    // Immediately on step refSteps + 1, integration must resume above V_reset
    const resumeT = Number((spikedAt + (refSteps + 1) * dt).toFixed(4));
    cell.stepEuler(12.0, resumeT, dt);
    assert.ok(cell.vMv > params.v_reset_mv, 'Membrane voltage must resume integrating right after tau_ref');
  });

  await runTest('1.4 Timestep convergence and LIF parameter sensitivity (C_m, R_m, I, V_th)', () => {
    const base: LIFParams = { ...DEFAULT_LIF_PARAMS, pulse_start_ms: 0, pulse_end_ms: 60 };
    const coarse = simulateSingleLifLocal({ ...base, dt_ms: 0.25 });
    const fine = simulateSingleLifLocal({ ...base, dt_ms: 0.05 });
    const analytical =
      -10 * Math.log(1 - 15 / 28); // ~7.674 ms
    assert.ok(
      Math.abs(fine.spike_times_ms[0] - analytical) < Math.abs(coarse.spike_times_ms[0] - analytical),
      'Smaller dt must converge closer to analytical spike time'
    );

    const highCm = simulateSingleLifLocal({ ...base, membrane_capacitance_nf: 2.0 });
    assert.ok(highCm.tau_m_ms > coarse.tau_m_ms);
    assert.ok(highCm.spike_times_ms[0] > coarse.spike_times_ms[0], 'Higher C_m must delay first spike');
    assert.ok(highCm.spike_count < coarse.spike_count, 'Higher C_m must lower spike count');

    const highRm = simulateSingleLifLocal({ ...base, membrane_resistance_mohm: 20.0 });
    assert.ok(highRm.rheobase_na < coarse.rheobase_na);
    assert.ok(highRm.spike_times_ms[0] < coarse.spike_times_ms[0], 'Higher R_m must advance first spike');

    const highI = simulateSingleLifLocal({ ...base, input_current_na: 5.0 });
    assert.ok(highI.spike_count > coarse.spike_count, 'Higher input current must increase spike count');
    assert.ok(highI.spike_times_ms[0] < coarse.spike_times_ms[0], 'Higher input current must advance spike');

    const highVth = simulateSingleLifLocal({ ...base, v_threshold_mv: -46.0 });
    assert.ok(highVth.spike_count < coarse.spike_count, 'Higher threshold must decrease spike count');
    assert.ok(highVth.spike_times_ms[0] > coarse.spike_times_ms[0], 'Higher threshold must delay spike');

    assert.throws(() => simulateSingleLifLocal({ ...base, membrane_capacitance_nf: 0 }));
    assert.throws(() => simulateSingleLifLocal({ ...base, v_reset_mv: -50, v_threshold_mv: -55 }));
  });

  // ---------------------------------------------------------------------------
  // 2. NETWORK PROPAGATION & LOG RECONCILIATION
  // ---------------------------------------------------------------------------
  const makeNode = (id: string, role: NeuronNode['role'] = 'excitatory'): NeuronNode => ({
    id,
    label: id,
    role,
    position: [0, 0, 0],
    baseline_input_na: 0,
  });

  await runTest('2.1 Signals travel only through enabled edges; delays respected; target fires only above threshold', () => {
    const nodes = [makeNode('N1'), makeNode('N2'), makeNode('N3'), makeNode('N4')];
    const edges: SynapseEdge[] = [
      { id: 'e12', source: 'N1', target: 'N2', weight: 7.5, delay_ms: 3.0, enabled: true, synapse_type: 'excitatory' },
      { id: 'e13', source: 'N1', target: 'N3', weight: 1.5, delay_ms: 2.0, enabled: true, synapse_type: 'excitatory' },
      { id: 'e14', source: 'N1', target: 'N4', weight: 8.0, delay_ms: 2.0, enabled: false, synapse_type: 'excitatory' },
    ];

    const res = simulateNetworkLocal({
      region_id: 'frontal',
      nodes,
      edges,
      external_inputs_na: { N1: 3.0, N2: 0, N3: 0, N4: 0 },
      lif: { ...DEFAULT_LIF_PARAMS, duration_ms: 30, dt_ms: 0.25, pulse_start_ms: 1.0, pulse_end_ms: 18.0 },
    });

    const m1 = res.node_metrics.find((m) => m.node_id === 'N1')!;
    const m2 = res.node_metrics.find((m) => m.node_id === 'N2')!;
    const m3 = res.node_metrics.find((m) => m.node_id === 'N3')!;
    const m4 = res.node_metrics.find((m) => m.node_id === 'N4')!;

    assert.ok(m1.spike_count >= 1, 'N1 should fire');
    const n1First = m1.spike_times_ms[0];

    // Verify exact arrival_time_ms = fire_time_ms + delay_ms
    const e12Events = res.spike_events.filter((e) => e.edge_id === 'e12');
    assert.equal(e12Events.length, m1.spike_count);
    for (const ev of e12Events) {
      assert.equal(ev.arrival_time_ms, Number((ev.fire_time_ms + 3.0).toFixed(4)));
    }

    // Before arrival_time_ms, N2 must remain strictly at V_rest (-70 mV)
    const arrivalMs = e12Events[0].arrival_time_ms;
    const arrivalIdx = res.time_ms.findIndex((t) => t >= arrivalMs - 1e-6);
    assert.ok(arrivalIdx > 1);
    assert.equal(res.membrane_traces_mv['N2'][arrivalIdx - 1], -70);
    assert.ok(res.membrane_traces_mv['N2'][arrivalIdx] > -70, 'N2 must depolarize on arrival step');

    // N2 receives strong drive (w=4.2) and fires after arrival
    assert.ok(m2.spike_count >= 1 && m2.first_spike_ms! >= arrivalMs, 'N2 must fire after arrival');

    // N3 receives weak excitatory drive (w=0.6): depolarizes above -70 mV but never fires
    assert.equal(m3.spike_count, 0);
    assert.ok(Math.max(...res.membrane_traces_mv['N3']) > -70);

    // N4 edge is disabled: stays strictly flat at -70 mV
    assert.equal(m4.spike_count, 0);
    assert.ok(res.membrane_traces_mv['N4'].every((v) => v === -70));
  });

  await runTest('2.2 Excitatory vs inhibitory synapses oppose each other accurately', () => {
    const nodes = [makeNode('Exc'), makeNode('Inh', 'inhibitory'), makeNode('TargetA'), makeNode('TargetB')];
    const edges: SynapseEdge[] = [
      { id: 'e_excA', source: 'Exc', target: 'TargetA', weight: 4.5, delay_ms: 2.0, enabled: true, synapse_type: 'excitatory' },
      { id: 'e_excB', source: 'Exc', target: 'TargetB', weight: 4.5, delay_ms: 2.0, enabled: true, synapse_type: 'excitatory' },
      { id: 'e_inhB', source: 'Inh', target: 'TargetB', weight: -4.2, delay_ms: 1.5, enabled: true, synapse_type: 'inhibitory' },
    ];
    const res = simulateNetworkLocal({
      region_id: 'frontal',
      nodes,
      edges,
      external_inputs_na: { Exc: 3.0, Inh: 3.0, TargetA: 0, TargetB: 0 },
      lif: { ...DEFAULT_LIF_PARAMS, duration_ms: 35, dt_ms: 0.25, pulse_start_ms: 1, pulse_end_ms: 25 },
    });

    const mA = res.node_metrics.find((m) => m.node_id === 'TargetA')!;
    const mB = res.node_metrics.find((m) => m.node_id === 'TargetB')!;
    assert.ok(mA.spike_count > mB.spike_count, 'Inhibition on TargetB must suppress firing relative to TargetA');
    assert.ok(mB.mean_membrane_mv < mA.mean_membrane_mv, 'Inhibited target must have lower mean V_m');
  });

  await runTest('2.3 Multi-spike counter and event log reconciliation (2-spike case)', () => {
    // Craft a clean biological network subset where N1 fires exactly 2 spikes and logs match 1:1
    const regionNet = generateBiologicalRegionNetwork('frontal', 70);
    const params: LIFParams = {
      ...DEFAULT_LIF_PARAMS,
      input_current_na: 2.4,
      pulse_start_ms: 2.0,
      pulse_end_ms: 28.0,
      duration_ms: 40.0,
      dt_ms: 0.25,
    };
    const triggerNode = regionNet.nodes[0];
    // Isolate trigger + its direct targets to test a clean 2-spike firing case
    const outEdges = regionNet.edges.filter((e) => e.source === triggerNode.id);
    const subNodes = regionNet.nodes.filter(
      (n) => n.id === triggerNode.id || outEdges.some((e) => e.target === n.id)
    );
    // Keep one target excitatory with moderate weight so trigger fires 2 spikes and we verify all timestamps
    const subEdges = outEdges.slice(0, 2).map((e) => ({ ...e, weight: 1.5, synapse_type: 'excitatory' as const }));
    const subNetwork = { ...regionNet, nodes: subNodes, edges: subEdges };

    const res = simulateNetworkLocal({
      region_id: 'frontal',
      nodes: subNetwork.nodes,
      edges: subNetwork.edges,
      external_inputs_na: { [triggerNode.id]: params.input_current_na },
      lif: params,
      pulseWindowMs: [params.pulse_start_ms, params.pulse_end_ms],
    });

    assert.equal(res.total_spikes, 2, `Expected 2 total spikes, got ${res.total_spikes}`);
    const firingLog = buildNeuronFiringLog(res, subNetwork);
    const story = buildSignalNarrative(res, subNetwork, triggerNode.id);

    assert.equal(
      firingLog.length,
      res.total_spikes,
      'Firing log length must equal total_spikes (both spikes shown!)'
    );
    assert.equal(firingLog[0].spikeOrdinal, 1);
    assert.equal(firingLog[1].spikeOrdinal, 2);
    assert.ok(firingLog[1].spikeTimeMs > firingLog[0].spikeTimeMs);

    // Every synaptic edge should also record BOTH firing timestamps in signalStory (no pair deduplication!)
    const firstEdgeSteps = story.filter((s) => s.edgeId === subEdges[0].id);
    assert.equal(firstEdgeSteps.length, 2, 'Pathway log must preserve both spike waves on the same synapse');
  });

  await runTest('2.4 Priority queue pops out-of-order arrivals in strict chronological order', () => {
    const q = new LocalSpikeEventQueue();
    q.push({ arrivalTimeMs: 12.5, sourceId: 'a', targetId: 'b', edgeId: 'e1', fireTimeMs: 8, weight: 1, delayMs: 4.5 });
    q.push({ arrivalTimeMs: 6.0, sourceId: 'a', targetId: 'c', edgeId: 'e2', fireTimeMs: 4, weight: 1, delayMs: 2.0 });
    q.push({ arrivalTimeMs: 9.2, sourceId: 'b', targetId: 'c', edgeId: 'e3', fireTimeMs: 7, weight: 1, delayMs: 2.2 });

    assert.equal(q.popReady(5.5).length, 0);
    const first = q.popReady(6.0);
    assert.equal(first.length, 1);
    assert.equal(first[0].edgeId, 'e2');
    const rest = q.popReady(13.0);
    assert.deepEqual(
      rest.map((r) => r.edgeId),
      ['e3', 'e1']
    );
  });

  // ---------------------------------------------------------------------------
  // 3. TIMELINE & NAVIGATION CONSISTENCY
  // ---------------------------------------------------------------------------
  await runTest('3.1 Store preserves playbackTimeMs and selectedNeuronId across tissue <-> close-up navigation', async () => {
    const store = useExplorationStore.getState();
    store.selectRegion('frontal');
    await store.sendSignalFromSelectedNeuron();

    const afterSend = useExplorationStore.getState();
    assert.ok(afterSend.networkSimResult !== null);
    assert.ok(afterSend.selectedNeuronId !== null);
    const chosenId = afterSend.selectedNeuronId!;

    // Seek to 49.3 ms and pause (simulating user scrubbing/playing to 49.3 ms in regional tissue)
    afterSend.setPlayingSignals(false);
    afterSend.setPlaybackTimeMs(49.3);

    // Zoom into single-neuron close-up
    useExplorationStore.getState().zoomIntoSelectedNeuron();
    const inNeuronView = useExplorationStore.getState();
    assert.equal(inNeuronView.explorationState, 'NEURON_VIEW');
    assert.equal(inNeuronView.selectedNeuronId, chosenId);
    assert.equal(inNeuronView.playbackTimeMs, 49.3);

    // Return back to regional tissue view
    inNeuronView.returnToTissueView();
    const backInTissue = useExplorationStore.getState();
    assert.equal(backInTissue.explorationState, 'REGION_VIEW');
    assert.equal(backInTissue.selectedNeuronId, chosenId);
    assert.equal(backInTissue.playbackTimeMs, 49.3);

    // Density switch preserves neuron identity if valid in new density
    backInTissue.setTissueDensity(140);
    const afterDensity = useExplorationStore.getState();
    assert.equal(afterDensity.activeNetwork?.nodes.length, 140);
    assert.equal(afterDensity.selectedNeuronId, chosenId);

    // Clean reset back to brain view
    afterDensity.resetToBrainView();
    assert.equal(useExplorationStore.getState().explorationState, 'BRAIN_VIEW');
  });

  // ---------------------------------------------------------------------------
  // 4. DENSITY SETTINGS (70, 110, 140) VALIDATION ACROSS ALL REGIONS
  // ---------------------------------------------------------------------------
  await runTest('4.1 All 3 density settings (70, 110, 140) validate geometry, synaptic clefts, and LIF runs', () => {
    const regions: BrainRegionId[] = ['frontal', 'parietal', 'temporal', 'occipital', 'cerebellum', 'brainstem'];
    const densities: TissueDensity[] = [70, 110, 140];

    for (const density of densities) {
      for (const regionId of regions) {
        const net = generateBiologicalRegionNetwork(regionId, density);
        assert.equal(net.nodes.length, density, `${regionId} expected ${density} nodes`);
        assert.ok(net.edges.length >= density, `${regionId} expected >= ${density} edges`);

        for (const node of net.nodes) {
          assert.ok(node.position.every(Number.isFinite));
          assert.ok(node.dendrite_branches.length >= 4);
          assert.ok(node.dendrite_tips.length >= 4);
        }

        for (const edge of net.edges) {
          assert.ok(edge.delay_ms > 0 && Number.isFinite(edge.delay_ms));
          assert.equal(edge.curve_points.length, 4);
          // Verify synaptic cleft spacing between terminal_position and target_dendrite_tip
          const dx = edge.terminal_position[0] - edge.target_dendrite_tip[0];
          const dy = edge.terminal_position[1] - edge.target_dendrite_tip[1];
          const dz = edge.terminal_position[2] - edge.target_dendrite_tip[2];
          const cleftGap = Math.sqrt(dx * dx + dy * dy + dz * dz);
          assert.ok(cleftGap > 0.2 && cleftGap < 0.35, `Unexpected cleft gap ${cleftGap} on ${edge.id}`);
        }
      }

      // Benchmark LIF simulation on each density for frontal lobe
      const net = generateBiologicalRegionNetwork('frontal', density);
      const t0 = performance.now();
      const sim = simulateNetworkLocal({
        region_id: 'frontal',
        nodes: net.nodes,
        edges: net.edges,
        external_inputs_na: { [net.nodes[0].id]: DEFAULT_LIF_PARAMS.input_current_na },
        lif: DEFAULT_LIF_PARAMS,
      });
      const elapsedMs = performance.now() - t0;

      const sumMetrics = sim.node_metrics.reduce((acc, m) => acc + m.spike_count, 0);
      assert.equal(sim.total_spikes, sumMetrics);
      const log = buildNeuronFiringLog(sim, net);
      assert.equal(log.length, sim.total_spikes);
      assert.ok(elapsedMs < 1500, `Density ${density} simulation took too long: ${elapsedMs.toFixed(1)} ms`);
      console.log(`      density=${density}: nodes=${net.nodes.length}, edges=${net.edges.length}, spikes=${sim.total_spikes}, simTime=${elapsedMs.toFixed(1)}ms`);
    }
  });

  console.log('\nAll NeuroVerse scientific validation checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
