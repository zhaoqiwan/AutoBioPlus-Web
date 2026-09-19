import * as GaussianSplats3D from 'https://cdn.jsdelivr.net/npm/@mkkellogg/gaussian-splats-3d@0.4.7/build/gaussian-splats-3d.module.js';

const modal = document.querySelector('#gaussian-modal');
const stage = document.querySelector('#gaussian-stage');
const status = document.querySelector('#gaussian-status');
const title = document.querySelector('#gaussian-title');
const closeButton = document.querySelector('.gaussian-close');
let viewer = null;
let opener = null;

function disposeViewer() {
  if (viewer) {
    viewer.dispose();
    viewer = null;
  }
  stage.querySelectorAll('canvas').forEach((canvas) => canvas.remove());
}

function closeModal() {
  disposeViewer();
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  opener?.focus();
}

async function openScene(button) {
  const scene = button.dataset.scene;
  opener = button;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  title.textContent = `Lab ${scene} · Interactive Gaussian Scene`;
  status.hidden = false;
  status.textContent = 'Loading scene…';
  closeButton.focus();

  try {
    viewer = new GaussianSplats3D.Viewer({
      rootElement: stage,
      cameraUp: [0, 0, 1],
      initialCameraPosition: [0, -12, 2.2],
      initialCameraLookAt: [0, 0, 0],
      sharedMemoryForWorkers: false,
      gpuAcceleratedSort: false,
      integerBasedSort: false,
      ignoreDevicePixelRatio: true,
      halfPrecisionCovariancesOnGPU: true,
      inMemoryCompressionLevel: 1,
    });
    await viewer.addSplatScene(`media/gaussian-scenes/lab${scene}.splat`, {
      splatAlphaRemovalThreshold: 1,
      showLoadingUI: true,
      progressiveLoad: false,
    });
    status.hidden = true;
    viewer.start();
  } catch (error) {
    console.error(error);
    status.hidden = false;
    status.textContent = 'Unable to load the 3D scene. Please try a current Chrome or Edge browser.';
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
