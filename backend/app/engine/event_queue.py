"""Priority queue for delayed spike propagation events in neural networks."""

from dataclasses import dataclass, field
import heapq
from typing import List


@dataclass(order=True)
class QueuedSpikeEvent:
    arrival_time_ms: float
    source_id: str = field(compare=False)
    target_id: str = field(compare=False)
    edge_id: str = field(compare=False)
    fire_time_ms: float = field(compare=False)
    weight: float = field(compare=False)
    delay_ms: float = field(compare=False)


class SpikeEventQueue:
    """Min-heap event queue keyed by spike arrival time."""

    def __init__(self) -> None:
        self._heap: List[QueuedSpikeEvent] = []

    def push(self, event: QueuedSpikeEvent) -> None:
        heapq.heappush(self._heap, event)

    def pop_ready(self, current_time_ms: float) -> List[QueuedSpikeEvent]:
        ready: List[QueuedSpikeEvent] = []
        while self._heap and self._heap[0].arrival_time_ms <= current_time_ms + 1e-9:
            ready.append(heapq.heappop(self._heap))
        return ready
