import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { FIELD_W, FIGURE_HEIGHT, HEAD_R } from '../game/constants';
import type { Player } from '../game/engine';
import { INK, PAPER } from './Sprites';

const STROKE = 3;

// Local coordinates: feet at (0, 0), y grows downward, so the body is at negative y.
const HEAD_Y = -FIGURE_HEIGHT + HEAD_R;
const SHOULDER_Y = -40;
const HIP_Y = -21;
const ARM_LEN = 16;
const THIGH = 11;
const SHIN = 11;

// Angles are degrees from straight down, positive toward +x.
function limbEnd(x: number, y: number, deg: number, len: number) {
  const a = (deg * Math.PI) / 180;
  return { x: x + Math.sin(a) * len, y: y + Math.cos(a) * len };
}

type Pose = { armL: number; armR: number; legL: number; legR: number; kneeL: number; kneeR: number };

function computePose(p: Player, dead: boolean, time: number): Pose {
  const facing = p.dir || Math.sign(p.vx) || 1;
  const speed = Math.abs(p.vx);
  const scrambling = p.dir !== 0 && Math.sign(p.vx) !== p.dir && speed > 60;

  if (dead) {
    return { armL: -150, armR: 150, legL: -20, legR: 20, kneeL: 0, kneeR: 0 };
  }
  if (scrambling) {
    // Legs spinning in place and arms windmilling: no grip on the ice.
    const s = Math.sin(p.stride);
    return {
      legL: facing * s * 45,
      legR: -facing * s * 45,
      kneeL: facing * Math.max(0, -s) * 50,
      kneeR: facing * Math.max(0, s) * 50,
      armL: (p.stride * 60) % 360,
      armR: ((p.stride * 60) % 360) + 180,
    };
  }
  if (p.dir !== 0) {
    const s = Math.sin(p.stride);
    return {
      legL: facing * s * 30,
      legR: -facing * s * 30,
      kneeL: facing * Math.max(0, -s) * 35,
      kneeR: facing * Math.max(0, s) * 35,
      armL: -facing * s * 35,
      armR: facing * s * 35,
    };
  }
  if (speed > 40) {
    // Gliding: skater stance with arms out for balance.
    const glide = Math.sign(p.vx);
    const wobble = Math.sin(time * 9) * 8;
    return {
      legL: glide * 26,
      legR: -glide * 16,
      kneeL: 0,
      kneeR: glide * 10,
      armL: -85 + wobble,
      armR: 85 + wobble,
    };
  }
  const breathe = Math.sin(time * 2.5) * 3;
  return { legL: -8, legR: 8, kneeL: 0, kneeR: 0, armL: -18 - breathe, armR: 18 + breathe };
}

type Props = {
  player: Player;
  scale: number;
  floorY: number;
  deadFor: number | null; // seconds since hit, or null while alive
  time: number;
};

const BOX_W = 140; // wide enough to fit the figure lying down after a hit
const BOX_H = 72;

export function StickFigure({ player, scale, floorY, deadFor, time }: Props) {
  const dead = deadFor !== null;
  const pose = computePose(player, dead, time);

  // Topple over once hit: with the slide, or away from a nearby wall.
  const fallDir =
    player.x < 70 ? 1 : player.x > FIELD_W - 70 ? -1 : Math.sign(player.vx) || 1;
  const rot = dead ? fallDir * Math.min(90, deadFor * 400) : player.lean;

  const shoulder = { x: 0, y: SHOULDER_Y };
  const hip = { x: 0, y: HIP_Y };
  const handL = limbEnd(shoulder.x, shoulder.y, pose.armL, ARM_LEN);
  const handR = limbEnd(shoulder.x, shoulder.y, pose.armR, ARM_LEN);
  const kneeL = limbEnd(hip.x, hip.y, pose.legL, THIGH);
  const kneeR = limbEnd(hip.x, hip.y, pose.legR, THIGH);
  const footL = limbEnd(kneeL.x, kneeL.y, pose.legL - pose.kneeL, SHIN);
  const footR = limbEnd(kneeR.x, kneeR.y, pose.legR - pose.kneeR, SHIN);

  return (
    <Svg
      width={BOX_W * scale}
      height={BOX_H * scale}
      viewBox={`${-BOX_W / 2} ${-BOX_H + 6} ${BOX_W} ${BOX_H}`}
      style={{ position: 'absolute', left: (player.x - BOX_W / 2) * scale, top: (floorY - BOX_H + 6) * scale }}
    >
      <G transform={`rotate(${rot})`}>
        <G stroke={INK} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Line x1={0} y1={HEAD_Y + HEAD_R} x2={hip.x} y2={hip.y} />
          <Path d={`M${shoulder.x} ${shoulder.y} L${handL.x} ${handL.y}`} />
          <Path d={`M${shoulder.x} ${shoulder.y} L${handR.x} ${handR.y}`} />
          <Path d={`M${hip.x} ${hip.y} L${kneeL.x} ${kneeL.y} L${footL.x} ${footL.y}`} />
          <Path d={`M${hip.x} ${hip.y} L${kneeR.x} ${kneeR.y} L${footR.x} ${footR.y}`} />
        </G>
        <Circle cx={0} cy={HEAD_Y} r={HEAD_R} fill={PAPER} stroke={INK} strokeWidth={STROKE} />
        {dead && <HeadPoop />}
      </G>
    </Svg>
  );
}


// The poop that got you, sitting on your head.
function HeadPoop() {
  const y = HEAD_Y - HEAD_R + 1;
  return (
    <G stroke={INK} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" fill={PAPER}>
      <Path d={`M-9 ${y} Q-9 ${y - 5} 0 ${y - 5} Q9 ${y - 5} 9 ${y} Z`} />
      <Path d={`M-6 ${y - 4} Q-6 ${y - 8} 0 ${y - 8} Q6 ${y - 8} 6 ${y - 4} Z`} />
      <Path d={`M-2 ${y - 8} Q0 ${y - 12} 3 ${y - 9}`} fill="none" />
      <Path d={`M-8 ${y} Q-9 ${y + 4} -7 ${y + 5}`} fill="none" />
      <Path d={`M6 ${y} Q7 ${y + 6} 5 ${y + 7}`} fill="none" />
    </G>
  );
}
