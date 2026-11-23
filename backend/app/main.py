"""NeuroVerse FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import brain, simulation

app = FastAPI(
    title="NeuroVerse Simulation API",
    description=(
        "Numerical Leaky Integrate-and-Fire (LIF) single-neuron and directed "
        "microcircuit simulation backend powered by NumPy and NetworkX."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(brain.router, prefix="/api/v1")
app.include_router(simulation.router, prefix="/api/v1")
