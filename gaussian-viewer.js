import * as GaussianSplats3D from 'https://cdn.jsdelivr.net/npm/@mkkellogg/gaussian-splats-3d@0.4.7/build/gaussian-splats-3d.module.js';

const modal = document.querySelector('#gaussian-modal');
const stage = document.querySelector('#gaussian-stage');
const status = document.querySelector('#gaussian-status');
const title = document.querySelector('#gaussian-title');
const closeButton = document.querySelector('.gaussian-close');
let viewer = null;
let opener = null;
let generation = 0;
let loading = null;
let watchdog = null;

// Front-camera poses from the simulator, transformed into the normalized and
// azimuth-corrected coordinate system used by the web .splat assets.
const sceneCameraProfiles = {
  1: { position: [-1.59901, -0.48730, -0.12296], lookAt: [0.62327, -3.31277, -1.87743], up: [0.26232, -0.35167, 0.89862] },
  2: { position: [0.36955, -2.56940, -0.31730], lookAt: [0.90067, -6.52706, -0.55152], up: [0.00779, -0.05804, 0.99828] },
  3: { position: [-1.04053, 0.32951, 0.10497], lookAt: [-1.61589, -3.21885, -1.64950], up: [-0.08128, -0.43114, 0.89862] },
  4: { position: [0.68745, 2.53681, -0.08610], lookAt: [2.39370, 5.97988, -1.19695], up: [0.13515, 0.24294, 0.96058] },
  5: { position: [-1.04875, -3.18924, -0.24041], lookAt: [-1.05473, -3.49284, -0.47044], up: [0, 0, 1] },
  6: { position: [1.47564, -2.43748, -0.34399], lookAt: [1.77940, -6.05312, -2.02770], up: [0.03524, -0.41945, 0.90709] },
};

const retry = document.createElement('button');
retry.type = 'button';
retry.textContent = 'Retry loading';
retry.hidden = true;
retry.className = 'gaussian-retry';
stage.appendChild(retry);
retry.addEventListener('click', () => openScene(opener));

function disposeViewer() {
  clearTimeout(watchdog);
  loading?.abort?.();
  loading = null;
  if (viewer) {
    const previous = viewer;
    viewer = null;
    Promise.resolve(previous.dispose()).catch(console.error);
  }
}

function closeModal() {
  generation++;
  disposeViewer();
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  opener?.focus();
}

async function openScene(button) {
  const request = ++generation;
  disposeViewer();
  // Each viewer owns its container, so a previous asynchronous dispose cannot
  // remove the next viewer's canvas or loading UI.
  stage.querySelectorAll('.gaussian-render-root').forEach((root) => root.remove());
  const root = document.createElement('div');
  root.className = 'gaussian-render-root';
  root.style.cssText = 'position:absolute;inset:0';
  stage.appendChild(root);
  retry.hidden = true;
  const scene = button.dataset.scene;
  const cameraProfile = sceneCameraProfiles[scene];
  opener = button;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  title.textContent = `Lab ${scene} · Interactive Gaussian Scene`;
  status.hidden = false;
  status.textContent = 'Connecting to scene download…';
  closeButton.focus();

  const armTimeout = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (request !== generation) return;
      generation++;
      disposeViewer();
      status.hidden = false;
      status.textContent = 'Loading stalled. Check your connection and retry.';
      retry.hidden = false;
    }, 90000);
  };
  armTimeout();

  try {
    viewer = new GaussianSplats3D.Viewer({
      rootElement: root,
      cameraUp: cameraProfile.up,
      initialCameraPosition: cameraProfile.position,
      initialCameraLookAt: cameraProfile.lookAt,
      sharedMemoryForWorkers: false,
      gpuAcceleratedSort: false,
      integerBasedSort: false,
      ignoreDevicePixelRatio: true,
      halfPrecisionCovariancesOnGPU: true,
      inMemoryCompressionLevel: 1,
    });
    const currentViewer = viewer;
    // Render partial data while the full-resolution file continues downloading.
    currentViewer.start();
    // Keep the interactive view close to the simulator's front-camera view so
    // the shared laboratory scan is not exposed from extreme angles.
    const controls = currentViewer.controls;
    if (controls) {
      const azimuth = controls.getAzimuthalAngle();
      const polar = controls.getPolarAngle();
      const horizontalLimit = Math.PI / 4;
      const verticalLimit = Math.PI / 6;
      controls.minAzimuthAngle = azimuth - horizontalLimit;
      controls.maxAzimuthAngle = azimuth + horizontalLimit;
      controls.minPolarAngle = Math.max(0.1, polar - verticalLimit);
      controls.maxPolarAngle = Math.min(Math.PI * 0.9, polar + verticalLimit);
    }
    loading = currentViewer.addSplatScene(`media/gaussian-scenes/lab${scene}.splat`, {
      splatAlphaRemovalThreshold: 1,
      showLoadingUI: false,
      progressiveLoad: true,
      onProgress: (percent, label, phase) => {
        if (request !== generation) return;
        armTimeout();
        status.hidden = false;
        if (phase === 0 && Number.isFinite(percent) && percent >= 100) {
          status.hidden = true;
        } else {
          status.textContent = phase === 0
            ? `Downloading full scene${Number.isFinite(percent) ? `: ${Math.round(percent)}%` : '…'}`
            : 'Preparing 3D scene…';
        }
        if (phase === 2 || (phase === 0 && Number.isFinite(percent) && percent >= 100)) {
          clearTimeout(watchdog);
          status.hidden = true;
        }
      },
    });
    await loading;
    if (request !== generation) return;
    clearTimeout(watchdog);
    loading = null;
    status.hidden = true;
  } catch (error) {
    if (request !== generation) return;
    clearTimeout(watchdog);
    console.error(error);
    status.hidden = false;
    status.textContent = 'Unable to load the 3D scene. Please try a current Chrome or Edge browser.';
    retry.hidden = false;
  }
}

document.querySelectorAll('.scene-launch').forEach((button) => {
  button.addEventListener('click', () => openScene(button));
});

closeButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.hidden) closeModal();
});
