# Wiza ✦ Elite Generative Cinema Workstation

> **A sovereign, minimalist creative studio for narrative generative video and film production.**  
> Powered by **Wan 2.1 (14B / 1.3B)** and **SkyReels-V2**, featuring character consistency locks, 6-DOF camera trajectory control, multi-track timeline editing, and high-resolution video export.

---

## 1. Product Philosophy: Pure Creative Workstation

Wiza is intentionally decoupled from defense and geospatial telemetry engines. Unlike tactical C2 interfaces, Wiza is crafted specifically for film directors, concept artists, and cinema creators. 

- **Aesthetic**: Utilitarian, dark minimalist workstation inspired by **Figma** and **Runway Gen-3**.
- **Color Palette**: Monochromatic obsidian `#0d0f12`, titanium gray borders `#1e222b`, and electric amber `#f59e0b` accents.
- **Zero Geospatial Bloat**: No 3D globes, no satellite TLE tracks, no flight transponders. 100% focused on storytelling, framing, and cinematic generation.

---

## 2. Core Capabilities

### 🎥 Foundation Diffusion Models
- **Wan 2.1 (14B) DiT**: Flagship 4D spatiotemporal Video Diffusion Transformer. Generates pristine 720p/1080p native video with realistic physics, fluid motion, and volumetric lighting.
- **Wan 2.1 (1.3B) Fast**: Compact architecture tailored for consumer workstations (RTX 3060/4070, 8 GB VRAM).
- **SkyReels-V2 Director**: Cinematic flow diffusion engine specialized in screenplay parsing, dramatic beats, and Hollywood color palettes.
- **Flux.1 Dev**: 12B MMDiT for generating master keyframes and persona reference anchor sheets.

### 👤 Character Consistency Vault
- **Persistent Persona Registry**: Store and manage characters (e.g. *Elena Rostova*, *Cmdr. Marcus Vance*).
- **Face-ID & LoRA Conditioning**: Lock facial features, hairstyle, signature costume, and ocular traits across multiple scene cuts.
- **Automatic Trigger Injection**: Seamlessly injects `[char:id]` tokens and negative anchor prompts into the latent diffusion pipeline.

### 🕹️ 6-DOF Camera Trajectory Rig
- **Translation Vectors**: Dolly In/Out, Pan Left/Right, Crane Boom Up/Down.
- **Rotational Angles**: Tilt Up/Down, Dutch Roll, Zoom In/Out.
- **Hermite Spline Interpolation**: Conditions cross-attention layers with frame-accurate camera poses for smooth cinematic movements.

### 🎞️ Multi-Track Cinema Timeline & Viewport
- **Master Viewport**: Aspect-ratio bounding box with support for **16:9 Widescreen**, **2.39:1 Anamorphic Cinema**, and **9:16 Mobile Vertical**.
- **Safe-Zone Framing Guides**: Rule-of-thirds grid, center crosshairs, and letterboxing.
- **Multi-Track Editing**:
  - `V1 • Video`: Generated takes and shot clips.
  - `V2 • Persona`: Active character consistency layer.
  - `A1 • Audio`: Master dialogue and sound effects layer.
- **Interactive Scrubber**: Frame-by-frame stepping (`⏮`, `⏭`) and 24 fps playback simulation.

### 💾 Studio Export Pipeline
- **Apple ProRes 422 HQ (`.mov`)**: Studio master export for editing in DaVinci Resolve or Adobe Premiere.
- **H.265 / HEVC MP4**: Optimized distribution for streaming, web, and social platforms.
- **Output Resolutions**: 1080p Full HD (1920x1080) and 4K Ultra HD (3840x2160).

---

## 3. Directory Layout

```
/Users/aryamandev/Developer/wiza/
├── package.json          # Standalone project definition & scripts
├── server.js             # HTTP REST API & static asset server (Node 18+)
├── README.md             # This document
├── public/
│   └── index.html        # Minimalist creative workstation UI shell
├── src/
│   ├── app.js            # Client interactive logic, canvas rendering, vault management
│   └── styles.css        # Minimalist dark theme & responsive workstation layout
└── test/
    └── wiza.test.js      # Comprehensive integration test suite
```

---

## 4. Quick Start

### Prerequisites
- Node.js >= 18.0.0 (uses native HTTP and test runner, no external npm dependencies required).

### Running the Workstation
```bash
cd /Users/aryamandev/Developer/wiza
npm start
```
Then open your browser to:
```
http://localhost:4040
```

### Running Tests
```bash
npm test
```

---

## 5. Connecting Live Wan 2.1 Backend

By default, Wiza runs in offline production-simulation mode with realistic inference metrics. To route requests to a live local GPU cluster (ComfyUI / Diffusers / vLLM):

1. Set the upstream inference URL in your environment:
   ```bash
   export WAN_INFERENCE_ENDPOINT="http://127.0.0.1:8188/api/wan21"
   npm start
   ```
2. In ComfyUI or your vLLM wrapper, load the official weights:
   - `Wan2.1-T2V-14B-Diffusers`
   - `Wan2.1-T2V-1.3B-Diffusers`
   - `SkyReels-V2-Film`

---

## 6. License
MIT © Veloce / Aetheris Creative
