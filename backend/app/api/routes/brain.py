"""Brain region metadata and illustrative regional network endpoints."""

from fastapi import APIRouter, HTTPException

from app.data.region_networks import BRAIN_REGIONS, REGION_NETWORKS
from app.models.network import NeuralNetworkGraph
from app.schemas.brain import BrainRegionsResponse, RegionNetworkSchema

router = APIRouter(prefix="/brain", tags=["brain"])


@router.get("/regions", response_model=BrainRegionsResponse)
async def list_brain_regions() -> BrainRegionsResponse:
    """Return the 6 selectable brain regions with illustrative marker positions."""
    return BrainRegionsResponse(
        regions=BRAIN_REGIONS,
        model_disclaimer=(
            "Region boundaries and 3D marker coordinates represent an illustrative "
            "educational brain model rather than patient MRI segmentation."
        ),
    )


@router.get("/regions/{region_id}/network", response_model=RegionNetworkSchema)
async def get_region_network(region_id: str) -> RegionNetworkSchema:
    """Return the illustrative synthetic directed network for a brain region."""
    network_data = REGION_NETWORKS.get(region_id)
    if not network_data:
        raise HTTPException(status_code=404, detail=f"Unknown brain region '{region_id}'")

    graph = NeuralNetworkGraph(network_data["nodes"], network_data["edges"])
    return RegionNetworkSchema(
        **network_data,
        graph_summary=graph.summary(),
    )
