// Logical game-field size. Everything is simulated in these units and the
// whole field is scaled to fit the device screen.
export const FIELD_W = 320;
export const FIELD_H = 440;
export const FLOOR_Y = 396; // top of the icy floor (where the stick figure's feet are)

// Stick figure
export const FIGURE_HEIGHT = 58;
export const HEAD_R = 8;
export const BODY_HALF_W = 7;

// Slippery floor physics
export const RUN_ACCEL = 820; // px/s² while holding a direction
export const ICE_FRICTION = 0.55; // per-second exponential decay of velocity (low = slippery)
export const MAX_SPEED = 300;
export const WALL_BOUNCE = 0.45;

// Poop
export const POOP_MIN_R = 9;
export const POOP_MAX_R = 15;
export const SPLAT_LIFETIME = 1.6;

// Difficulty ramps with time survived (seconds)
export function spawnInterval(t: number) {
  return Math.max(0.16, 0.85 - t * 0.018);
}
export function fallSpeed(t: number) {
  return Math.min(520, 150 + t * 7) + Math.random() * 70;
}
