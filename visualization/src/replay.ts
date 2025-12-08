import type { RigidBodyState } from 'flip-coin/debug';

export class TrajectoryReplay {
    private trajectory: RigidBodyState[];
    private dt: number;

    constructor(trajectory: RigidBodyState[], dt: number = 0.0001) {
        this.trajectory = trajectory;
        this.dt = dt;
    }

    public getStateAtTime(time: number): RigidBodyState | null {
        if (this.trajectory.length === 0) return null;

        const frameIndex = Math.floor(time / this.dt);

        if (frameIndex < 0) {
            return this.trajectory[0];
        }

        if (frameIndex >= this.trajectory.length) {
            return this.trajectory[this.trajectory.length - 1];
        }

        /**
         * Interpolation strategy:
         *
         * The simulation produces frames at ~10kHz (dt = 0.0001s) while the
         * renderer updates at ~60Hz (≈0.0167s). Nearest-neighbor sampling is
         * already visually smooth because each render frame spans ~167 physics
         * steps:
         * -> physicsStepsPerFrame = 0.0167 / 0.0001 ≈ 167
         *
         * If sub-frame smoothing is ever needed, linear interpolation between
         * consecutive states could be added here by computing:
         * -> α = fractional(time / dt)
         * -> state = lerp(frameIndex, frameIndex + 1, α)
         *
         * For now, step sampling keeps the implementation simple without
         * noticeable stutter at this timestep ratio.
         */
        return this.trajectory[frameIndex];
    }

    public get duration(): number {
        return this.trajectory.length * this.dt;
    }
}
