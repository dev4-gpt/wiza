/**
 * Wiza — Elite Generative Cinema Workstation
 * Client Application Logic
 */

// Application State
const state = {
  activeModel: 'wan-2.1-t2v-14b',
  aspectRatio: '16:9',
  duration: 5.0,
  fps: 24,
  selectedCharacterId: 'char_elena_01',
  characters: [],
  cameraMotion: { pan: 0, tilt: 0, zoom: 0.2, dolly: 1.0, crane: 0, roll: 0 },
  shots: [
    {
      id: 'shot_1',
      title: 'Shot 01: Neon Corridor',
      prompt: 'Cinematic 8k wide shot of Elena walking through wet neon alleyway in neo-Tokyo, anamorphic lens flares, master prime 35mm, rain reflections.',
      model: 'wan-2.1-t2v-14b',
      duration: 5.0,
      frames: 120,
      aspectRatio: '16:9',
      characterId: 'char_elena_01',
      previewGradient: ['#0f172a', '#3b82f6', '#06b6d4'],
      accentColor: '#3b82f6'
    },
    {
      id: 'shot_2',
      title: 'Shot 02: Tactical Overwatch',
      prompt: 'Close-up portrait of Elena scanning biometric tactical HUD on rain-soaked skyscraper rooftop, high-tech cybernetic eye glowing sapphire.',
      model: 'wan-2.1-t2v-14b',
      duration: 5.0,
      frames: 120,
      aspectRatio: '16:9',
      characterId: 'char_elena_01',
      previewGradient: ['#1e1b4b', '#6366f1', '#a855f7'],
      accentColor: '#8b5cf6'
    }
  ],
  activeShotIndex: 0,
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 240, // 10s at 24fps
  isGenerating: false,
  showGuides: true
};

// Canvas & Animation References
let canvas, ctx;
let animationFrameId = null;

// DOM Initialization
window.addEventListener('DOMContentLoaded', async () => {
  initDOMReferences();
  initCanvas();
  bindEventListeners();
  await loadCharacters();
  await loadModels();
  renderTimeline();
  startPlaybackLoop();
});

function initDOMReferences() {
  canvas = document.getElementById('renderCanvas');
  ctx = canvas ? canvas.getContext('2d') : null;
}

// ============================================================================
// 1. API Services
// ============================================================================
async function loadCharacters() {
  try {
    const res = await fetch('/api/characters');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.characters = data.characters || [];
    renderCharacterVault();
  } catch (err) {
    console.warn('[Wiza] Using fallback local characters:', err.message);
  }
}

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('[Wiza] Models loaded:', Object.keys(data.models));
  } catch (err) {
    console.warn('[Wiza] Could not query models:', err.message);
  }
}

async function triggerGeneration() {
  if (state.isGenerating) return;

  const promptInput = document.getElementById('promptInput');
  const negativePromptInput = document.getElementById('negativePromptInput');
  const generateBtn = document.getElementById('generateBtn');
  const progressBox = document.getElementById('generationProgressBox');
  const progressBar = document.getElementById('generationProgressBar');
  const progressText = document.getElementById('generationProgressText');

  const prompt = promptInput ? promptInput.value.trim() : '';
  if (!prompt) {
    alert('Please enter a scenic prompt or screenplay action.');
    return;
  }

  state.isGenerating = true;
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⚡ GENERATING WITH WAN 2.1...</span>';
  }
  if (progressBox) progressBox.style.display = 'block';

  // Animate progress simulation
  let step = 0;
  const maxSteps = 35;
  const stepInterval = setInterval(() => {
    step++;
    const pct = Math.min(95, Math.round((step / maxSteps) * 100));
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressText) progressText.innerText = `Step ${step}/${maxSteps} - Latent Diffusion Denoising (${pct}%)`;
    if (step >= maxSteps) clearInterval(stepInterval);
  }, 50);

  try {
    const payload = {
      prompt,
      negativePrompt: negativePromptInput ? negativePromptInput.value : '',
      model: state.activeModel,
      aspectRatio: state.aspectRatio,
      duration: state.duration,
      fps: state.fps,
      characterId: state.selectedCharacterId,
      cameraMotion: state.cameraMotion,
      seed: Math.floor(Math.random() * 1000000),
      steps: maxSteps
    };

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    clearInterval(stepInterval);

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.innerText = 'Render Complete! Latent video materialized.';

    // Create new shot on timeline
    const newShot = {
      id: `shot_${Date.now().toString(36)}`,
      title: `Shot 0${state.shots.length + 1}: ${prompt.substring(0, 20)}...`,
      prompt,
      model: data.model,
      duration: data.durationSec,
      frames: data.totalFrames,
      aspectRatio: data.aspectRatio,
      characterId: state.selectedCharacterId,
      previewGradient: ['#090d16', '#d97706', '#f59e0b'],
      accentColor: '#f59e0b',
      metrics: data.renderMetrics
    };

    state.shots.push(newShot);
    state.activeShotIndex = state.shots.length - 1;
    renderTimeline();
    updateInspector(data);

    setTimeout(() => {
      if (progressBox) progressBox.style.display = 'none';
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>✨ RENDER SHOT WITH WAN 2.1</span>';
      }
      state.isGenerating = false;
    }, 800);

  } catch (err) {
    clearInterval(stepInterval);
    state.isGenerating = false;
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span>✨ RENDER SHOT WITH WAN 2.1</span>';
    }
    if (progressText) progressText.innerText = `Error: ${err.message}`;
    alert(`Generation error: ${err.message}`);
  }
}

// ============================================================================
// 2. UI Event Listeners & Binding
// ============================================================================
function bindEventListeners() {
  // Tabs switching
  document.querySelectorAll('.rail-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rail-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.rail-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(btn.dataset.target);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Model selection
  const modelSelect = document.getElementById('modelSelect');
  if (modelSelect) {
    modelSelect.addEventListener('change', (e) => {
      state.activeModel = e.target.value;
      const modelBadge = document.getElementById('topbarModelLabel');
      if (modelBadge) {
        modelBadge.innerText = e.target.options[e.target.selectedIndex].text.split('—')[0].trim();
      }
    });
  }

  // Aspect ratio
  const aspectSelect = document.getElementById('aspectSelect');
  const aspectFrame = document.getElementById('aspectFrame');
  if (aspectSelect) {
    aspectSelect.addEventListener('change', (e) => {
      state.aspectRatio = e.target.value;
      if (aspectFrame) {
        aspectFrame.className = 'viewport-aspect-frame';
        if (state.aspectRatio === '2.39:1') aspectFrame.classList.add('aspect-239');
        else if (state.aspectRatio === '9:16') aspectFrame.classList.add('aspect-916');
      }
      const resBadge = document.getElementById('topbarResBadge');
      if (resBadge) resBadge.innerText = state.aspectRatio === '2.39:1' ? '2.39:1 (4K)' : `${state.aspectRatio} (1080p)`;
    });
  }

  // Duration
  const durationSelect = document.getElementById('durationSelect');
  if (durationSelect) {
    durationSelect.addEventListener('change', (e) => {
      state.duration = parseFloat(e.target.value);
    });
  }

  // Prompt style chips
  document.querySelectorAll('.chip-tag').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptInput = document.getElementById('promptInput');
      if (!promptInput) return;
      const tagText = chip.dataset.tag || chip.innerText;
      if (!promptInput.value.includes(tagText)) {
        promptInput.value = promptInput.value.trim() + `, ${tagText}`;
        chip.classList.add('active');
      }
    });
  });

  // Camera Sliders
  const cameraControls = ['pan', 'tilt', 'zoom', 'dolly', 'crane', 'roll'];
  cameraControls.forEach(ctrl => {
    const slider = document.getElementById(`cam_${ctrl}`);
    const display = document.getElementById(`cam_${ctrl}_val`);
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.cameraMotion[ctrl] = val;
        display.innerText = val > 0 ? `+${val}` : `${val}`;
      });
    }
  });

  // Generate Button
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', triggerGeneration);
  }

  // Playback Controls
  const playBtn = document.getElementById('playPauseBtn');
  if (playBtn) {
    playBtn.addEventListener('click', togglePlayback);
  }

  const stepBackBtn = document.getElementById('stepBackBtn');
  if (stepBackBtn) {
    stepBackBtn.addEventListener('click', () => stepFrame(-1));
  }

  const stepForwardBtn = document.getElementById('stepForwardBtn');
  if (stepForwardBtn) {
    stepForwardBtn.addEventListener('click', () => stepFrame(1));
  }

  // Safe Guides Toggle
  const guidesBtn = document.getElementById('toggleGuidesBtn');
  const guidesOverlay = document.getElementById('viewportGuides');
  if (guidesBtn && guidesOverlay) {
    guidesBtn.addEventListener('click', () => {
      state.showGuides = !state.showGuides;
      guidesOverlay.style.display = state.showGuides ? 'grid' : 'none';
      guidesBtn.style.color = state.showGuides ? 'var(--accent-amber)' : 'var(--text-muted)';
    });
  }

  // Export Modal
  const openExportBtn = document.getElementById('openExportModalBtn');
  const exportModal = document.getElementById('exportModal');
  const closeExportBtn = document.getElementById('closeExportModalBtn');
  const cancelExportBtn = document.getElementById('cancelExportBtn');
  const confirmExportBtn = document.getElementById('confirmExportBtn');

  if (openExportBtn && exportModal) {
    openExportBtn.addEventListener('click', () => exportModal.classList.add('open'));
  }
  if (closeExportBtn && exportModal) {
    closeExportBtn.addEventListener('click', () => exportModal.classList.remove('open'));
  }
  if (cancelExportBtn && exportModal) {
    cancelExportBtn.addEventListener('click', () => exportModal.classList.remove('open'));
  }
  if (confirmExportBtn && exportModal) {
    confirmExportBtn.addEventListener('click', handleExport);
  }

  // New Character Modal
  const newCharBtn = document.getElementById('openNewCharBtn');
  const charModal = document.getElementById('newCharModal');
  const closeCharBtn = document.getElementById('closeCharModalBtn');
  const saveCharBtn = document.getElementById('saveCharBtn');

  if (newCharBtn && charModal) {
    newCharBtn.addEventListener('click', () => charModal.classList.add('open'));
  }
  if (closeCharBtn && charModal) {
    closeCharBtn.addEventListener('click', () => charModal.classList.remove('open'));
  }
  if (saveCharBtn && charModal) {
    saveCharBtn.addEventListener('click', handleSaveNewCharacter);
  }
}

// ============================================================================
// 3. Character Consistency Vault Management
// ============================================================================
function renderCharacterVault() {
  const container = document.getElementById('characterVaultList');
  if (!container) return;

  container.innerHTML = '';

  state.characters.forEach(char => {
    const isSelected = char.id === state.selectedCharacterId;
    const card = document.createElement('div');
    card.className = `character-card ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="char-card-header">
        <div class="char-avatar">${char.name.charAt(0)}</div>
        <div class="char-info">
          <div class="char-name">${char.name}</div>
          <div class="char-role">${char.role}</div>
        </div>
        <span class="char-token-badge">${char.promptTrigger}</span>
      </div>
      <div class="char-desc">${char.description}</div>
      <div class="char-metrics">
        <span>LoRA: <strong>${Math.round((char.loraWeight || 0.85) * 100)}%</strong></span>
        <span>Face-ID: <strong>${Math.round((char.faceIdWeight || 0.9) * 100)}%</strong></span>
        <span>Status: <strong style="color: var(--accent-emerald)">Locked</strong></span>
      </div>
    `;

    card.addEventListener('click', () => {
      state.selectedCharacterId = char.id;
      document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Update prompt input with character trigger token
      const promptInput = document.getElementById('promptInput');
      if (promptInput && !promptInput.value.includes(char.promptTrigger)) {
        promptInput.value = `${char.promptTrigger} ${promptInput.value.replace(/\[char:[^\]]+\]\s*/g, '')}`;
      }

      // Update active persona badge
      const personaBadge = document.getElementById('activePersonaBadge');
      if (personaBadge) personaBadge.innerText = char.name;
    });

    container.appendChild(card);
  });
}

async function handleSaveNewCharacter() {
  const nameInput = document.getElementById('charNameInput');
  const roleInput = document.getElementById('charRoleInput');
  const descInput = document.getElementById('charDescInput');
  const modal = document.getElementById('newCharModal');

  if (!nameInput || !descInput || !nameInput.value || !descInput.value) {
    alert('Please enter a name and detailed visual description.');
    return;
  }

  const payload = {
    name: nameInput.value,
    role: roleInput ? roleInput.value : 'Lead Persona',
    description: descInput.value,
    loraWeight: 0.85,
    faceIdWeight: 0.90
  };

  try {
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.characters.unshift(data.character);
    state.selectedCharacterId = data.character.id;
    renderCharacterVault();
    if (modal) modal.classList.remove('open');
    nameInput.value = '';
    if (roleInput) roleInput.value = '';
    descInput.value = '';
  } catch (err) {
    alert(`Could not save character: ${err.message}`);
  }
}

// ============================================================================
// 4. Cinematic Viewport & Canvas Renderer
// ============================================================================
function initCanvas() {
  if (!canvas) return;
  canvas.width = 1920;
  canvas.height = 1080;
}

function startPlaybackLoop() {
  let lastTime = performance.now();

  function loop(currentTime) {
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (state.isPlaying) {
      state.currentFrame = (state.currentFrame + delta * state.fps) % state.totalFrames;
      updatePlayheadUI();
    }

    renderCanvasFrame();
    animationFrameId = requestAnimationFrame(loop);
  }

  animationFrameId = requestAnimationFrame(loop);
}

function renderCanvasFrame() {
  if (!ctx || !canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const frame = Math.floor(state.currentFrame);
  const t = (state.currentFrame % 120) / 120; // local normalized time within shot

  const currentShot = state.shots[state.activeShotIndex] || state.shots[0];
  const char = state.characters.find(c => c.id === currentShot?.characterId) || state.characters[0];

  // 1. Draw Background / Cinematic Atmosphere
  const grad = ctx.createLinearGradient(0, 0, w, h);
  const colorA = currentShot.previewGradient ? currentShot.previewGradient[0] : '#0d0f12';
  const colorB = currentShot.previewGradient ? currentShot.previewGradient[1] : '#1e293b';
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Volumetric Lights & Camera Drift Simulation
  const panOffset = (state.cameraMotion.pan || 0) * t * 120;
  const tiltOffset = (state.cameraMotion.tilt || 0) * t * 80;
  const dollyScale = 1 + (state.cameraMotion.dolly || 1.0) * t * 0.15;

  ctx.save();
  ctx.translate(w / 2 + panOffset, h / 2 + tiltOffset);
  ctx.scale(dollyScale, dollyScale);

  // Atmospheric Glow Spotlights
  const radGrad = ctx.createRadialGradient(0, -100, 50, 0, -100, 600);
  radGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
  radGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.12)');
  radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(-w, -h, w * 2, h * 2);

  // Neon Horizontal Anamorphic Flare
  ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.fillRect(-w, -2, w * 2, 4);

  // 3. Cinematic Character Silhouette with Consistent Face ID Bounding Box
  if (char) {
    const charX = Math.sin(t * Math.PI * 0.5) * 30;
    const charY = 80 - Math.cos(t * Math.PI * 0.5) * 10;

    // Head Silhouette
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(charX, charY - 120, 70, 0, Math.PI * 2);
    ctx.fill();

    // Body Silhouette
    ctx.beginPath();
    ctx.moveTo(charX - 140, charY + 300);
    ctx.lineTo(charX - 60, charY - 50);
    ctx.lineTo(charX + 60, charY - 50);
    ctx.lineTo(charX + 140, charY + 300);
    ctx.closePath();
    ctx.fill();

    // Glowing Cybernetic Left Iris / Distinct Feature
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(charX - 18, charY - 125, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Face-ID Consistency Tracking Marker (Figma/Runway overlay)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(charX - 50, charY - 180, 100, 110);

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.fillText(`FACE-ID: ${char.name.toUpperCase()} (92%)`, charX - 50, charY - 190);
  }

  ctx.restore();

  // 4. Cinema HUD Watermark & Timecode
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(`WIZA WORKSTATION // WAN 2.1 (14B) // SHOT 0${state.activeShotIndex + 1}`, 40, h - 50);

  const tc = formatTimecode(state.currentFrame, state.fps);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
  ctx.fillText(`TC: ${tc} | FRAME: ${frame.toString().padStart(4, '0')}`, w - 280, h - 50);
}

function togglePlayback() {
  state.isPlaying = !state.isPlaying;
  const playBtn = document.getElementById('playPauseBtn');
  if (playBtn) {
    playBtn.innerHTML = state.isPlaying ? '❚❚' : '▶';
  }
}

function stepFrame(delta) {
  state.isPlaying = false;
  const playBtn = document.getElementById('playPauseBtn');
  if (playBtn) playBtn.innerHTML = '▶';

  state.currentFrame = Math.max(0, Math.min(state.totalFrames - 1, state.currentFrame + delta));
  updatePlayheadUI();
}

function formatTimecode(frame, fps = 24) {
  const totalSeconds = frame / fps;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const remFrames = Math.floor(frame % fps);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${remFrames.toString().padStart(2, '0')}`;
}

function updatePlayheadUI() {
  const tcEl = document.getElementById('canvasTimecode');
  if (tcEl) {
    tcEl.innerText = formatTimecode(state.currentFrame, state.fps);
  }

  const playhead = document.getElementById('timelinePlayhead');
  const tracksArea = document.getElementById('timelineTracksArea');
  if (playhead && tracksArea) {
    const trackWidth = tracksArea.clientWidth - 120; // subtract track-label width
    const pct = state.currentFrame / state.totalFrames;
    playhead.style.left = `${120 + pct * trackWidth}px`;
  }
}

// ============================================================================
// 5. Multi-Track Timeline Management
// ============================================================================
function renderTimeline() {
  const videoTrack = document.getElementById('videoTrackClips');
  const charTrack = document.getElementById('charTrackClips');
  const audioTrack = document.getElementById('audioTrackClips');

  if (videoTrack) {
    videoTrack.innerHTML = '';
    state.shots.forEach((shot, idx) => {
      const clip = document.createElement('div');
      clip.className = `clip-block ${idx === state.activeShotIndex ? 'active' : ''}`;
      clip.style.flex = `${shot.duration}`;
      clip.innerHTML = `<span>${shot.title}</span>`;
      clip.addEventListener('click', () => {
        state.activeShotIndex = idx;
        state.currentFrame = idx * 120;
        document.querySelectorAll('#videoTrackClips .clip-block').forEach(c => c.classList.remove('active'));
        clip.classList.add('active');
        updatePlayheadUI();
      });
      videoTrack.appendChild(clip);
    });
  }

  if (charTrack) {
    charTrack.innerHTML = `
      <div class="clip-block clip-char" style="flex: 1;">
        <span>Persona Layer: Elena Rostova (Face-ID & LoRA Consistent)</span>
      </div>
    `;
  }

  if (audioTrack) {
    audioTrack.innerHTML = `
      <div class="clip-block clip-audio" style="flex: 1;">
        <span>Cinematic Score & Dialogue: Master 24-bit 48kHz</span>
      </div>
    `;
  }
}

// ============================================================================
// 6. Inspector & Export Flow
// ============================================================================
function updateInspector(data) {
  const modelVal = document.getElementById('spec_model');
  const resVal = document.getElementById('spec_resolution');
  const fpsVal = document.getElementById('spec_fps');
  const vramVal = document.getElementById('spec_vram');

  if (modelVal) modelVal.innerText = data.modelName || 'Wan 2.1 (14B)';
  if (resVal) resVal.innerText = data.renderMetrics?.outputResolution || '1920x1080';
  if (fpsVal) fpsVal.innerText = `${data.fps} fps`;
  if (vramVal) vramVal.innerText = `${data.renderMetrics?.vramAllocatedGb} GB`;
}

async function handleExport() {
  const formatSelect = document.getElementById('exportFormatSelect');
  const resSelect = document.getElementById('exportResSelect');
  const exportModal = document.getElementById('exportModal');
  const confirmBtn = document.getElementById('confirmExportBtn');

  const format = formatSelect ? formatSelect.value : 'mp4';
  const resolution = resSelect ? resSelect.value : '1080p';

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Assembling High-Resolution Render...';
  }

  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format,
        resolution,
        fps: state.fps,
        shots: state.shots
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    alert(`🎬 Render Complete!\nFormat: ${data.codec}\nResolution: ${data.resolution}\nFile: ${data.filename}\nSize: ~${data.estimatedFileSizeMb} MB`);
    if (exportModal) exportModal.classList.remove('open');
  } catch (err) {
    alert(`Export failed: ${err.message}`);
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerText = 'Start Render & Export';
    }
  }
}
