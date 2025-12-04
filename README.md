# Car Racing (HTML/CSS/JS)

A minimal yet fun car racing game built with only HTML, CSS, and JavaScript.
Move freely, jump to hop over cars, and overtake through gaps. Touch any car and it's game over.

## Demo (local)
- Open `index.html` in your browser.

## Features
- **Free movement**: Smooth left/right/up/down movement; not limited to lanes.
- **Jump**: Hop over a single car briefly to avoid a crash.
- **Overtake**: Dynamic obstacles include single cars and paired blocks with a passable gap.
- **Scaling difficulty**: Road speed and spawn rate increase with score.
- **Mobile-friendly**: On-screen controls and a Jump button.

## Controls
- **Move**: Arrow keys or W/A/S/D
- **Jump**: Spacebar or the on-screen Jump button
- **Pause/Resume**: Click Start/Pause (or Space when not jumping)
- **Restart**: Click Restart or press Space after a crash

## Project structure
```
car-racing/
├─ index.html    # Game markup
├─ style.css     # Layout and visuals
├─ script.js     # Game logic and controls
└─ README.md     # This file
```

## How it works (brief)
- The road scrolls downward; obstacles move with it.
- Player has free 2D movement and a short jump window (with cooldown) to clear a car.
- Spawner alternates between single cars and car "blocks" that leave a gap to overtake.
- Collision is disabled only while mid-jump; touching any car otherwise ends the run.

## Customize
You can tweak values in `script.js`:
- `player.speed` — movement speed (px/s)
- `player.jumpDur` — jump duration (seconds)
- `player.jumpPeak` — visual jump height (px)
- `roadSpeed` (initial) and its growth in `update()` — difficulty curve
- Gap size logic in `spawnObstacle()` — overtaking difficulty

## Run with a local server (optional)
While the game works by opening `index.html` directly, you can also serve it locally:
- Python 3: `python -m http.server 8000`
- Node (serve): `npx serve .`
Then open http://localhost:8000

## Deploy to GitHub Pages
1. Commit and push the files to the `main` (or `master`) branch of `WiyarAhmadZai/car-racing`.
2. In the repository settings, enable GitHub Pages for the `main` branch (root).
3. Open the published URL to play the game in the browser.

## License
MIT
