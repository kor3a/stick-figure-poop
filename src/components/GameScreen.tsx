import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { FIELD_H, FIELD_W, FLOOR_Y, SPLAT_LIFETIME } from '../game/constants';
import { Dir, GameState, createGame, startGame, step } from '../game/engine';
import { Background, INK, PAPER, PoopSprite, SplatSprite } from './Sprites';
import { StickFigure } from './StickFigure';

const BEST_KEY = 'poopdodge.best';
const TITLE_H = 26;
const STATUS_H = 24;
const BEVEL = 2; // window border width
const PADS_H = 96;
const RESTART_DELAY = 0.7; // seconds after a hit before a tap restarts

function haptic(kind: 'hit' | 'start') {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'hit'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => {});
}

export function GameScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [game] = useState<GameState>(createGame);
  const [, setFrame] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [paused, setPaused] = useState(false);

  const bestRef = useRef(0);
  const pausedRef = useRef(false);
  const clock = useRef(0);
  const touchDir = useRef<Dir>(0);
  const keys = useRef({ left: false, right: false });

  pausedRef.current = paused;

  // Field scale: fit the "small window" into whatever screen we're on.
  const availW = width - 32 - BEVEL * 2;
  const availH = height - insets.top - insets.bottom - TITLE_H - STATUS_H - BEVEL * 2 - PADS_H - 48;
  const s = Math.max(0.5, Math.min(availW / FIELD_W, availH / FIELD_H, 1.6));
  const fieldW = FIELD_W * s;
  const fieldH = FIELD_H * s;

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((v) => {
        const n = Number(v) || 0;
        bestRef.current = n;
        setBest(n);
      })
      .catch(() => {});
  }, []);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = Date.now();
    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        clock.current += dt;
        const k = keys.current;
        game.player.dir = touchDir.current || ((Number(k.right) - Number(k.left)) as Dir);
        if (step(game, dt)) {
          haptic('hit');
          const isBest = game.dodged > bestRef.current;
          setNewBest(isBest);
          if (isBest) {
            bestRef.current = game.dodged;
            setBest(game.dodged);
            AsyncStorage.setItem(BEST_KEY, String(game.dodged)).catch(() => {});
          }
        }
      }
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // Pause when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && game.phase === 'playing') setPaused(true);
    });
    return () => sub.remove();
  }, [game]);

  // Arrow keys / A-D on web (and hardware keyboards).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const set = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.current.left = down;
      else if (k === 'arrowright' || k === 'd') keys.current.right = down;
      else if (down && (k === ' ' || k === 'enter')) tap();
      else if (down && (k === 'p' || k === 'escape')) togglePause();
      else return;
      e.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => set(e, true);
    const onUp = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  });

  function tap() {
    if (pausedRef.current) {
      setPaused(false);
      return;
    }
    if (game.phase === 'ready' || (game.phase === 'dead' && game.deadFor > RESTART_DELAY)) {
      startGame(game);
      setNewBest(false);
      haptic('start');
    }
  }

  function togglePause() {
    if (game.phase === 'playing') setPaused((p) => !p);
  }

  // Touch controls: the whole screen is the controller, left half = left, right half = right.
  const sideOf = (pageX: number): Dir => (pageX < width / 2 ? -1 : 1);
  const updateTouches = (e: GestureResponderEvent, ended = false) => {
    const { touches, pageX } = e.nativeEvent;
    if (touches && touches.length > 0) {
      // Most recent finger wins, so rolling from one thumb to the other feels right.
      touchDir.current = sideOf(touches[touches.length - 1].pageX);
    } else {
      touchDir.current = ended ? 0 : sideOf(pageX);
    }
  };

  const responder = {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      tap();
      updateTouches(e);
    },
    onResponderStart: (e: GestureResponderEvent) => {
      touchDir.current = sideOf(e.nativeEvent.pageX);
    },
    onResponderMove: (e: GestureResponderEvent) => updateTouches(e),
    onResponderEnd: (e: GestureResponderEvent) => updateTouches(e, true),
    onResponderRelease: () => {
      touchDir.current = 0;
    },
    onResponderTerminate: () => {
      touchDir.current = 0;
    },
  };

  const dir = game.player.dir;
  const t = clock.current;

  return (
    <View style={[styles.desktop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]} {...responder}>
      <View style={styles.window}>
        <View style={styles.titleBar}>
          <View style={styles.titleIcon}>
            <PoopSprite size={16} />
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
            Poop Dodge
          </Text>
          <Pressable
            onPress={togglePause}
            style={styles.titleButton}
            hitSlop={8}
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
          >
            <Text style={styles.titleButtonText}>{paused ? '▶' : 'II'}</Text>
          </Pressable>
        </View>

        <View style={[styles.field, { width: fieldW, height: fieldH }]}>
          <Background scale={s} />

          {game.splats.map((sp) => {
            const w = sp.r * 3.2;
            const fade = Math.min(1, (SPLAT_LIFETIME - sp.age) / 0.5);
            return (
              <View
                key={sp.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: (sp.x - w / 2) * s,
                  top: (FLOOR_Y - w * 0.32) * s,
                  opacity: fade,
                }}
              >
                <SplatSprite width={w * s} />
              </View>
            );
          })}

          <StickFigure
            player={game.player}
            scale={s}
            floorY={FLOOR_Y}
            deadFor={game.phase === 'dead' ? game.deadFor : null}
            time={t}
          />

          {game.poops.map((p) => {
            const size = p.r * 2.4;
            return (
              <View
                key={p.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: (p.x - size / 2) * s,
                  top: (p.y - size / 2) * s,
                  transform: [{ rotate: `${p.rot}deg` }],
                }}
              >
                <PoopSprite size={size * s} />
              </View>
            );
          })}

          {game.phase === 'ready' && (
            <Overlay>
              <Text style={[styles.bigText, { fontSize: 34 * s }]}>POOP DODGE</Text>
              <Text style={[styles.body, { fontSize: 15 * s }]}>
                Poop is falling from the sky!{'\n'}Hold the left or right side of the screen to slide.{'\n'}
                Careful — the floor is slippery.
              </Text>
              <Blink t={t} style={{ fontSize: 18 * s }}>
                Tap to start
              </Blink>
            </Overlay>
          )}

          {game.phase === 'dead' && game.deadFor > 0.4 && (
            <Overlay>
              <Text style={[styles.bigText, { fontSize: 44 * s }]}>SPLAT!</Text>
              <Text style={[styles.body, { fontSize: 17 * s }]}>
                You dodged {game.dodged} {game.dodged === 1 ? 'poop' : 'poops'}
                {'\n'}in {game.t.toFixed(1)}s
              </Text>
              {newBest && game.dodged > 0 && (
                <Text style={[styles.newBest, { fontSize: 18 * s }]}>★ New best! ★</Text>
              )}
              {game.deadFor > RESTART_DELAY && (
                <Blink t={t} style={{ fontSize: 18 * s }}>
                  Tap to try again
                </Blink>
              )}
            </Overlay>
          )}

          {paused && (
            <Overlay>
              <Text style={[styles.bigText, { fontSize: 32 * s }]}>PAUSED</Text>
              <Blink t={t} style={{ fontSize: 18 * s }}>
                Tap to resume
              </Blink>
            </Overlay>
          )}
        </View>

        <View style={styles.statusBar}>
          <StatusCell label="Dodged" value={String(game.dodged)} />
          <StatusCell divider label="Time" value={`${game.t.toFixed(1)}s`} />
          <StatusCell divider label="Best" value={String(best)} />
        </View>
      </View>

      <View style={styles.pads} pointerEvents="none">
        <Pad side="left" active={dir === -1} />
        <Pad side="right" active={dir === 1} />
      </View>
    </View>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.overlay} pointerEvents="none">
      {children}
    </View>
  );
}

function Blink({ t, style, children }: { t: number; style: object; children: React.ReactNode }) {
  return <Text style={[styles.blink, style, { opacity: Math.sin(t * 5) > -0.3 ? 1 : 0.25 }]}>{children}</Text>;
}

function StatusCell({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.statusCell, divider && styles.statusCellDivider]}>
      <Text style={styles.statusText} numberOfLines={1}>
        {label}: <Text style={styles.statusValue}>{value}</Text>
      </Text>
    </View>
  );
}

function Pad({ side, active }: { side: 'left' | 'right'; active: boolean }) {
  const d = side === 'left' ? 'M30 8 L8 24 L30 40 Z' : 'M10 8 L32 24 L10 40 Z';
  return (
    <View style={[styles.pad, active && styles.padActive]}>
      <Svg width={40} height={48} viewBox="0 0 40 48">
        <Path d={d} fill={active ? PAPER : INK} />
      </Svg>
    </View>
  );
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: {
    backgroundColor: PAPER,
    borderWidth: 2,
    borderColor: INK,
  },
  titleBar: {
    height: TITLE_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderColor: INK,
  },
  titleIcon: { marginRight: 5 },
  titleText: { flex: 1, color: INK, fontWeight: '700', fontSize: 14 },
  titleButton: {
    width: 22,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: INK,
  },
  titleButtonText: { fontSize: 10, fontWeight: '900', color: INK },
  field: {},
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 16,
    gap: 12,
  },
  bigText: { fontWeight: '900', color: INK, letterSpacing: 1, textAlign: 'center' },
  body: { color: INK, textAlign: 'center', fontWeight: '600' },
  newBest: { color: INK, fontWeight: '900' },
  blink: { color: INK, fontWeight: '800', fontFamily: MONO },
  statusBar: { height: STATUS_H, flexDirection: 'row', borderTopWidth: 2, borderColor: INK },
  statusCell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  statusCellDivider: { borderLeftWidth: 1, borderColor: INK },
  statusText: { fontSize: 12, color: INK, fontFamily: MONO },
  statusValue: { fontWeight: '700' },
  pads: {
    height: PADS_H,
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  pad: {
    width: 110,
    height: 72,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: INK,
  },
  padActive: { backgroundColor: INK },
});
