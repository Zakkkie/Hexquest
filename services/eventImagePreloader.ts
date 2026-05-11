export const preloadEventImages = (eventRegistry: any) => {
  if (typeof window === 'undefined') return;
  
  // Collect all unique images
  const imageUrls = new Set<string>();
  
  // Attempt to extract images from EVENT_REGISTRY
  try {
    for (const key of Object.keys(eventRegistry)) {
      const event = eventRegistry[key];
      if (event && event.nodes) {
        for (const nodeId of Object.keys(event.nodes)) {
          const node = event.nodes[nodeId];
          if (node && typeof node.image === 'string' && node.image.trim() !== '') {
            imageUrls.add(node.image);
          }
        }
      }
    }
    
    // Preload them using standard Image object
    imageUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
    
    console.log(`[Optimization] Preloaded ${imageUrls.size} event background images.`);
  } catch (error) {
    console.error('[Optimization] Failed to preload event images:', error);
  }
};
