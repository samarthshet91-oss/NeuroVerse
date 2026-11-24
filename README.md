# 🧠 Neuro Verse
### Explore the Brain. Understand the Mind.

**Neuro Verse** is an interactive 3D computational neuroscience simulator designed to make the complex world of the human brain easier to explore and understand.

Step inside a virtual neural environment, explore brain regions, inspect individual neurons, and visualize how electrical signals propagate through interconnected neural networks.

## ✨ Features

- **Interactive 3D Brain Exploration** – Rotate, zoom, and explore an anatomical 3D brain model.
- **Regional Exploration** – Navigate from the whole brain into individual brain regions.
- **Detailed Neuron Visualization** – Explore dendrites, soma, axon, myelin sheath, and synaptic connections.
- **Neural Signal Propagation** – Visualize signal transmission across connected neurons.
- **Computational Neuron Simulation** – Simulate neuronal activity using the Leaky Integrate-and-Fire (LIF) model.
- **Real-Time Visualization** – Observe membrane potential changes, spike events, and neural activity.
- **Interactive Learning Experience** – Designed to make computational neuroscience accessible to students and curious learners.

## 🛠️ Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| 3D Visualization | Three.js, React Three Fiber, Drei |
| State Management | Zustand |
| Charts | Recharts |
| Backend | Python, FastAPI |
| Neural Simulation | LIF Neuron Model, Event-Driven Simulation |
| Network Modeling | NetworkX |

## 🧬 Simulation Model

Neuro Verse uses the **Leaky Integrate-and-Fire (LIF)** neuron model to demonstrate simplified neuronal electrical activity.

The simulator models:
- Membrane potential dynamics
- Spike threshold and reset
- Refractory periods
- Excitatory and inhibitory synaptic connections
- Signal propagation with synaptic delays

The neural environments are procedurally generated educational models, not exact reconstructions of the human connectome.

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- Python 3.10+ (for the optional backend)

### 1. Clone the Repository

```bash
git clone https://github.com/samarthshet91-oss/NeuroVerse.git
cd NeuroVerse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal to explore Neuro Verse.

### 4. Build for Production

```bash
npm run build
```

## 📁 Project Structure

```text
NeuroVerse/
├── backend/              # Python simulation backend
├── public/
│   ├── models/           # 3D brain assets
│   └── videos/           # Intro animation
├── src/
│   ├── app/              # Application shell
│   ├── components/       # UI components
│   ├── data/             # Brain and neural network data
│   ├── exploration/      # 3D exploration controls
│   ├── scenes/           # Brain and neuron scenes
│   ├── services/         # API integration
│   ├── simulation/       # Neural simulation engine
│   ├── store/            # Application state
│   └── types/            # TypeScript definitions
└── README.md
```

## 🎯 Vision

To bridge the gap between neuroscience and technology through an immersive, interactive learning environment.

Neuro Verse aims to make the invisible complexity of neural communication visible, understandable, and explorable.

## 👨‍💻 Developer

**Samarth S. Shet**

Artificial Intelligence & Data Science Engineering Student

GitHub: [@samarthshet91-oss](https://github.com/samarthshet91-oss)

---

*Explore the Brain. Understand the Mind.* 🧠
