# Community Crawler — Project Plan

## What is this?

Community Crawler is a browser-based ASCII roguelike dungeon crawler where the character is
controlled collectively by everyone watching. Every 10 seconds, the action with the most votes
executes. The community's goal is to survive as many dungeon floors as possible. When the
character dies, a Hall of Fame screen celebrates the run before a fresh character is generated
and a new adventure begins.

---

## Core Concept

- A single character exists in a procedurally generated dungeon
- All visitors to the page vote on the next action simultaneously
- Every 10 seconds, the winning vote executes
- The game is always running — there is no pause, no single player in control
- Death is permanent (roguelike), but the legend lives on in the Hall of Fame

---

## Tech Stack

| Concern | Tool | Why |
|---|---|---|
| Game engine / dungeon generation | Rot.js | Open source roguelike toolkit for JavaScript, handles maps, FOV, pathfinding |
| Frontend | Vanilla HTML + CSS + JavaScript | Simple, no framework needed for Phase 1-3 |
| Real-time vote sync | Supabase (free tier) | Handles live data across multiple browser sessions |
| Hosting | GitHub Pages | Free, no server required |
| Version control | GitHub | Free, lets us save progress at each phase |

---

## Phases

### Phase 1 — The Dungeon (local only, no voting yet)
**Goal:** Get a working game running in the browser.

- Dungeon renders in ASCII using Rot.js
- Procedurally generated floor with walls, floor tiles, stairs down
- A character (`@`) is placed on the map
- Enemies (`G` for goblin, `T` for troll etc.) are placed randomly
- Items (potions, weapons) are placed randomly
- Character has HP, attack, and defence stats (randomly generated each run)
- Character has a randomly generated fantasy name
- Basic game loop works: move, attack, pick up, descend stairs
- No voting yet — keyboard controls for testing purposes

**Done when:** You can play a basic dungeon crawler yourself in the browser.

---

### Phase 2 — The Voting Panel (local only)
**Goal:** Replace keyboard controls with a voting UI.

- Sidebar panel appears next to the dungeon
- Voting options displayed as buttons:
  - Move North / South / East / West
  - Attack Nearest Enemy
  - Use Item / Potion
  - Wait / Rest
  - Pick Up Item
  - Go Down Stairs
- 10 second countdown timer visible to the user
- At the end of the timer, the action with the most local "votes" executes
- For now, clicking buttons yourself simulates voting (real multiplayer comes in Phase 4)
- Vote counts shown next to each option (e.g. "Move North — 3 votes")

**Done when:** The game is fully playable via the voting panel with a countdown timer.

---

### Phase 3 — Death, Hall of Fame, and New Run
**Goal:** Complete the run lifecycle.

- When HP reaches 0, the game enters a Death Screen
- Death screen shows:
  - Character name and stats
  - Floor reached
  - Enemies defeated
  - A flavour epitaph (e.g. "Bravely ran into 4 goblins at once")
- Hall of Fame table shows the top 10 runs of all time (stored locally for now):
  - Character name
  - Floor reached
  - Date
- After 15 seconds, a new run begins automatically with a fresh random character
- Viewer count display added to the UI (placeholder for now)

**Done when:** Death → Hall of Fame → new run loop works smoothly.

---

### Phase 4 — Real-Time Multiplayer Voting
**Goal:** Make the voting actually live across multiple browser sessions.

- Integrate Supabase free tier for real-time data sync
- Each visitor's vote is sent to Supabase
- All visitors see the same live vote counts updating in real time
- Live viewer count shows how many people are currently on the page
- Hall of Fame data stored in Supabase so it persists across sessions and devices

**Done when:** Two browser tabs open simultaneously show the same vote counts updating live.

---

### Phase 5 — Live Chat Feed
**Goal:** Add community presence and atmosphere.

- Simple chat panel added to the UI
- Visitors can type a display name and send short messages
- Chat is real-time via Supabase
- Basic moderation: character limit, no links
- Chat sits alongside the dungeon and voting panel

**Done when:** Multiple visitors can chat while voting together.

---

### Phase 6 — Polish and Deploy
**Goal:** Make it shareable.

- Visual polish: colour coding for HP (green/yellow/red), ASCII art header, clean layout
- Mobile-friendly layout (voting panel works on phone)
- Deploy to GitHub Pages with a clean URL
- README written so others understand what it is

**Done when:** You can share a link and someone else can immediately understand and use it.

---

## UI Layout (rough sketch)

```
+---------------------------+------------------+------------------+
|                           |                  |                  |
|    ASCII DUNGEON          |  VOTING PANEL    |   LIVE CHAT      |
|                           |                  |                  |
|   ########                |  [ Move North 2] |  Viewer: 12      |
|   #..@..G.#               |  [ Move South 0] |                  |
|   #.......#               |  [ Attack     5] |  > Dave: go up!  |
|   #...T...#               |  [ Use Item   1] |  > Anya: noooo   |
|   ########                |  [ Wait       0] |  > Kev: attack!! |
|                           |  [ Pick Up    0] |                  |
|   HP: 18/25               |  [ Stairs     0] |                  |
|   Floor: 3                |                  |                  |
|   Name: Aldric Voss       |  Next action: 7s |                  |
|                           |                  |                  |
+---------------------------+------------------+------------------+
```

---

## Character Generation

Each run generates a fresh character with:
- A random fantasy first + last name (small hardcoded list is fine)
- Random HP between 20–35
- Random attack between 3–8
- Random defence between 1–5
- Empty inventory (items found in dungeon)

---

## Hall of Fame Entry

Each entry records:
- Character name
- Floor reached
- Enemies defeated
- Date and time of death
- A generated epitaph line

---

## Out of Scope (for now)

These are interesting but deliberately left for later:
- Sound effects
- Sprite graphics (keeping ASCII for v1)
- Character classes or skill trees
- Saving a run mid-way
- Twitch integration
- Mobile app

---

## Getting Started Checklist

Before writing any code, complete these steps:

- [ ] Install Node.js (nodejs.org)
- [ ] Install Claude Code (`npm install -g @anthropic/claude-code`)
- [ ] Install VS Code (code.visualstudio.com)
- [ ] Create a free GitHub account (github.com)
- [ ] Create a new empty repository called `community-crawler`
- [ ] Clone it to your computer
- [ ] Open the folder in VS Code
- [ ] Start Claude Code inside that folder
- [ ] Hand Claude Code this PLAN.md and ask it to begin Phase 1
