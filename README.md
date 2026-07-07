
# HexQuest Economy

**HexQuest Economy** is a high-fidelity isometric strategy game where exploration meets strict economic management. Built with **React 19**, **Konva**, and **TypeScript**, it features an infinite procedural world, vertical terrain manipulation, and competitive AI.

## 🚀 Key Features

*   **2.5D Isometric Engine**: Custom rendering engine built on `react-konva` supporting dynamic lighting, height perspective, and smooth animations.
*   **Adaptive Responsive UI**: Automatically detects device type (Mobile, Tablet, Desktop) and scales the interface, HUD, and touch targets for optimal playability on any screen.
*   **Verticality & Physics**: Terrain height affects movement cost. **Level 1** sectors are unstable and will collapse into the **Void** if traversed too often.
*   **"The Cycle" Economy**: A tight resource loop. **Dig** terrain to gain materials, **Build** upwards to increase rank and income, **Recover** to refuel.
*   **Procedural Audio**: "Nebula V2" sound engine generates dynamic music and SFX in real-time using the Web Audio API (FM Synthesis). No audio assets required.
*   **Smart AI**: Competitive "Architect" bots that gather resources, build bases, and compete for territory.
*   **Loot System**: Deep excavation yields rare artifacts and currency needed for special interactions.

## 🎮 How to Play

### Controls (Desktop)
*   **Left Click**: Move / Select Hex.
*   **Right Click + Drag**: Rotate Camera.
*   **Scroll**: Zoom In/Out.
*   **Drag & Drop**: Move items from inventory to interactive slots (Monument).

### Controls (Mobile / Touch)
*   **Tap**: Move / Select Hex.
*   **Two-Finger Pinch**: Zoom In/Out.
*   **Two-Finger Rotate**: Rotate Camera.
*   **Long Press**: Inspect Item (Inventory).

### The Core Loop
1.  **Movement**: Moving costs **Moves** (Fuel). High terrain (Level 2+) costs more fuel. If out of fuel, you burn **Credits**.
2.  **Excavation (Red)**: Dig down to lower a hex's level.
    *   **Surface Digging**: Grants **Material**.
    *   **Deep Mining (Negative Levels)**: Chance to find **Loot** (Items) or Coins.
3.  **Construction (Amber)**: Spend **Material** to raise a hex's level. Higher levels grant Rank and Income.
    *   *Rule*: To build up, you need support neighbors at the same level.
4.  **Recovery (Blue)**: Spend time on an owned hex to generate **Moves** and **Credits**.
    *   **Standard Recovery (L0 & Pits)**: Single use per visit. Move away to reset.
    *   **Advanced Recovery (L1+)**: High-level sectors have **3 Charges**. When depleted, they enter a **15s Cooldown**.

### 🏆 Victory Conditions

**King of the Hill (Summit)**
Locate the **Ancient Monument** hidden in the fog. To win, you must:
1.  Physically reach the Monument (requires building a staircase to its height).
2.  **Activate** it by inserting **3 Keys** (Items) from your inventory.

**Activation Rules (Difficulty):**
*   **Easy**: Accepts keys of **ANY** rarity.
*   **Medium**: Requires **UNCOMMON**, **RARE**, or **LEGENDARY** keys (No Common).
*   **Hard**: Requires **RARE** or **LEGENDARY** keys (No Common, No Uncommon).

### ⚠️ Environmental Hazards

**Terrain Instability & The Void**
Level 1 sectors ("Cracked Ground") have limited **Durability**.
*   Every time a unit steps *off* a Level 1 hex, it takes damage.
*   When durability reaches 0, the sector collapses into the **Void**.
*   **Stabilization**: You can throw items into a Void hex to attempt to restore it to Level 0. Rarity increases success chance (Common 25% -> Legendary 100%).

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
