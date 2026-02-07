
# HexQuest Economy

**HexQuest Economy** is a high-fidelity isometric strategy game where exploration meets strict economic management. Built with **React 19**, **Konva**, and **TypeScript**, it features an infinite procedural world, vertical terrain manipulation, and competitive AI.

## 🚀 Key Features

*   **2.5D Isometric Engine**: Custom rendering engine built on `react-konva` supporting dynamic lighting, height perspective, and smooth animations.
*   **Verticality & Physics**: Terrain height affects movement cost. **Level 1** sectors are unstable and will collapse into the **Void** if traversed too often.
*   **"The Cycle" Economy**: A tight resource loop. **Dig** terrain to gain materials, **Build** upwards to increase rank and income, **Recover** to refuel.
*   **Procedural Audio**: "Nebula V2" sound engine generates dynamic music and SFX in real-time using the Web Audio API (FM Synthesis). No audio assets required.
*   **Smart AI**: Competitive "Architect" bots that gather resources, build bases, and compete for territory.
*   **Campaign & Skirmish**: A scripted campaign mode with unique objectives and a customizable skirmish generator.

## 🎮 How to Play

### Controls
*   **Left Click**: Move / Select Hex.
*   **Right Click + Drag**: Rotate Camera.
*   **Scroll**: Zoom In/Out.
*   **UI Buttons**: Trigger actions (Dig, Upgrade, Recover).

### The Core Loop
1.  **Movement**: Moving costs **Moves** (Fuel). High terrain (Level 2+) costs more fuel. If out of fuel, you burn **Credits**.
2.  **Excavation (Red)**: Dig down to lower a hex's level. Rewards **Material** and **Moves** (based on depth).
3.  **Construction (Amber)**: Spend **Material** to raise a hex's level. Higher levels grant Rank and Income.
    *   *Rule*: To build up, you need support neighbors at the same level.
4.  **Recovery (Blue)**: Spend time on an owned hex to generate **Moves** and **Credits**.

### ⚠️ The Void Hazard
Level 1 hexes have **Durability**. Every time a unit steps off a Level 1 hex, it cracks. When durability hits 0, it collapses into the Void. Falling or being near a collapse damages your Rank.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **State Management**: Zustand
*   **Graphics**: Konva (Canvas API), TailwindCSS
*   **Audio**: Native Web Audio API (Procedural)
*   **Bundler**: Vite

## ⚡ Quick Start

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Build for Production**
    ```bash
    npm run build
    ```
