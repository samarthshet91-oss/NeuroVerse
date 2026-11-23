"""Directed synaptic connection model with transmission delay and exponential decay."""

from dataclasses import dataclass


@dataclass
class SynapseModel:
    edge_id: str
    source_id: str
    target_id: str
    weight: float
    delay_ms: float
    enabled: bool = True
    synapse_type: str = "excitatory"
    tau_syn_ms: float = 4.0

    def pulse_current_na(self) -> float:
        """Convert dimensionless synaptic weight into instantaneous current kick (nA)."""
        return self.weight if self.enabled else 0.0
