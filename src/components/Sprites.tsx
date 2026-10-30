import { memo } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { FIELD_H, FIELD_W, FLOOR_Y } from '../game/constants';

export const INK = '#000';
export const PAPER = '#fff';

/** A classic three-tier swirl as black line art, drawn in a 40×40 box. Memoized: only its position changes per frame. */
export const PoopSprite = memo(function PoopSprite({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G stroke={INK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill={PAPER}>
        <Path d="M3 33 Q3 25 12 24 L28 24 Q37 25 37 33 Q37 38 30 38 L10 38 Q3 38 3 33 Z" />
        <Path d="M8 24 Q8 16 15 16 L25 16 Q32 16 32 24 Q32 27 27 27 L13 27 Q8 27 8 24 Z" />
        <Path d="M13 16 Q13 9 20 8 Q24 3 22 1 Q30 5 27 12 Q28 16 25 18 L16 18 Q13 18 13 16 Z" />
      </G>
    </Svg>
  );
});

/** Squashed poop on the floor. */
export const SplatSprite = memo(function SplatSprite({ width }: { width: number }) {
  return (
    <Svg width={width} height={width * 0.4} viewBox="0 0 50 20">
      <G stroke={INK} strokeWidth={1.8} strokeLinejoin="round" fill={PAPER}>
        <Path d="M5 19 Q6 13 14 12 Q17 7 25 7 Q33 7 36 12 Q44 13 45 19 Z" />
        <Path d="M17 12 Q25 15 33 12" fill="none" />
      </G>
      <G fill={INK}>
        <Circle cx={2.5} cy={17} r={1.4} />
        <Circle cx={47.5} cy={16} r={1.6} />
        <Circle cx={9} cy={8} r={1.1} />
        <Circle cx={41} cy={6} r={1.2} />
      </G>
    </Svg>
  );
});

/** Plain white field with the floor drawn as a line. Static, so drawn once. */
export const Background = memo(function Background({ scale }: { scale: number }) {
  return (
    <Svg
      width={FIELD_W * scale}
      height={FIELD_H * scale}
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      <Rect x={0} y={0} width={FIELD_W} height={FIELD_H} fill={PAPER} />
      <Path d={`M0 ${FLOOR_Y} L${FIELD_W} ${FLOOR_Y}`} stroke={INK} strokeWidth={2} />
      {/* short strokes so the floor reads as slippery */}
      <G stroke={INK} strokeWidth={1} strokeLinecap="round">
        <Path d={`M18 ${FLOOR_Y + 12} L52 ${FLOOR_Y + 9}`} />
        <Path d={`M120 ${FLOOR_Y + 15} L170 ${FLOOR_Y + 11}`} />
        <Path d={`M210 ${FLOOR_Y + 26} L236 ${FLOOR_Y + 24}`} />
        <Path d={`M250 ${FLOOR_Y + 13} L298 ${FLOOR_Y + 9}`} />
        <Path d={`M80 ${FLOOR_Y + 30} L104 ${FLOOR_Y + 28}`} />
      </G>
    </Svg>
  );
});
