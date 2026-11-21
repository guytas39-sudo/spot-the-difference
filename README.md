# Harbour at Dusk — Spot the Difference

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/guytas39-sudo/spot-the-difference/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/guytas39-sudo/spot-the-difference/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

A complete spot-the-difference game, drawn entirely by hand on canvas — no photos, no copied art. Two pictures of the same harbour at dusk sit side by side; seven things changed between them. Click a change on either picture to ring it on both.

## The scene

A cosy harbour at dusk: a lighthouse on its rock, a house with lit windows, a sailboat, a dock with crates and a cat, a buoy bobbing in the water, gulls overhead and the moon rising.

Round 1 hides seven changes: a missing gull, the lighthouse light turning red, the sailboat flag turning blue, a lit attic window, the vanished cat, a green buoy, and a crescent moon. Round 2 ("New round") swaps in a different seven: the attic window, the cat, the buoy and the moon again, plus a changed boat number, a missing crate and a vanished rope coil.

## How to play

- **Mouse:** click a difference on either picture. Found differences are ringed on both pictures and the counter moves. Wrong clicks cost nothing — a brief red cross marks the spot.
- **Keyboard:** arrow keys move the crosshair, Tab switches pictures, Space or Enter marks the spot.
- **Hints:** three per round; each one pulses a ring around a difference you have not found yet.
- **Timer:** counts up from the moment the page loads; the win banner shows your time when all seven are found.
- **New round / Play again:** starts the other round with a fresh set of seven changes.

## Demo hooks (for screenshots)

- `?found=0,2,4` pre-marks those differences as found on load.
- `?round=2` starts on the second difference set.
- `?shot=start|play|end` loads the start state, a mid-game state (three found), or the finished state — used for the screenshots in `screenshots/`.

## How it is made

`game/index.html` holds the page and its styling; `game/game.js` draws both pictures and runs the game (canvas, no libraries, no network). `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` into `$MAKEFUN_OUTPUT_DIR` and writes `dossier.json` with the kit's `vendor/makefun-game.ts`, so both runs write identical bytes.

<sub>Entered on [make.fun](https://make.fun/?ref=g2zdh0s8&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
