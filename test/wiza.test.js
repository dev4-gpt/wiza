/**
 * Wiza — Integration and Unit Test Suite
 * Tests Standalone Server API, Wan 2.1 & SkyReels Inference,
 * Character Consistency Vault, Camera Trajectory Rig, and Video Export.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { handleRequest, SUPPORTED_MODELS } from '../server.js';

class MockRequest extends EventEmitter {
  constructor(method, url, body = null) {
    super();
    this.method = method;
    this.url = url;
    this.headers = { host: 'localhost:4040' };
    this.body = body;
  }

  send() {
    process.nextTick(() => {
      if (this.body) {
        this.emit('data', JSON.stringify(this.body));
      }
      this.emit('end');
    });
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
    this.ended = false;
    this.donePromise = new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.entries(headers).forEach(([k, v]) => this.setHeader(k, v));
  }

  end(chunk = '') {
    if (chunk) this.body += chunk.toString();
    this.ended = true;
    if (this._resolve) this._resolve(this);
  }

  json() {
    return JSON.parse(this.body);
  }
}

async function invokeRoute(method, url, body = null) {
  const req = new MockRequest(method, url, body);
  const res = new MockResponse();
  handleRequest(req, res);
  req.send();
  await res.donePromise;
  return res;
}

describe('Wiza Generative Cinema Workstation API Tests', () => {
  test('GET /api/health returns nominal workstation status', async () => {
    const res = await invokeRoute('GET', '/api/health');
    assert.strictEqual(res.statusCode, 200);
    const data = res.json();
    assert.strictEqual(data.status, 'nominal');
    assert.strictEqual(data.product, 'Wiza Generative Cinema Workstation');
    assert.strictEqual(data.version, '1.0.0');
    assert(data.activeModels >= 3, 'Should have at least 3 active models');
  });

  test('GET /api/models exposes Wan 2.1 (14B/1.3B) and SkyReels-V2', async () => {
    const res = await invokeRoute('GET', '/api/models');
    assert.strictEqual(res.statusCode, 200);
    const data = res.json();
    
    assert(data.models['wan-2.1-t2v-14b'], 'Must support Wan 2.1 (14B)');
    assert(data.models['wan-2.1-t2v-1.3b'], 'Must support Wan 2.1 (1.3B)');
    assert(data.models['skyreels-v2'], 'Must support SkyReels-V2');
    
    const wan14b = data.models['wan-2.1-t2v-14b'];
    assert.strictEqual(wan14b.nativeFps, 24);
    assert(wan14b.architecture.includes('Video Diffusion Transformer'));
  });

  test('GET /api/characters returns character consistency vault', async () => {
    const res = await invokeRoute('GET', '/api/characters');
    assert.strictEqual(res.statusCode, 200);
    const data = res.json();
    assert(Array.isArray(data.characters));
    assert(data.characters.length >= 2, 'Should have default personas');
    const elena = data.characters.find(c => c.name === 'Elena Rostova');
    assert(elena, 'Elena Rostova must exist in vault');
    assert.strictEqual(elena.promptTrigger, '[char:elena_01]');
  });

  test('POST /api/characters creates and stores new persona profile', async () => {
    const newPersona = {
      name: 'Agent Kaelen',
      role: 'Sub-Orbital Pilot',
      description: 'Short dark buzzcut, scar across right eyebrow, slate gray flight suit with illuminated telemetry seams.',
      loraWeight: 0.88,
      faceIdWeight: 0.94
    };

    const res = await invokeRoute('POST', '/api/characters', newPersona);
    assert.strictEqual(res.statusCode, 201);
    const data = res.json();
    assert.strictEqual(data.character.name, 'Agent Kaelen');
    assert.strictEqual(data.character.promptTrigger, '[char:agent_kaelen]');
    assert.strictEqual(data.character.faceIdWeight, 0.94);
  });

  test('POST /api/generate rejects empty prompt with 400', async () => {
    const res = await invokeRoute('POST', '/api/generate', { prompt: '   ' });
    assert.strictEqual(res.statusCode, 400);
    const data = res.json();
    assert(data.error.includes('Prompt is required'));
  });

  test('POST /api/generate with Wan 2.1 dispatches video generation with 6-DOF camera rig', async () => {
    const payload = {
      prompt: 'Cinematic wide shot flying through rainy neo-Tokyo street',
      model: 'wan-2.1-t2v-14b',
      duration: 5.0,
      aspectRatio: '2.39:1',
      fps: 24,
      cameraMotion: { pan: 0.5, tilt: -0.2, zoom: 0.3, dolly: 1.2, crane: 0, roll: 0 }
    };

    const res = await invokeRoute('POST', '/api/generate', payload);
    assert.strictEqual(res.statusCode, 200);
    const data = res.json();
    assert.strictEqual(data.status, 'completed');
    assert.strictEqual(data.model, 'wan-2.1-t2v-14b');
    assert.strictEqual(data.durationSec, 5.0);
    assert.strictEqual(data.aspectRatio, '2.39:1');
    assert.strictEqual(data.totalFrames, 120);
    assert(data.cameraWaypointsSample.length > 0, 'Camera trajectory must be populated');
    assert.strictEqual(data.renderMetrics.outputResolution, '1920x804');
  });

  test('POST /api/generate with Character Consistency injects Face-ID descriptors', async () => {
    const payload = {
      prompt: 'Elena standing on rainy skyscraper ledge at sunset',
      model: 'wan-2.1-t2v-14b',
      characterId: 'char_elena_01',
      duration: 5.0
    };

    const res = await invokeRoute('POST', '/api/generate', payload);
    assert.strictEqual(res.statusCode, 200);
    const data = res.json();
    assert(data.characterConsistency, 'Character consistency metadata must be present');
    assert.strictEqual(data.characterConsistency.name, 'Elena Rostova');
    assert(data.prompt.includes('[char:elena_01]'), 'Prompt must contain character trigger token');
    assert(data.prompt.includes('Athletic build'), 'Prompt must contain character visual description');
  });

  test('POST /api/export packages high-res ProRes and MP4 renders', async () => {
    const payload = {
      format: 'prores',
      resolution: '4k',
      fps: 24,
      shots: [{ id: 'shot_1' }, { id: 'shot_2' }]
    };

    const res = await invokeRoute('POST', '/api/export', payload);
    assert.strictEqual(res.statusCode, 200);
    const data = res.json();
    assert.strictEqual(data.format, 'prores');
    assert.strictEqual(data.codec, 'Apple ProRes 422 HQ');
    assert.strictEqual(data.resolution, '4k');
    assert.strictEqual(data.shotCount, 2);
    assert(data.downloadUrl.endsWith('.mov'));
  });

  test('GET / serves HTML UI without geospatial globe bloat', async () => {
    const res = await invokeRoute('GET', '/');
    assert.strictEqual(res.statusCode, 200);
    const html = res.body;
    assert(html.includes('WIZA'));
    assert(html.includes('Wan 2.1'));
    assert(html.includes('SkyReels-V2'));
    assert(html.includes('CHARACTER CONSISTENCY VAULT'));
    // Ensure no satellite or cesium globe telemetry in the clean studio
    assert(!html.includes('Cesium.Ion'), 'Should not contain Cesium');
    assert(!html.includes('celestrak'), 'Should not contain Celestrak');
    assert(!html.includes('opensky'), 'Should not contain OpenSky');
  });
});
