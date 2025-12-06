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
  Vector3,
  WebGLRenderer,
} from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

import { TimelineDriver, TIMELINE_DURATION_MS } from './timeline.js';
import { CameraRig } from './cameraRig.js';
import { Asteroid } from './asteroid.js';

const app = document.getElementById('app');

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(app.clientWidth, app.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(0x04060f);
scene.fog = new FogExp2(0x04060f, 0.015);

const camera = new PerspectiveCamera(60, app.clientWidth / app.clientHeight, 0.1, 2000);
camera.position.set(0, 6, 16);

// Ambient light - reduced for night realism
const ambient = new AmbientLight(0x8899aa, 0.4);
scene.add(ambient);

// Primary moonlight - key light
const moonLight = new DirectionalLight(0xbdd3ff, 1.4);
moonLight.position.set(-8, 12, 6);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
scene.add(moonLight);

// Rim light - helps asteroid read against dark sky
const rimLight = new DirectionalLight(0x4466aa, 0.6);
rimLight.position.set(10, 8, -12);
rimLight.castShadow = false;
scene.add(rimLight);

// Subtle fill light from below (reflected from ground)
const fillLight = new AmbientLight(0x445566, 0.15);
scene.add(fillLight);

const groundGeo = new PlaneGeometry(120, 120, 40, 40);
groundGeo.rotateX(-Math.PI / 2);

const groundMaterial = new MeshStandardMaterial({ color: 0x0b0d13, roughness: 0.9, metalness: 0.05 });
const ground = new Mesh(groundGeo, groundMaterial);
ground.receiveShadow = true;
scene.add(ground);

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

  const material = new PointsMaterial({ color: 0xcdd6f4, size: 1.2, sizeAttenuation: true });
  const stars = new Points(geometry, material);
  scene.add(stars);
}

buildStars();

// Initialize quality setting
let quality = 'High';

// Initialize cinematic systems
console.log('Initializing cinematic systems...');
const timeline = new TimelineDriver(TIMELINE_DURATION_MS);
const cameraRig = new CameraRig(camera);

console.log('Creating asteroid with quality:', quality);
const asteroid = new Asteroid(quality);
asteroid.addToScene(scene);
console.log('Asteroid added to scene');

// Auto-start the timeline on load for immediate visual feedback
timeline.restart(performance.now());
console.log('Timeline started, playing:', timeline.playing);

const overlay = document.createElement('div');
overlay.className = 'ui-overlay';

const controls = document.createElement('div');
controls.className = 'controls';
overlay.appendChild(controls);

const playButton = document.createElement('button');
playButton.textContent = 'Play / Restart';
controls.appendChild(playButton);

const qualityButton = document.createElement('button');
qualityButton.textContent = `Quality: ${quality}`;
controls.appendChild(qualityButton);

const status = document.createElement('div');
status.className = 'status';
status.textContent = 'Timeline idle';
overlay.appendChild(status);

app.appendChild(overlay);

playButton.addEventListener('click', () => {
  if (timeline.playing) {
    timeline.stop();
    status.textContent = 'Timeline stopped';
  } else {
    // Reset all systems for deterministic replay
    timeline.restart(performance.now());
    asteroid.reset();
    cameraRig.reset();
    status.textContent = 'Timeline playing…';
  }
});

qualityButton.addEventListener('click', () => {
  quality = quality === 'High' ? 'Low' : 'High';
  qualityButton.textContent = `Quality: ${quality}`;

  // Update asteroid quality
  asteroid.setQuality(quality);

  // Update renderer settings based on quality
  if (quality === 'Low') {
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
  }
});

window.addEventListener('resize', () => {
  const { clientWidth, clientHeight } = app;
  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
});

// Animation loop
let lastTime = performance.now();

function animate(now) {
  now = now ?? performance.now();
  const deltaTime = (now - lastTime) / 1000; // Convert to seconds
  lastTime = now;

  // Update timeline
  timeline.update(now);

  // Update asteroid motion
  asteroid.update(timeline, deltaTime);

  // Update camera rig (tracking asteroid)
  cameraRig.update(timeline, asteroid.getPosition());

  // Update status display
  const phase = timeline.getCurrentPhase();
  const shakePercent = (cameraRig.shakeIntensity * 100).toFixed(0);
  status.textContent = `${timeline.playing ? '▶' : '⏸'} ${phase.name} | T: ${timeline.t.toFixed(3)} | Shake: ${shakePercent}%`;

  // Render
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
