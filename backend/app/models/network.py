"""Directed graph wrapper built on NetworkX for regional neural networks."""

from typing import Dict, List
import networkx as nx

from .synapse import SynapseModel


class NeuralNetworkGraph:
    """Represents a directed neural microcircuit using NetworkX."""

    def __init__(self, nodes: List[dict], edges: List[dict]) -> None:
        self.graph = nx.DiGraph()
        self.synapses: Dict[str, SynapseModel] = {}

        for node in nodes:
            self.graph.add_node(
                node["id"],
                label=node["label"],
                role=node["role"],
                position=node["position"],
                baseline_input_na=node.get("baseline_input_na", 0.0),
            )

        for edge in edges:
            syn = SynapseModel(
                edge_id=edge["id"],
                source_id=edge["source"],
                target_id=edge["target"],
                weight=float(edge["weight"]),
                delay_ms=float(edge["delay_ms"]),
                enabled=bool(edge.get("enabled", True)),
                synapse_type=edge.get("synapse_type", "excitatory"),
            )
            self.synapses[syn.edge_id] = syn
            if syn.enabled and syn.source_id in self.graph and syn.target_id in self.graph:
                self.graph.add_edge(
                    syn.source_id,
                    syn.target_id,
                    edge_id=syn.edge_id,
                    weight=syn.weight,
                    delay_ms=syn.delay_ms,
                    synapse_type=syn.synapse_type,
                )

    def outgoing_synapses(self, node_id: str) -> List[SynapseModel]:
        return [
            syn
            for syn in self.synapses.values()
            if syn.enabled and syn.source_id == node_id
        ]

    def summary(self) -> dict:
        num_nodes = self.graph.number_of_nodes()
        num_edges = self.graph.number_of_edges()
        sccs = list(nx.strongly_connected_components(self.graph)) if num_nodes > 0 else []
        recurrent_cycles = sum(1 for comp in sccs if len(comp) > 1)
        return {
            "node_count": num_nodes,
            "active_edge_count": num_edges,
            "total_defined_edges": len(self.synapses),
            "density": round(nx.density(self.graph), 4) if num_nodes > 1 else 0.0,
            "recurrent_components": recurrent_cycles,
            "is_dag": nx.is_directed_acyclic_graph(self.graph) if num_nodes > 0 else True,
        }
