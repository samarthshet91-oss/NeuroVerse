"""Schemas for brain regions and illustrative regional neural networks."""

from typing import List, Literal
from pydantic import BaseModel, Field

BrainRegionId = Literal[
    "frontal",
    "parietal",
    "temporal",
    "occipital",
    "cerebellum",
    "brainstem",
]


class BrainRegionSchema(BaseModel):
    id: BrainRegionId
    name: str
    short_label: str
    subtitle: str
    description: str
    primary_functions: List[str]
    dominant_neurotransmitters: List[str]
    approximate_neuron_scale: str
    marker_position: List[float] = Field(
        ..., min_length=3, max_length=3, description="3D illustrative marker coordinate [x, y, z]"
    )
    accent_color: str
    is_illustrative_placeholder: bool = True


class BrainRegionsResponse(BaseModel):
    regions: List[BrainRegionSchema]
    model_disclaimer: str


class NeuronNodeSchema(BaseModel):
    id: str
    label: str
    role: Literal["excitatory", "inhibitory", "input", "output"]
    position: List[float] = Field(..., min_length=3, max_length=3)
    baseline_input_na: float = Field(default=0.0, ge=-10.0, le=20.0)


class SynapseEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    weight: float = Field(..., ge=-10.0, le=10.0)
    delay_ms: float = Field(..., ge=0.1, le=50.0)
    enabled: bool = True
    synapse_type: Literal["excitatory", "inhibitory"] = "excitatory"


class RegionNetworkSchema(BaseModel):
    region_id: BrainRegionId
    region_name: str
    is_illustrative_model: bool = True
    model_note: str
    nodes: List[NeuronNodeSchema]
    edges: List[SynapseEdgeSchema]
    graph_summary: dict
