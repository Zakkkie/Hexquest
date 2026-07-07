import re

with open('campaign/series1.ts', 'r') as f:
    content = f.read()

# Fix Level 1.3 hints
# For L3, we need L2 supports
old_l3_hint = """      const l3Supports = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 3).length;
      
      if (h00 === 2) {
        if (l3Supports < 2) {
          return isRu
            ? `СТРОЙ БАШНИ L3: Чтобы поднять Центр до L3, нужно возвести 2 соседние плиты до высоты L3! Готово: ${l3Supports}/2`
            : `BUILD L3 TOWERS: Upgrade 2 neighboring tiles to height L3 to unlock the Center! Progress: ${l3Supports}/2`;
        }"""
new_l3_hint = """      const l2SupportsForL3 = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 2).length;
      
      if (h00 === 2) {
        if (l2SupportsForL3 < 2) {
          return isRu
            ? `СТРОЙ БАШНИ L3: Чтобы поднять Центр до L3, нужно возвести 2 соседние плиты до высоты L2! Готово: ${l2SupportsForL3}/2`
            : `BUILD L3 TOWERS: Upgrade 2 neighboring tiles to height L2 to unlock the Center! Progress: ${l2SupportsForL3}/2`;
        }"""
content = content.replace(old_l3_hint, new_l3_hint)

# For L2, we need L1 supports
old_l2_hint = """      const l2Supports = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 2).length;
      if (h00 === 1) {
        if (l2Supports < 2) {
          return isRu
            ? `СТРОЙ ОПОРЫ L2: Чтобы поднять Центр до L2, нужно минимум 2 опорных гекса на уровне L2 вокруг! Готово: ${l2Supports}/2`
            : `BUILD L2 SUPPORTS: Need at least 2 neighboring hexes at L2 to upgrade the Center! Ready: ${l2Supports}/2`;
        }"""
new_l2_hint = """      const l1SupportsForL2 = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 1).length;
      if (h00 === 1) {
        if (l1SupportsForL2 < 2) {
          return isRu
            ? `СТРОЙ ОПОРЫ L2: Чтобы поднять Центр до L2, нужно минимум 2 опорных гекса на уровне L1 вокруг! Готово: ${l1SupportsForL2}/2`
            : `BUILD L2 SUPPORTS: Need at least 2 neighboring hexes at L1 to upgrade the Center! Ready: ${l1SupportsForL2}/2`;
        }"""
content = content.replace(old_l2_hint, new_l2_hint)

with open('campaign/series1.ts', 'w') as f:
    f.write(content)
