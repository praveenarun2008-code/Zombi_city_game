# Zombie City Escape

Zombie City Escape is a browser-based 2D runner built with the Canvas API, plain JavaScript, HTML, and CSS. You sprint through a ruined city, dodge hazards, collect coins and powerups, and survive long enough to hit each level's distance target.

## What It Includes

- 10 playable levels with distance-based goals
- Fast endless-runner style movement with jump and slide controls
- Multiple obstacle types including wrecked cars, hanging signs, fire pits, and boss zombies
- Health, score, distance, and coin tracking in the HUD
- Powerups for temporary shield and slow-motion effects
- Pause, restart, and next-level flow
- Menu screen with level selection and saved stats
- Local high score and last score persistence using `localStorage`
- Canvas-drawn visuals, layered city backgrounds, and lightweight sound effects with Web Audio

## Controls

- `Arrow Up` to jump
- `Arrow Down` to slide
- `P` to pause or resume
- `R` to restart after game over
- `N` to continue after clearing a level

## Project Structure

```text
zombie-city-escape/
|- index.html        # Main game screen
|- menu.html         # Start screen and level selector
|- css/styles.css    # Menu, HUD, canvas, and overlay styling
|- js/game.js        # Core gameplay, rendering, and game state
|- js/menu.js        # Menu interactions and saved stats
|- IMPROVEMENTS.md   # Notes and future ideas
```

## How To Run

You can open the files directly in a browser, but using a tiny local server is the most reliable option.

### Option 1: Open directly

Open `menu.html` in your browser to start from the game menu.

### Option 2: Run a local server

```bash
cd zombie-city-escape
python -m http.server 8080
```

Then visit:

- `http://localhost:8080/menu.html` for the menu
- `http://localhost:8080/index.html` to open the game directly

## Gameplay Notes

- Each level has a target distance shown in the HUD.
- Reaching the target completes the level and unlocks the next step in the run.
- Coins increase score and restore some health.
- Taking damage reduces health; hitting zero ends the run.
- Boss zombies start appearing as your score climbs.

## Built With

- HTML5 Canvas
- Vanilla JavaScript
- CSS3
- Browser `localStorage`
- Web Audio API

## Future Improvements

Ideas for expanding the game are tracked in `IMPROVEMENTS.md`.
