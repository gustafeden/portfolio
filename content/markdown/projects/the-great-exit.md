# The Great Exit

*Personal Project | 2025 | Built with Claude Code*

A real-time multiplayer stock trading game set inside a collapsing, unnamed megacorp. Players race to accumulate wealth before the organization implodes.

## Project Overview

THE GREAT EXIT started as a workshop game concept—something quick and engaging for corporate events. It evolved into a full real-time trading platform where players join via QR code, trade fictional corporate divisions, and watch their fortunes rise and fall on a big screen.

The unnamed megacorp represents every company drowning in strategic initiatives, alignment workshops, reorgs, and PowerPoints with more animations than meaning. Perfectly safe satire. Universally funny.

## How It Works

**Players scan a QR code** on the big screen, which loads the trading interface on their phones. No app install required—just a web browser.

**The game runs on a laptop** with a rich terminal UI. The admin controls game phases, triggers events, and watches all players trade in real-time.

**Corporate events fire randomly**, affecting stock prices: "Leadership announces Strategic Vision Framework 3.0 — confusion spikes." Players must react fast, buying dips and selling peaks.

**Four phases of collapse** from Stability through Crisis to The Great Exit—each phase brings more volatility, more events, and more chaos.

## Technical Highlights

**Zero cloud game state.** All real-time data flows through WebSockets directly from the laptop to players' phones. Firebase only hosts the static frontend. This means zero latency overhead and zero server costs during gameplay.

**Dart everywhere.** The server runs on Dart with nocterm for a rich terminal UI. The frontend is Flutter Web. One language, both ends.

**Smart price simulation.** Stocks follow random walks with mean reversion, sector correlations, and event-driven shocks. Each division has its own personality—SYNC is volatile, PIVT is stable, FLRC has momentum.

**Hold-to-trade.** Players can hold the buy/sell button to rapidly accumulate or dump shares. In the final minutes, this becomes crucial.

## The Architecture

```
┌─────────────────────────────────────────┐
│           ADMIN LAPTOP                  │
│  Terminal UI ◄─► Game Engine ◄─► WebSocket│
└─────────────────────────────────────────┘
                     │
         Fast WebSocket (local network)
                     ▼
┌─────────────────────────────────────────┐
│  Players (phones) + Big Screen (TV)     │
│  Flutter Web via Firebase Hosting       │
└─────────────────────────────────────────┘
```

## What I Learned

Building a real-time multiplayer system from scratch taught me a lot about WebSocket architecture, tick-based game loops, and the importance of latency visibility. Players need to trust their trades are instant—so we show live ping times.

The TUI work with nocterm was particularly satisfying. Building a complex dashboard with menus, live charts, and keyboard controls entirely in the terminal felt like going back to fundamentals.

## The Satire

The event texts are the heart of the game's humor:

- "Mandatory alignment workshop scheduled; sell-off begins."
- "Transformation committee releases 200-page slide deck; no one reads it."
- "New initiative launched to investigate initiative overload."
- "Team Marvel deploys without meeting; innovation briefly witnessed."

Safe enough for any workplace. Accurate enough to hurt.

**Tech Stack:** Dart, Flutter Web, WebSockets, Firebase Hosting, nocterm

---

- [Live Demo →](https://great-exit-game.web.app)
- [GitHub Repository →](https://github.com/gustafeden/great-exit)
