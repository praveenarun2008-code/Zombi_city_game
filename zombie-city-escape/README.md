# Zombie City Escape (2D Endless Runner)

A pure Canvas API endless runner built with:

- HTML
- CSS
- Vanilla JavaScript

## Controls

- `Arrow Up`: Jump
- `Arrow Down`: Slide
- `P`: Pause / Resume
- `R`: Restart after game over

## Features

- Auto-running player with gravity-based jump
- Random obstacles (broken car, fire pit, hanging sign)
- Coins and score system
- Health system and game over state
- Speed increases every 30 seconds
- Power-ups:
  - Shield (temporary immunity)
  - Slow motion mode
- Boss zombie obstacle every 1000 score
- Dark zombie city theme with layered background
- Zombie hands chase animation at the bottom
- Local high score persistence (`localStorage`)
- Simple sound effect placeholders (WebAudio beeps)

## Run

Open `index.html` directly in a browser, or serve this folder with any static server.

Example:

```bash
cd zombie-city-escape
python -m http.server 8080
```

Then open `http://localhost:8080`.
