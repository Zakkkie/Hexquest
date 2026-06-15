import { create } from 'zustand';

interface EphemeralState {
  hoveredHexId: string | null;
  setHoveredHexId: (id: string | null) => void;
  
  camera: { x: number; y: number; scale: number; rotation: number };
  setCamera: (camera: { x: number; y: number; scale: number; rotation: number }) => void;
  
  shakeOffset: { x: number; y: number };
  setShakeOffset: (offset: { x: number; y: number }) => void;
}

export const useEphemeralStore = create<EphemeralState>((set) => ({
  hoveredHexId: null,
  setHoveredHexId: (id) => set({ hoveredHexId: id }),
  
  camera: { x: 0, y: 0, scale: 1, rotation: 0 },
  setCamera: (camera) => set({ camera }),
  
  shakeOffset: { x: 0, y: 0 },
  setShakeOffset: (offset) => set({ shakeOffset: offset }),
}));
