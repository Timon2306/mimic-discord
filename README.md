# mimic

<div align="center">
  <img src="mimic.png" width="128" height="128" alt="mimic logo" />
  <p><strong>Lightweight desktop Discord game activity spoofer & badge booster</strong></p>
  <p>Boost your Discord profile <b>Game Variety (Универсал)</b> and <b>Game Time (Время в играх)</b> badges natively on Windows & Linux.</p>
  <br />
  <img src="proof.png" width="300" alt="Mythic Game Variety Badge Proof (9,837 games)" />
  <p><sub>Mythic «Универсал» badge unlocked with 9,837 games via mimic</sub></p>
</div>

---

## ✨ Features

- **🏆 Game Variety Badge Booster**: Rapidly cycles through verified Discord titles in parallel batches (e.g. 8 games with 15s hold). Tested and proven to unlock the Mythic **Универсал** badge (9,800+ games).
- **⏱️ Game Time Multiplier**: Running multiple games concurrently multiplies your Discord gameplay tracking hours (e.g. 8 games × 5 hours = 40 hours credited).
- **🐧 Multiplatform Support**: Runs natively on both **Windows** (Win32 dummy process window emulation) and **Linux** (`prctl`/`/proc/self/comm` emulation).
- **🛡️ 100% Safe & Native**: Zero token extraction, zero memory injection, zero Discord client modifications. Discord naturally detects running games via official OS process inspection APIs.
- **⚡ Background Process Emulation**: Lightweight dummy engine creating legitimate application processes without stealing focus or interrupting your work.
- **🧹 Zero Residual Disk Footprint**: Instant per-batch cleanup ensuring temporary files are immediately removed from disk, preventing Discord settings cache bloat.
- **💾 Smart History & State**: Persistent cache (`history.json`) skips already spoofed games across sessions so you never repeat entries.

---

## 🎮 How It Works

Discord tracks two badges for desktop gamers:

1. **Game Variety (Разные игры — Универсал)**:
   - Tracks unique PC titles played over time.
   - Cycles through Discord's official database of 10,000+ detectable applications.
   - Recommended setting: **Batch Size: 8**, **Hold Duration: 15s**.
   - *Note: Discord servers process badge telemetry in batch intervals (up to 24h delay).*

2. **Game Time (Время в играх)**:
   - Tracks total playtime hours.
   - Running parallel dummy processes multiplies tracked hours (e.g. 8x boost).
   - Recommended setting: **Batch Size: 8–20**, **Hold Duration: 30–60 min**.

---

## 🛠️ Tech Stack

- **Backend**: Rust, [Tauri v2](https://v2.tauri.app/), Tokio, Reqwest, Windows API (`windows-sys`), Linux (`libc`)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (v1.75+)
- [Discord Desktop Client](https://discord.com/)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Timon2306/mimic-discord.git
cd mimic-discord

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Production Build

```bash
# Build standalone installer & executable
npm run tauri build
```

Compiled standalone binaries:
- Windows: `src-tauri/target/release/bundle/nsis/` & `src-tauri/target/release/mimic.exe`
- Linux: `src-tauri/target/release/bundle/appimage/` & `src-tauri/target/release/bundle/deb/`

---

## ⚠️ Disclaimer & Known Limitations

- **Badge results are not guaranteed.** Discord decides what counts, so going past the verified numbers below may not progress the badge any further.
- **Tested on Windows only**, with Discord games tracked up to **~10,000 games in the badge** (Mythic «Универсал»).
- A target of **24,000 games is unverified** — it may work, may be throttled, or may have no effect at all.
- Game activity spoofing is not officially supported by Discord. Use it at your own risk.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
