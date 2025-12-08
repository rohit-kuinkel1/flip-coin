import './style.css';
import { SceneSetup } from './scene';
import { CoinMesh } from './coin-mesh';
/**
 * TrajectoryReplay transforms high-frequency simulation frames into
 * time-indexed snapshots that the renderer can consume at the display
 * framerate. Without this indirection, we would either miss frames
 * (undersampling) or stall the UI (rendering every physics tick).
 */
import { TrajectoryReplay } from './replay';
import { debugFlipCoin, type DebugFlipOptions } from 'flip-coin/debug';

/**
 * Visualization configuration keeps rendered geometry consistent with
 * the physics engine defaults. Using the same dimensions (radius = 12mm,
 * thickness = 2mm) ensures the inertia tensor used during simulation
 * matches the mesh scale, preventing visual drift between physics and
 * graphics.
 */
const COIN_RADIUS = 0.012;
const COIN_THICKNESS = 0.002;

/**
 * Runtime state for the visualization loop. We keep references to the
 * Three.js scene, the coin mesh instance, and an optional replay helper
 * that feeds poses into the renderer.
 */
let sceneSetup: SceneSetup;
let coinMesh: CoinMesh;
let replay: TrajectoryReplay | null = null;
let playbackTime: number = 0;
let isPlaying: boolean = false;
/**
 * Playback rate for the replay loop.
 * -> TIME_SCALE = 1.0 renders in real time.
 * -> TIME_SCALE < 1.0 produces slow motion for analysis.
 */
const TIME_SCALE = 1.0;
/**
 * Flag to automatically halt playback once the trajectory finishes (after
 * the small overrun margin). Keeping this false leaves the final settled
 * pose visible indefinitely; setting it true stops the render loop from
 * advancing the replay clock once the animation completes.
 */
const AUTO_STOP_AFTER_REPLAY = false;

async function init() {
  const appContainer = document.getElementById('app');
  if (!appContainer) throw new Error('App container not found');

  sceneSetup = new SceneSetup(appContainer);

  coinMesh = new CoinMesh(COIN_RADIUS, COIN_THICKNESS);
  coinMesh.addToScene(sceneSetup.scene);

  setupUI();
  animate();

  await runSimulation();
}

function setupUI() {
  const uiDiv = document.createElement('div');
  uiDiv.id = 'ui';
  uiDiv.innerHTML = `
    <div>
      <button id="btn-flip">Flip Coin</button>
      <div class="stats" id="stats">Ready</div>
    </div>
  `;
  document.body.appendChild(uiDiv);

  document.getElementById('btn-flip')?.addEventListener('click', () => {
    runSimulation();
  });
}

function updateStats(text: string) {
  const el = document.getElementById('stats');
  if (el) el.innerText = text;
}

async function runSimulation() {
  updateStats('Simulating...');
  isPlaying = false;

  try {
    const options: DebugFlipOptions = {
      recordTrajectory: true,
      coin: {
        radius: COIN_RADIUS,
        thickness: COIN_THICKNESS
      },
      tossProfile: {
        /**
         * Toss profile biases toward a visible arc by raising the release
         * height. Using [0.3, 0.5] meters keeps the coin in frame long enough
         * for the camera to capture multiple bounces before it settles.
         */
        heightRange: [0.3, 0.5],
      }
    };

    const result = await debugFlipCoin(options);

    updateStats(`Result: ${result.outcome.toUpperCase()}\nTime: ${result.stats.simulationTime.toFixed(2)}ms\nBounces: ${result.stats.bounceCount}`);

    /**
     * Initialize the replay helper with the recorded trajectory so the
     * render loop can seek into the physics timeline on each frame.
     */
    if (result.trajectory) {
      replay = new TrajectoryReplay(result.trajectory);
      playbackTime = 0;
      isPlaying = true;
    }

    console.log('Simulation complete', result);

  } catch (err) {
    console.error(err);
    updateStats('Error during simulation');
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (isPlaying && replay) {
    /**
     * Advance the playback clock in render-time units (seconds). At 60 FPS,
     * each frame advances by roughly 1/60 s; scaling lets us slow or speed
     * playback without re-running the physics simulation.
     *
     * Example with TIME_SCALE = 0.5:
     * -> Per-frame delta = (1/60) * 0.5 ≈ 0.0083 s
     * -> Visual playback runs at half speed while physics remains unchanged.
     */
    playbackTime += (1 / 60) * TIME_SCALE;

    /**
     * Query the replay buffer for the pose corresponding to the current
     * playback time and update the rendered coin if a frame is available.
     */
    const state = replay.getStateAtTime(playbackTime);

    if (state) {
      coinMesh.updateState(state.position, state.orientation);
    }

    if (playbackTime > replay.duration + 0.5) {
      /**
       * Allow a small overrun so the final settled pose remains visible
       * before stopping playback. If auto-stop is enabled, freeze the
       * playback clock to avoid advancing past the final state.
       */
      if (AUTO_STOP_AFTER_REPLAY) {
        isPlaying = false;
      }
    }
  }

  sceneSetup.render();
}

init().catch(console.error);
