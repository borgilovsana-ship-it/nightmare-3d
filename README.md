# Nightmare 3D

A first-person browser horror prototype built with Three.js.

## Play
The game is published with GitHub Pages at:
https://borgilovsana-ship-it.github.io/nightmare-3d/

If Pages has not finished deploying yet, wait for the **Deploy static content to Pages** workflow in the Actions tab to complete.

## Controls
- **WASD / arrow keys** — move
- **Mouse** — look around on desktop
- **Shift / RUN** — sprint
- **Touch joystick** — move on mobile
- **↶ / ↷** — turn on mobile

Designed for **landscape orientation** on phones. The game requests landscape orientation where the browser supports it; otherwise rotate the device manually.

## Features
- Procedural 3D forest and old cabin
- First-person flashlight
- A stalking creature that follows the player
- Procedural ambient drone, footsteps, and proximity heartbeat (generated in-browser)
- Desktop and touch controls

## Run locally
Serve the folder with a local web server because the game uses JavaScript modules:

```bash
python -m http.server 8000
```

Open http://localhost:8000. Three.js is loaded from jsDelivr, so an internet connection is required.
