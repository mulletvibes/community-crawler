# Community Crawler

A browser-based ASCII roguelike dungeon crawler controlled collectively by everyone watching. Every 10 seconds, the action with the most votes executes. The community's goal: survive as many dungeon floors as possible.

**[Play now →](https://mulletvibes.github.io/community-crawler)**

---

## How to play

You don't control the character — everyone does, together.

1. **Vote** on the next action using the buttons on the right (or keyboard shortcuts)
2. Every **10 seconds**, the action with the most votes executes
3. Survive as many floors as possible before the character dies
4. When death comes, the run is immortalised in the **Hall of Fame**
5. A new run begins automatically after 15 seconds

### Actions

| Button | Key | Effect |
|--------|-----|--------|
| Move North/South/East/West | W / S / D / A | Move one tile; bumping an enemy attacks it |
| Attack Nearest | F | Move toward and attack the closest enemy |
| Pick Up Item | G | Pick up a weapon or potion on the current tile |
| Use Potion | P | Drink a health potion |
| Go Down Stairs | > | Descend to the next floor (must be standing on `>`) |
| Wait | . | Do nothing; enemies still move |

### Symbols

| Symbol | What it is |
|--------|-----------|
| `@` | Your adventurer |
| `G` | Goblin — weak, common from floor 1 |
| `O` | Orc — tougher, appears from floor 3 |
| `T` | Troll — dangerous, appears from floor 4 |
| `!` | Health potion |
| `)` | Weapon (pick up to raise ATK permanently) |
| `>` | Stairs down |

### Tips

- HP is colour-coded: **green** (safe) → **yellow** (caution) → **red** (danger)
- Standing on the stairs and descending restores 25% of missing HP
- Picking up a weapon permanently raises ATK — always worth it
- Enemies only move when the community acts — so voting Wait is sometimes smart

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Game engine | [Rot.js](https://ondras.github.io/rot.js/) — roguelike toolkit (map generation, FOV, display) |
| Frontend | Vanilla HTML, CSS, JavaScript — no framework |
| Real-time sync | [Supabase](https://supabase.com) — shared game state, votes, chat, presence |
| Hosting | [GitHub Pages](https://pages.github.com) |

### Architecture

- A single game state row lives in Supabase (`game_state` table, `id = 1`)
- All browser tabs hydrate from that row on load and receive live updates via Supabase Realtime
- Votes accumulate in a `votes` JSONB column; the first client to commit at round end wins via an optimistic-lock RPC (`try_commit_round`), preventing duplicate actions
- Chat uses a separate `chat_messages` table with Realtime INSERT subscriptions
- Viewer count is tracked with Supabase Presence on a shared `lobby` channel

### Database tables

```
game_state   — id, version, state (JSONB), votes (JSONB), round_ends_at
hall_of_fame — id, name, floor, kills, atk, def, epitaph, created_at
chat_messages — id, display_name, message, created_at
```

---

## Running locally

No build step required — it's plain HTML.

```bash
git clone https://github.com/mulletvibes/community-crawler.git
cd community-crawler
# Serve with any static file server, e.g.:
npx serve .
# or
python3 -m http.server
```

Then open `http://localhost:3000` (or whichever port your server uses).

> **Note:** The game connects to the live Supabase instance, so local dev shares state with the production game. Useful for testing real-time sync; just be aware you're playing the real game.

---

## Project structure

```
index.html     — page layout and markup
style.css      — all styles (dark theme, responsive)
js/game.js     — all game logic, Supabase integration
PLAN.md        — original phased build plan
```

---

## Phases completed

| Phase | Description |
|-------|-------------|
| 1 | Dungeon generation, character, enemies, items, basic game loop |
| 2 | Voting UI, countdown timer, keyboard shortcuts |
| 3 | Death screen, Hall of Fame, auto-restart |
| 4 | Real-time multiplayer voting via Supabase |
| 5 | Live chat and viewer count |
| 6 | ASCII art header, mobile layout, GitHub Pages deploy, this README |
