import {
  BODY_HALF_W,
  FIELD_W,
  FIGURE_HEIGHT,
  FLOOR_Y,
  HEAD_R,
  ICE_FRICTION,
  MAX_SPEED,
  POOP_MAX_R,
  POOP_MIN_R,
  RUN_ACCEL,
  SPLAT_LIFETIME,
  WALL_BOUNCE,
  fallSpeed,
  spawnInterval,
} from './constants';

export type Dir = -1 | 0 | 1;
export type Phase = 'ready' | 'playing' | 'dead';

export type Poop = {
  id: number;
  x: number;
  y: number; // center
  vy: number;
  r: number;
  rot: number; // degrees, for drawing
  wobble: number; // phase of the side-to-side tumble
};

export type Splat = { id: number; x: number; r: number; age: number };

export type Player = {
  x: number; // center
  vx: number;
  dir: Dir; // current input
  stride: number; // animation phase for legs/arms
  lean: number; // smoothed body lean in degrees, for drawing
};

export type GameState = {
  phase: Phase;
  t: number; // seconds survived this round
  deadFor: number; // seconds since getting hit
  player: Player;
  poops: Poop[];
  splats: Splat[];
  spawnTimer: number;
  nextId: number;
  dodged: number;
};

export function createGame(): GameState {
  return {
    phase: 'ready',
    t: 0,
    deadFor: 0,
    player: { x: FIELD_W / 2, vx: 0, dir: 0, stride: 0, lean: 0 },
    poops: [],
    splats: [],
    spawnTimer: 0.6,
    nextId: 1,
    dodged: 0,
  };
}

function spawnPoop(g: GameState) {
  const r = POOP_MIN_R + Math.random() * (POOP_MAX_R - POOP_MIN_R);
  // A share of the poop is aimed at where the player is heading, so camping
  // in a corner doesn't work.
  const aimed = Math.random() < 0.35;
  const target = aimed
    ? g.player.x + g.player.vx * 0.6 + (Math.random() - 0.5) * 40
    : Math.random() * FIELD_W;
  g.poops.push({
    id: g.nextId++,
    x: Math.max(r, Math.min(FIELD_W - r, target)),
    y: -r,
    vy: fallSpeed(g.t),
    r,
    rot: 0,
    wobble: Math.random() * Math.PI * 2,
  });
}

function circleHitsRect(cx: number, cy: number, cr: number, x0: number, y0: number, x1: number, y1: number) {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

function hitsPlayer(p: Poop, px: number) {
  const r = p.r * 0.75; // a little forgiving
  const headY = FLOOR_Y - FIGURE_HEIGHT + HEAD_R;
  const hx = p.x - px;
  const hy = p.y - headY;
  if (hx * hx + hy * hy < (r + HEAD_R) ** 2) return true;
  return circleHitsRect(p.x, p.y, r, px - BODY_HALF_W, headY + HEAD_R, px + BODY_HALF_W, FLOOR_Y);
}

/** Advances the simulation by dt seconds. Returns true if the player just got hit. */
export function step(g: GameState, dt: number): boolean {
  const pl = g.player;

  if (g.phase === 'dead') {
    g.deadFor += dt;
    // Keep sliding (and decelerating faster) after getting hit.
    pl.vx *= Math.exp(-3 * dt);
    pl.x = Math.max(BODY_HALF_W, Math.min(FIELD_W - BODY_HALF_W, pl.x + pl.vx * dt));
  }

  if (g.phase === 'playing') {
    g.t += dt;

    // Ice physics: input only adds acceleration, velocity barely decays.
    pl.vx += pl.dir * RUN_ACCEL * dt;
    pl.vx *= Math.exp(-ICE_FRICTION * dt);
    pl.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, pl.vx));
    pl.x += pl.vx * dt;

    // Keep the head (which leans past the body) inside the window.
    const min = HEAD_R + 18;
    const max = FIELD_W - HEAD_R - 18;
    if (pl.x < min) {
      pl.x = min;
      pl.vx = Math.abs(pl.vx) * WALL_BOUNCE;
    } else if (pl.x > max) {
      pl.x = max;
      pl.vx = -Math.abs(pl.vx) * WALL_BOUNCE;
    }

    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      spawnPoop(g);
      g.spawnTimer = spawnInterval(g.t) * (0.6 + Math.random() * 0.8);
    }
  }

  // Animation phase: legs pump when pushing, scramble when pushing against momentum.
  const scrambling = pl.dir !== 0 && Math.sign(pl.vx) !== pl.dir && Math.abs(pl.vx) > 60;
  pl.stride += dt * (scrambling ? 26 : pl.dir !== 0 ? 12 : 0);
  const targetLean =
    g.phase !== 'playing' ? 0
    : scrambling ? pl.dir * 22
    : pl.dir !== 0 ? pl.dir * 12
    : Math.abs(pl.vx) > 40 ? -Math.sign(pl.vx) * 8 // leaning back while gliding
    : 0;
  pl.lean += (targetLean - pl.lean) * Math.min(1, dt * 10);

  let hit = false;
  for (let i = g.poops.length - 1; i >= 0; i--) {
    const p = g.poops[i];
    p.vy += 140 * dt;
    p.y += p.vy * dt;
    p.wobble += dt * 7;
    p.rot = Math.sin(p.wobble) * 14;

    if (g.phase === 'playing' && hitsPlayer(p, pl.x)) {
      g.phase = 'dead';
      g.deadFor = 0;
      g.poops.splice(i, 1);
      hit = true;
      continue;
    }
    if (p.y + p.r * 0.6 >= FLOOR_Y) {
      g.poops.splice(i, 1);
      g.splats.push({ id: p.id, x: p.x, r: p.r, age: 0 });
      if (g.phase === 'playing') g.dodged++;
    }
  }

  for (let i = g.splats.length - 1; i >= 0; i--) {
    g.splats[i].age += dt;
    if (g.splats[i].age > SPLAT_LIFETIME) g.splats.splice(i, 1);
  }

  return hit;
}

export function startGame(g: GameState) {
  const fresh = createGame();
  Object.assign(g, fresh, { phase: 'playing' as Phase });
}
