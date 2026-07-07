import re

with open('components/GameView.tsx', 'r') as f:
    content = f.read()

# Replace the centerOnPlayer targetScale logic
old_center = """      // Compute target scale
      let targetScale = targetCameraRef.current.scale;
      if (isMobile) {
          const baseScale = 0.75;
          const zoomFactor = Math.max(0.42, 1.0 - Math.max(0, playerLevel - 1) * 0.065);
          targetScale = baseScale * zoomFactor;
      }"""
new_center = """      // Compute target scale
      let targetScale = targetCameraRef.current.scale;"""
content = content.replace(old_center, new_center)

# Replace the auto-center useEffect logic
old_track = """      const baseScale = 0.75; // a comfortable small zoom
      const zoomFactor = Math.max(0.42, 1.0 - Math.max(0, playerLevel - 1) * 0.065);
      const targetScale = baseScale * zoomFactor;"""
new_track = """      const targetScale = targetCameraRef.current.scale;"""
content = content.replace(old_track, new_track)

with open('components/GameView.tsx', 'w') as f:
    f.write(content)

