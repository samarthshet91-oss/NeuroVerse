"""Leaky Integrate-and-Fire (LIF) single-compartment neuron model.

Governing ODE (consistent neurophysiology units: mV, ms, nA, MOhm, nF):
    C_m * dV/dt = -(V - V_rest) / R_m + I(t)
where:
    tau_m = R_m * C_m   [MOhm * nF = ms]
    R_m * I(t)          [MOhm * nA = mV]
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class LIFParameters:
    c_m_nf: float = 1.0
    r_m_mohm: float = 10.0
    v_rest_mv: float = -70.0
    v_reset_mv: float = -75.0
    v_threshold_mv: float = -55.0
    refractory_period_ms: float = 2.0

    @property
    def tau_m_ms(self) -> float:
        return self.r_m_mohm * self.c_m_nf

    @property
    def rheobase_na(self) -> float:
        """Minimum steady current required to reach threshold from rest."""
        return (self.v_threshold_mv - self.v_rest_mv) / self.r_m_mohm


@dataclass
class LIFNeuron:
    node_id: str
    params: LIFParameters
    v_mv: float = field(init=False)
    refractory_remaining_ms: float = 0.0
    spike_times_ms: List[float] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.v_mv = self.params.v_rest_mv

    def step_euler(self, i_total_na: float, t_ms: float, dt_ms: float) -> bool:
        """Advance neuron state by dt_ms using explicit Forward Euler integration.

        Returns True if a spike occurred during this timestep.
        """
        if self.refractory_remaining_ms > 1e-9:
            self.v_mv = self.params.v_reset_mv
            self.refractory_remaining_ms = max(0.0, self.refractory_remaining_ms - dt_ms)
            return False

        dv_dt = (
            -(self.v_mv - self.params.v_rest_mv) / self.params.r_m_mohm + i_total_na
        ) / self.params.c_m_nf
        self.v_mv += dv_dt * dt_ms

        if self.v_mv >= self.params.v_threshold_mv:
            self.v_mv = self.params.v_reset_mv
            self.refractory_remaining_ms = self.params.refractory_period_ms
            self.spike_times_ms.append(round(t_ms, 4))
            return True

        return False
