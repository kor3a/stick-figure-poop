# Poop Dodge 💩

A classic stick-figure game in a small retro window: poop falls from the sky and you slide your
stick figure across a slippery icy floor to dodge it. One hit and it's game over.

Built with React Native + Expo, so the same code runs on iOS and Android.

## How to play

- **Hold the left or right half of the screen** to push in that direction (arrow keys / A-D on web).
- The floor is ice: you keep sliding after you let go, and turning around takes a moment of
  frantic scrambling.
- Every poop that hits the floor instead of you counts as dodged. Poop falls faster and more
  often the longer you survive. Some of it is aimed at where you're heading.
- Tap the **II** button in the title bar to pause. Your best score is saved on the device.

## Run it on your phone (development)

```bash
npm install
npx expo start
```

Install **Expo Go** from the App Store / Play Store and scan the QR code from the terminal.
Press `w` in the terminal to play in a browser instead.

## Build installable apps

Builds run in the cloud with [EAS](https://docs.expo.dev/build/introduction/), so no Xcode or
Android Studio is needed. You need a free Expo account.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # .apk you can install directly
npx eas-cli@latest build --profile production --platform ios     # needs an Apple Developer account
```

- **Android:** the `preview` profile produces an `.apk` download link you can open on any Android
  phone. For the Play Store, build with `--profile production` (an `.aab`) and run `eas submit`.
- **iOS:** Apple only allows installs through TestFlight/App Store (or registered devices), which
  needs a paid Apple Developer account. `eas build` + `eas submit --platform ios` handles signing
  and uploading to TestFlight.

The bundle identifier / package name is `com.jamesjeon.poopdodge` (in `app.json`). Change it
before the first store build if you want a different one.

## Code layout

- `src/game/constants.ts` – field size, ice physics and difficulty tuning
- `src/game/engine.ts` – the simulation: movement, spawning, collisions, scoring
- `src/components/StickFigure.tsx` – the animated stick figure (run, glide, scramble, splat poses)
- `src/components/Sprites.tsx` – poop, splats and the background
- `src/components/GameScreen.tsx` – game loop, input, retro window UI, overlays, high score
