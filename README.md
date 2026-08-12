# The Ultimate Satisfying App

A deliberately simple infinite feed of tiny satisfying interactions.

## MVP stack

- Expo SDK 57
- React Native + React Native Web
- Expo Router
- AsyncStorage only (no backend)
- Expo Haptics
- GitHub Pages deployment from `main`

## Run locally

```bash
npm install
npm run web
```

## Build web

```bash
npm run build:web
```

Expo exports the static site to `dist/`.

## Current prototype

- Full-screen vertical infinite feed
- 3 repeating infinite interactions: bubble popping, ripple taps, horizontal scrub
- Horizontal scrub demonstrates gesture arbitration: horizontal drag belongs to the game, vertical swipe belongs to the feed
- Mock ad slot every 7 feed items
- Current feed position persisted locally with AsyncStorage
- No account, API or backend

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes `dist/` automatically on pushes to `main`.

Expected project URL: `https://toto-victoto.github.io/ultimate-satisfying-app/`
