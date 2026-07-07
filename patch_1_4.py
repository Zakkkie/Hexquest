import re

with open('campaign/series1.ts', 'r') as f:
    content = f.read()

# Update level 1.4 layout
old_layout = """      customLayout: [
        { q: 0, r: 0, currentLevel: 4, maxLevel: 4, revealed: true, ownerId: 'player-1' }, // Reactor L4
        { q: 1, r: -1, currentLevel: 3, maxLevel: 3, revealed: true }, // Buffer L3
        { q: -1, r: 1, currentLevel: 3, maxLevel: 3, revealed: true }, // Buffer L3
        { q: 2, r: -2, currentLevel: 2, maxLevel: 2, revealed: true }, // Slide L2
        { q: -2, r: 2, currentLevel: 2, maxLevel: 2, revealed: true }, // Slide L2
        { q: 1, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: -1, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 0, r: -1, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 0, r: 1, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: -2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: 0, r: -2, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: 0, r: 2, currentLevel: 2, maxLevel: 2, revealed: true },
      ]"""
new_layout = """      customLayout: [
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Reactor L1
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true }, // Buffer L0
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Buffer L0
        { q: 2, r: -2, currentLevel: -1, maxLevel: -1, revealed: true }, // Slide L-1
        { q: -2, r: 2, currentLevel: -1, maxLevel: -1, revealed: true }, // Slide L-1
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 2, r: 0, currentLevel: -1, maxLevel: -1, revealed: true },
        { q: -2, r: 0, currentLevel: -1, maxLevel: -1, revealed: true },
        { q: 0, r: -2, currentLevel: -1, maxLevel: -1, revealed: true },
        { q: 0, r: 2, currentLevel: -1, maxLevel: -1, revealed: true },
      ]"""
content = content.replace(old_layout, new_layout)

# Update objectiveHexes
old_obj = """    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'Reactor', color: 'blue' },
      { q: 1, r: -1, targetLevel: 3, label: 'L3', color: 'blue' },
      { q: -1, r: 1, targetLevel: 3, label: 'L3', color: 'blue' },
      { q: 2, r: -2, targetLevel: 2, label: 'L2', color: 'blue' },
      { q: -2, r: 2, targetLevel: 2, label: 'L2', color: 'blue' },
    ],"""
new_obj = """    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 1, label: 'Reactor', color: 'blue' },
      { q: 1, r: -1, targetLevel: 0, label: 'L0', color: 'blue' },
      { q: -1, r: 1, targetLevel: 0, label: 'L0', color: 'blue' },
      { q: 2, r: -2, targetLevel: -1, label: 'L-1', color: 'blue' },
      { q: -2, r: 2, targetLevel: -1, label: 'L-1', color: 'blue' },
    ],"""
content = content.replace(old_obj, new_obj)

# Update startState
content = content.replace("startState: { credits: 0, moves: 12, rank: 4, materials: 0, initialEntropy: 100 },", "startState: { credits: 0, moves: 12, rank: 1, materials: 0, initialEntropy: 100 },")

# Update 100 to 15
content = content.replace("if (credits >= 100) {", "if (credits >= 15) {")
content = content.replace("return state.player.coins >= 100;", "return state.player.coins >= 15;")

with open('campaign/series1.ts', 'w') as f:
    f.write(content)
