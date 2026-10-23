# mimic

<div align="center">
  <img src="mimic.png" width="128" height="128" alt="mimic logo" />
  <p><strong>Minimalist, high-performance desktop Discord game activity spoofer & badge booster</strong></p>
  <p>Boost your Discord profile <b>Game Variety (Универсал)</b> and <b>Game Time (Время в играх)</b> badges natively.</p>
</div>

---

## ✨ Features

- **🏆 Mythic Game Variety Badge Booster**: Rapidly cycle through thousands of verified Discord titles in parallel batches (8 games @ 15s hold). Proven to unlock the Mythic **Универсал** badge (9,800+ games).
- **⏱️ Game Time Multiplier (Nx Boost)**: Running $N$ games concurrently multiplies your Discord gameplay tracking hours ($8\text{ games} \times 5\text{ hours} = 40\text{ hours}$ credited).
- **🛡️ 100% Safe & Native**: Zero user token extraction, zero memory injection, zero Discord client modifications. Discord naturally detects running games via official OS process & window inspection APIs.
- **⚡ Smart Window Emulation**: Embedded lightweight Win32 dummy engine (`dummy.exe`) creating legitimate top-level application windows (`WS_EX_APPWINDOW`) in minimized state (`SW_SHOWMINNOACTIVE`) without interrupting your work or stealing focus.
- **🧹 Zero Residual Disk Footprint**: Instant per-batch cleanup ensuring temporary files are immediately removed from disk, preventing Discord settings cache bloat.
- **💾 Smart History & State**: Persistent cache (`history.json`) skips already spoofed games across sessions so you never repeat entries.
- **💻 Cyberpunk Dark UI**: Sleek, non-straining matte dark interface built with Tailwind CSS, Lucide Icons, and real-time terminal activity logs.

---

## 🎮 How It Works

Discord tracks two beta badges for desktop gamers:

1. **Game Variety (Разные игры — Универсал)**:
   - Tracks unique PC titles played over time.
   - Mimic cycles through Discord's official database of 10,000+ detectable applications.
   - Recommended setting: **Batch Size: 8**, **Hold Duration: 15s**.
   - *Note: Discord servers process telemetry updates in batch intervals (up to 24h delay).*

2. **Game Time (Время в играх — Dedicated)**:
   - Tracks total playtime hours.
   - Running parallel dummy processes allows **multiplied hours accumulation** ($N\times$ boost).
   - Recommended setting: **Batch Size: 8–20**, **Hold Duration: 30–60 min**.

---

## 🛠️ Tech Stack

- **Backend**: Rust, [Tauri v2](https://v2.tauri.app/), Tokio, Reqwest, Windows API (`windows-sys`)
- **Frontend**: React 18 / 19, TypeScript, Vite, Tailwind CSS, Lucide Icons

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (v1.75+)
- [Discord Desktop Client](https://discord.com/)

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/Timon2306/mimic.git
cd mimic

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Production Build

```bash
# Build standalone Windows installer & executable
npm run tauri build
```

The compiled standalone executable will be located in:
`src-tauri/target/release/mimic.exe`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
