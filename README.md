
# HexQuest Economy

**HexQuest Economy** is a high-fidelity hexagonal strategy game built with **React**, **Konva**, and **TypeScript**. It combines the thrill of exploring an infinite procedural world with a tight economic simulation where every move and upgrade must be calculated against your limited resources (Credits & Propulsion).

Compete against advanced **AI Sentinels**, manage a delicate balance of **Moves vs. Coins**, and master complex zoning rules to dominate the sector.

> **v3.2 Update: The Collapse Protocol**
> The world is no longer static. Low-level terrain degrades underfoot, and careless movement can lead to catastrophic structural failure.

---

## 🚀 Key Features

*   **Infinite Procedural World**: A living, breathing hex grid that expands as you explore.
*   **Dynamic Terrain Destruction**: Level 1 sectors are unstable. Heavy traffic causes them to degrade, crack, and eventually collapse into the void.
*   **Deep Economic Strategy**: Movement isn't free. Growth isn't guaranteed. Manage your **Credits** and **Moves** carefully.
*   **Competitive AI ("The Survivor" V14)**: Autonomous bots that farm resources, plan expansions, and now react to collapsing terrain.
*   **Procedural Audio Engine**: A custom-built, asset-free sound synthesizer using the Web Audio API for real-time sci-fi SFX.
*   **Visual Fidelity**: A 2.5D isometric view with neon-glass aesthetics, dynamic lighting, shake effects, and smooth React-Konva animations.

---

## ⚠️ Hazard Warning: Terrain Collapse

The unstable nature of the simulation introduces a new threat:

### 1. Durability & Degradation
*   **Fragile Foundation**: All **Level 1** hexes have limited structural integrity (Durability).
*   **Wear & Tear**: Every time a unit (Player or Bot) steps **off** a Level 1 hex, its durability decreases.
*   **Visual Indicators**: As durability drops, the hex will develop visible cracks and craters.

### 2. The Void & Shockwave Penalty
*   **Collapse**: When durability reaches zero, the sector collapses instantly, turning into a **Void Crater** filled with spikes and rubble.
*   **Irreversibility**: A Void hex is impassable and cannot be repaired. It is lost forever.
*   **Shockwave Damage**: If you are the one to cause the final collapse, the resulting energy discharge hits your suit systems.
    *   **PENALTY**: You immediately lose **1 Rank Level**.
    *   *Strategy Tip*: Be careful not to be the "straw that breaks the camel's back". Let bots trigger the traps if possible.

---

## 📜 The Rules of Engagement

Success in HexQuest requires understanding the laws that govern the simulation.

### 1. Movement & Propulsion
*   **Basic Movement**: Moving to an adjacent hex costs **1 Move**.
*   **Terrain Cost**: High-level hexes are harder to traverse. Moving into a **Level 5** hex costs **5 Moves**.
*   **Emergency Propulsion**: If you lack Moves, you can burn **Credits** to move (Exchange Rate: **2 Credits = 1 Move**).
*   *Warning*: Running out of both Moves and Credits leaves you stranded.

### 2. Territorial Growth
You expand by "growing" the hex you are standing on.

*   **Acquisition (L0 → L1)**: Taking over a neutral sector is always allowed (provided you can afford the cost). This is how you claim territory and reset durability to max.
*   **Vertical Expansion (Upgrading)**: Increasing a sector's level (e.g., L2 → L3) increases its value and your income, but requires adhering to strict zoning rules.

### 3. Structural Integrity Rules
To prevent "towering" (building a single massive tower), the game enforces structural stability:

*   **The Staircase Rule**: To upgrade a hex to **Level X**, you must have at least **2 neighbors** at **Level X-1** or higher.
*   **The Valley Rule (Exception)**: If a hex is surrounded by **5 or more** neighbors of a strictly higher level, it lifts the support requirement.

### 4. The Cycle Lock (Anti-Spam)
You cannot simply spam upgrades on a single hex to power-level.

*   **The Queue**: The system tracks your last N upgrades. You cannot upgrade a hex that is currently in your "Recent Upgrades" queue.
*   **Difficulty Scaling**:
    *   **Cadet (Easy)**: Queue size of 1.
    *   **Veteran (Medium)**: Queue size of 2.
    *   **Elite (Hard)**: Queue size of 3. (Complex rotation required).

### 5. Recovery & Farming
If you are low on resources, you can perform a **Recovery** operation on any hex you own.
*   Instead of upgrading the level, you harvest supplies.
*   **Reward**: Grants **+1 Move** and a significant amount of **Credits**.
*   *Strategy*: High-level hexes yield massive payouts but take longer to recover.

---

## 🤖 The AI: "Sentinel"

The world is populated by AI bots running the **"Survivor V14"** logic engine.

*   **Behavior**: They prioritize survival and economic efficiency. They will establish "farms" and attempt to cut off your path.
*   **Panic Mode**: If a bot gets trapped by Void Craters or obstacles, it triggers a "Panic" state, attempting desperate maneuvers to break free.

---

## 🎮 Controls

| Action | Control |
| :--- | :--- |
| **Move / Select** | `Left Click` on a Hex |
| **Pan Camera** | `Left Click` + Drag background |
| **Rotate Camera** | `Right Click` + Drag |
| **Zoom** | `Mouse Wheel` |
| **Growth / Upgrade** | `Amber Button` (HUD) |
| **Recover Supplies** | `Blue Button` (HUD) |
| **Abort / Menu** | `Log Out` Icon (Top Right) |
| **Mute Audio** | `Speaker` Icon (Top Left) |

---

## 🛠️ Technical Stack

*   **Frontend**: React 19, TailwindCSS
*   **Graphics**: Konva (HTML5 Canvas) via `react-konva`
*   **State Management**: Zustand
*   **Build Tool**: Vite
*   **Audio**: Web Audio API (Procedural)

---

*HexQuest Economy - v3.2*
