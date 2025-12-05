## REQUIREMENT
Implement a library in TypeScript that will expose a single function flipCoin() that simulates a real coin toss using 3D physics. The goal here is to make something that appears to be very trivial, something like a coin flip that use pseudo random number generator, but make it as close to real coin flip as possible and in the process, make it as complex as possible. We should not use Math.random() or any weak pre built pseudo random number generator for the outcome. Ideally, the source of entropy will be quantum based, but in case its not available for whatever reason (no internet etc), we should switch to OS specific random number generator. Even if the internals of the library were to be leaked, there should be no way to predict the outcome of the coin flip. So security through obscurity is not an option. The library should model the coin as a rigid body with:

- radius
- thickness
- mass
- initial position and orientation in 3D space
- initial linear velocity vector
- initial angular velocity vector
- Include gravity, air drag, and torque effects.
- Integrate the motion over time using a numerical method (Euler or RK4) until the coin comes to rest.
- Implement collision detection with a flat horizontal surface:
- Compute impulses for bounces
- Apply dampening for energy loss
- Introduce tiny perturbations in initial conditions to mimic real-world unpredictability.
- After the coin stabilizes, determine which face is up (heads or tails) based on the coin’s orientation.
- Expose flipCoin() as an async function that returns "heads" or "tails".
- Provide configurable parameters for:
- coin mass, radius, thickness
- initial linear and angular velocity ranges
- air drag coefficient and damping
- Include a small simulation loop with a fixed timestep and stop criteria based on coin angular velocity threshold.
- Structure the code cleanly, with separate functions/classes for rigid body dynamics, collisions, and coin state evaluation.
- Extra points if you include optional visualization with a 3D canvas (Three.js or similar) for debugging.