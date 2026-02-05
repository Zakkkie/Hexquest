
# HexQuest Economy

**HexQuest Economy** is a high-fidelity hexagonal strategy game built with **React**, **Konva**, and **TypeScript**. It combines the thrill of exploring an infinite procedural world with a tight economic simulation where every move and upgrade must be calculated against your limited resources (Credits & Propulsion).

Compete against advanced **AI Sentinels**, manage a delicate balance of **Moves vs. Coins**, and master complex zoning rules to dominate the sector.

> **v3.4 Update: Deep Excavation**
> Digging now rewards effort based on depth. Excavating deep pits yields significantly more propulsion fuel.

---

## 🚀 Key Features

*   **Infinite Procedural World**: A living, breathing hex grid that expands as you explore.
*   **Dynamic Terrain Destruction**: Level 1 sectors are unstable. Heavy traffic causes them to degrade, crack, and eventually collapse into the void.
*   **The Cycle Economy**: A unique resource system where horizontal expansion (Acquisition) fuels vertical growth (Upgrades).
*   **Deep Excavation Logic**: Digging operations now grant bonus moves based on the depth of the resulting pit (e.g., Digging to -2 grants +2 Moves).
*   **Competitive AI ("The Rival")**: Autonomous bots that farm resources, plan expansions, and react to collapsing terrain.
*   **Procedural Audio Engine**: A custom-built, asset-free sound synthesizer using the Web Audio API ("Nebula V2").
*   **Visual Fidelity**: A 2.5D isometric view with neon-glass aesthetics, dynamic lighting, shake effects, and smooth React-Konva animations.

---

## ⚠️ Hazard Warning: Terrain Collapse

The unstable nature of the simulation introduces a physical threat:

### 1. Durability & Degradation
*   **Fragile Foundation**: All **Level 1** hexes have limited structural integrity (6 Durability).
*   **Wear & Tear**: Every time a unit (Player or Bot) steps **off** a Level 1 hex, its durability decreases.
*   **Visual Indicators**: As durability drops, the hex will develop visible cracks and craters.

### 2. The Void & Shockwave Penalty
*   **Collapse**: When durability reaches zero, the sector collapses instantly, turning into a **Void Crater**.
*   **Irreversibility**: A Void hex is impassable and cannot be repaired.
*   **Shockwave Damage**: If you trigger a collapse (by stepping off the last durability point), the energy discharge hits your suit systems.
    *   **PENALTY**: You immediately lose **1 Rank Level**.

---

## 📜 The Rules of Engagement

Success in HexQuest requires understanding the laws that govern the simulation.

### 1. Movement & Propulsion
*   **Basic Movement**: Moving to an adjacent hex costs **1 Move**.
*   **Terrain Cost**: High-level hexes are harder to traverse. Cost equals the **Hex Level** (for Level 2+).
*   **Emergency Propulsion**: If you lack Moves, you can burn **Credits** to move.
    *   **Exchange Rate**: **5 Credits = 1 Move**.
*   *Warning*: Running out of both Moves and Credits leaves you stranded.

### 2. The Growth Cycle (Points Economy)
You cannot simply build a single tall tower. Expansion and Elevation are linked.

*   **Acquisition (L0 → L1)**: Claiming a neutral sector generates **1 Upgrade Point**.
*   **Elevation (L1 → L2+)**: Upgrading an owned sector consumes **1 Upgrade Point**.
*   **Capacity**: You can only store a limited number of Upgrade Points at a time (determined by Difficulty).
*   *Strategy*: You must oscillate between expanding wide (capturing L0) and building tall (spending points).

### 3. Excavation (Digging)
*   **Action**: Clicking the "Pickaxe" (Red) button allows you to lower a sector's level.
*   **Material Gain**: Digging grants **+1 Material** if your storage is not full.
*   **Propulsion Gain**: Digging grants Moves equal to the **absolute level** of the resulting depth.
    *   Digging to Level -1: **+1 Move**
    *   Digging to Level -2: **+2 Moves**
    *   Digging to Level -5: **+5 Moves**

### 4. Recovery & Farming
If you are low on resources or need to stall, you can perform a **Recovery** operation on any hex you own.
*   **Action**: Clicking the "Refresh" (Blue) button.
*   **Reward**: Grants **+1 Move** and a significant amount of **Credits** based on the hex level.
*   **Use Case**: Essential for generating the movement fuel needed to cross difficult terrain.

---

## 🤖 The AI: "The Rival"

The world is populated by AI bots running the **"Survivor V34"** logic engine.

*   **Behavior**: They prioritize survival and economic efficiency. They will establish "farms", build walls to block you, and dig traps near your position.
*   **Panic Mode**: If a bot gets trapped by Void Craters, it triggers a "Panic" state, attempting desperate maneuvers to break free.

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Move / Select** | `Left Click` on a Hex |
| **Pan Camera** | `Left Click` + Drag background |
| **Rotate Camera** | `Right Click` + Drag (or UI Buttons) |
| **Zoom** | `Mouse Wheel` |
| **Upgrade (Amber)** | Improve Sector Level (Uses Point) |
| **Recover (Blue)** | Harvest Resources (Gains Move/Credits) |
| **Dig (Red)** | Lower Level (Gains Material + Deep Move Bonus) |
| **Menu / Settings** | `Gear` Icon (Top Right) |

---

## 🛠️ Technical Stack

*   **Frontend**: React 19, TailwindCSS
*   **Graphics**: Konva (HTML5 Canvas) via `react-konva`
*   **State Management**: Zustand
*   **Build Tool**: Vite
*   **Audio**: Web Audio API (Procedural FM Synthesis)

---

*HexQuest Economy - v3.4*
