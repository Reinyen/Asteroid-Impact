import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

// ============================================================================
// Setup
// ============================================================================

const app = document.getElementById('app');

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(0x04060f);
scene.fog = new FogExp2(0x04060f, 0.015);

const camera = new PerspectiveCamera(60, app.clientWidth / app.clientHeight, 0.1, 2000);
camera.position.set(0, 6, 16);
camera.lookAt(0, 0, 0);

// ============================================================================
// Lighting
// ============================================================================

const ambient = new AmbientLight(0x8899aa, 0.6);
scene.add(ambient);

const moonLight = new DirectionalLight(0xbdd3ff, 1.1);
moonLight.position.set(-8, 12, 6);
scene.add(moonLight);

// ============================================================================
// Ground
// ============================================================================

const groundGeo = new PlaneGeometry(120, 120);
groundGeo.rotateX(-Math.PI / 2);

const groundMaterial = new MeshStandardMaterial({
  color: 0x0b0d13,
  roughness: 0.9,
  metalness: 0.05
});
const ground = new Mesh(groundGeo, groundMaterial);
scene.add(ground);

// ============================================================================
// Night Sky (Stars)
// ============================================================================

function buildStars(count = 450) {
  const positions = [];
  for (let i = 0; i < count; i += 1) {
    const radius = 80 + Math.random() * 220;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.55;
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi) + 12;
    const z = radius * Math.sin(theta) * Math.sin(phi);
    positions.push(x, y, z);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const material = new PointsMaterial({
    color: 0xcdd6f4,
    size: 1.2,
    sizeAttenuation: true
  });
  const stars = new Points(geometry, material);
  scene.add(stars);
}

buildStars();

// ============================================================================
// Timeline Driver (Stub)
// ============================================================================

class TimelineDriver {
  constructor(durationMs) {
    this.duration = durationMs;
    this.playing = false;
    this.t = 0;
    this._startTime = null;
  }

  restart(startTimeMs) {
    this.playing = true;
    this._startTime = startTimeMs ?? performance.now();
    this.t = 0;
  }

  stop() {
    this.playing = false;
    this._startTime = null;
    this.t = 0;
  }

  update(nowMs) {
    if (!this.playing || this._startTime === null) return this.t;
    const elapsed = nowMs - this._startTime;
    const looped = elapsed % this.duration;
    this.t = Math.min(1, looped / this.duration);
    return this.t;
  }
}

const timeline = new TimelineDriver(12000);

// ============================================================================
// UI Overlay
// ============================================================================

const overlay = document.createElement('div');
overlay.className = 'ui-overlay';

const controls = document.createElement('div');
controls.className = 'controls';
overlay.appendChild(controls);

const playButton = document.createElement('button');
playButton.textContent = 'Play / Restart';
controls.appendChild(playButton);

const qualityButton = document.createElement('button');
let quality = 'High';
qualityButton.textContent = `Quality: ${quality}`;
controls.appendChild(qualityButton);

const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Timeline idle';
overlay.appendChild(status);

app.appendChild(overlay);

// ============================================================================
// Event Handlers
// ============================================================================

playButton.addEventListener('click', () => {
  if (timeline.playing) {
    timeline.stop();
    status.textContent = 'Timeline stopped';
  } else {
    timeline.restart(performance.now());
    status.textContent = 'Timeline playing…';
  }
});

qualityButton.addEventListener('click', () => {
  quality = quality === 'High' ? 'Low' : 'High';
  qualityButton.textContent = `Quality: ${quality}`;
  // Stub: No rendering changes implemented
});

window.addEventListener('resize', () => {
  const { clientWidth, clientHeight } = app;
  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
});

// ============================================================================
// Animation Loop
// ============================================================================

function animate(now) {
  now = now ?? performance.now();

  // Update timeline
  timeline.update(now);

  // Update status display
  status.textContent = `${timeline.playing ? 'Playing' : 'Idle'} — T: ${timeline.t.toFixed(3)}`;

  // Render scene
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
