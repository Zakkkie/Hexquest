import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Line, Text, Circle, Rect, Path, Ellipse } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { hexToPixel, getHexKey, cubeDistance, findOverworldPath, getReachableOverworldHexes, getNeighbors } from '../services/hexUtils.ts';
import { getHexHeight } from '../services/OverworldGenerator.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { ArrowLeft, Zap, Heart, Coins, Backpack, Tent, Search, Hand, Target, RefreshCw, Settings, X, LogOut, Music, VolumeX, Volume2, Globe, BookOpen, Trophy, FileText, RotateCcw, Pickaxe, Hammer, XCircle, CheckCircle, Info } from 'lucide-react';
import HexButton from './HexButton.tsx';
import { ITEM_REGISTRY } from '../rules/items.ts';
import { ItemIcon, getRarityBorder } from './hud/HudShared.tsx';
import EventModal from './EventModal.tsx';
import InventoryModal from './InventoryModal.tsx';
import OverworldHexNode from './OverworldHexNode.tsx';
import OverworldMinimap from './OverworldMinimap.tsx';
import Background from './Background.tsx';
import GameDialogs from './hud/GameDialogs.tsx';
import { Item, EntityType } from '../types.ts';
import { TEXT, Dictionary } from '../services/i18n.ts';
import { unitRenderer } from '../services/unitRenderer.ts';
import { Image as KonvaImage } from 'react-konva';

const OverworldView: React.FC = () => {
  const overworld = useGameStore(state => state.overworld);
  const setUIState = useGameStore(state => state.setUIState);
  const hasHydrated = useGameStore(state => state.hasHydrated);
  const initOverworld = useGameStore(state => state.initOverworld);
  const moveOverworldPlayer = useGameStore(state => state.moveOverworldPlayer);
  const restOverworld = useGameStore(state => state.restOverworld);
  const exploreOverworld = useGameStore(state => state.exploreOverworld);
  const digOverworld = useGameStore(state => state.digOverworld);
  const buildOverworld = useGameStore(state => state.buildOverworld);
  const interactOverworld = useGameStore(state => state.interactOverworld);
  const enterRift = useGameStore(state => state.enterRift);
  const toggleMusic = useGameStore(state => state.toggleMusic);
  const toggleSfx = useGameStore(state => state.toggleSfx);
  const isMusicMuted = useGameStore(state => state.isMusicMuted);
  const isSfxMuted = useGameStore(state => state.isSfxMuted);
  const language = useGameStore(state => state.language);
  const setLanguage = useGameStore(state => state.setLanguage);
  const playUiSound = useGameStore(state => state.playUiSound);
  const showToast = useGameStore(state => state.showToast);
  
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const toast = useGameStore(state => state.toast);
  const hideToast = useGameStore(state => state.hideToast);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(hideToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cameraFollow, setCameraFollow] = useState(true);
  const [showPaths, setShowPaths] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);
  const [victoryStage, setVictoryStage] = useState<'HIDDEN' | 'SALUTE' | 'MODAL'>('HIDDEN');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const campaignProgress = useGameStore(state => state.campaignProgress);
  const t = TEXT[language] as Dictionary;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(event.target as Node)) {
        setIsSystemMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { grid, player } = overworld;
  const currentHex = grid[getHexKey(player.q, player.r)];
  const user = useGameStore(state => state.user);

  const finalColor = user?.avatarColor || '#3b82f6';
  const finalHead = user?.headIndex ?? 0;
  const finalBody = user?.bodyIndex ?? 0;

  const spriteImage = useMemo(() => {
    return unitRenderer.getUnitImage(finalHead, finalBody, finalColor, EntityType.PLAYER);
  }, [finalHead, finalBody, finalColor]);

  const getHeightOffset = (lvl: number) => {
    if (lvl >= 0) return -(2 + lvl * 2);
    return (Math.abs(lvl) - 1) * 2;
  };

  const [visualPlayerPos, setVisualPlayerPos] = useState({ q: 0, r: 0 });
  const [visualPlayerHeight, setVisualPlayerHeight] = useState(() => {
    const startHex = overworld.grid[getHexKey(overworld.player.q, overworld.player.r)];
    const lvl = startHex ? (startHex.height ?? getHexHeight(startHex.terrainType)) : 0;
    return getHeightOffset(lvl);
  });
  const playerTweenRef = useRef<Konva.Tween | null>(null);
  const cameraTweenRef = useRef<Konva.Tween | null>(null);
  const playerNodeRef = useRef<any>(null);
  const playerGlowRef = useRef<any>(null);
  const playerPulseRef = useRef<Konva.Animation | null>(null);
  const playerBodyRef = useRef<any>(null);
  const playerFigureRef = useRef<any>(null);
  const playerWalkRef = useRef<Konva.Animation | null>(null);
  const playerFacingRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (overworld.isOverworldMoving) return;
    const currentHex = grid[getHexKey(player.q, player.r)];
    const currentLvl = currentHex ? (currentHex.height ?? getHexHeight(currentHex.terrainType)) : 0;
    const currentHeight = getHeightOffset(currentLvl);
    
    // Remove timeout for prompt updates
    setVisualPlayerHeight(currentHeight);
  }, [player.q, player.r, grid[getHexKey(player.q, player.r)]?.height, overworld.isOverworldMoving]);

  useEffect(() => {
    if (playerGlowRef.current) {
      playerPulseRef.current = new Konva.Animation((frame) => {
        if (!frame || !playerGlowRef.current) return;
        const scale = 1 + Math.sin(frame.time / 200) * 0.15;
        playerGlowRef.current.scale({ x: scale, y: scale });
        playerGlowRef.current.opacity(0.5 + Math.sin(frame.time / 200) * 0.3);
      }, playerGlowRef.current.getLayer());
      playerPulseRef.current.start();
    }
    return () => {
      if (playerPulseRef.current) playerPulseRef.current.stop();
      if (playerWalkRef.current) playerWalkRef.current.stop();
    };
  }, [overworld.isGenerated]);

  useEffect(() => {
    if (hasHydrated && !overworld.isGenerated) {
      initOverworld();
    }
  }, [hasHydrated, overworld.isGenerated, initOverworld]);

  // Check if player can interact
  const canInteract = useCallback(() => {
    if (overworld.activeAction) return false;
    const currentHex = grid[getHexKey(player.q, player.r)];
    if (!currentHex) return false;
    if (currentHex.riftId || currentHex.poiId || currentHex.terrainType === 'CITY') return true;
    
    // Check neighbors for POIs
    const neighbors = getNeighbors(player.q, player.r);
    for (const n of neighbors) {
      const nHex = grid[getHexKey(n.q, n.r)];
      if (nHex && (nHex.poiId || nHex.riftId)) return true;
    }
    return false;
  }, [overworld.activeAction, grid, player.q, player.r]);

  useEffect(() => {
    if (overworld.isGenerated && playerNodeRef.current) {
      if (player.q !== visualPlayerPos.q || player.r !== visualPlayerPos.r) {
        // Stop previous animations
        if (playerTweenRef.current) {
          playerTweenRef.current.destroy();
          playerTweenRef.current = null;
        }
        if (playerWalkRef.current) {
          playerWalkRef.current.stop();
          playerWalkRef.current = null;
        }

        // Calculate start and end positions
        const startPixel = hexToPixel(visualPlayerPos.q, visualPlayerPos.r, 0);
        const startHex = grid[getHexKey(visualPlayerPos.q, visualPlayerPos.r)];
        const startLvl = startHex ? (startHex.height ?? getHexHeight(startHex.terrainType)) : 0;
        const startY = startPixel.y + getHeightOffset(startLvl);

        const endPixel = hexToPixel(player.q, player.r, 0);
        const endHex = grid[getHexKey(player.q, player.r)];
        const endLvl = endHex ? (endHex.height ?? getHexHeight(endHex.terrainType)) : 0;
        const endY = endPixel.y + getHeightOffset(endLvl);

        // Determine facing direction
        const dx = endPixel.x - startPixel.x;
        if (Math.abs(dx) > 1 && playerFigureRef.current) {
          playerFacingRef.current = dx > 0 ? 1 : -1;
          playerFigureRef.current.scaleX(playerFacingRef.current);
        }

        const duration = 350; // Slightly faster for snappier feel
        const startTime = Date.now();
        const jumpHeight = 12; // Lower jump for more stable feel

        // Start jump animation
        const layer = playerNodeRef.current.getLayer();
        if (layer) {
          playerWalkRef.current = new Konva.Animation((frame) => {
            if (!frame || !playerNodeRef.current) return;
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            // Linear progress for smooth chaining
            const curX = startPixel.x + (endPixel.x - startPixel.x) * progress;
            const curY = startY + (endY - startY) * progress;
            
            // Jump arc (sine wave)
            const jump = Math.sin(progress * Math.PI) * jumpHeight;

            playerNodeRef.current.x(curX);
            playerNodeRef.current.y(curY - jump);

            // Synchronized camera follow (follow ground position for stability)
            if (cameraFollow && containerRef.current && stageRef.current) {
              const targetX = containerRef.current.clientWidth / 2 - curX * viewState.scale;
              const targetY = (containerRef.current.clientHeight / 2) - getCenterOffset() - curY * viewState.scale;
              
              stageRef.current.x(targetX);
              stageRef.current.y(targetY);
            }

            if (progress >= 1) {
              if (playerWalkRef.current) playerWalkRef.current.stop();
              playerWalkRef.current = null;
              
              // Sync visual state at the end of each step
              setVisualPlayerPos({ q: player.q, r: player.r });
              setVisualPlayerHeight(getHeightOffset(endLvl));
              
              // Sync React state at the end of movement
              if (cameraFollow && stageRef.current) {
                setViewState(prev => ({
                  ...prev,
                  x: stageRef.current!.x(),
                  y: stageRef.current!.y()
                }));
              }
            }
          }, layer);
          playerWalkRef.current.start();
        }
      }
    } else if (overworld.isGenerated) {
      setVisualPlayerPos({ q: player.q, r: player.r });
    }
  }, [player.q, player.r, overworld.isGenerated, cameraFollow, viewState.scale]);

  const deviceType = useGameStore(state => state.deviceType);
  const getCenterOffset = () => {
      return deviceType === 'MOBILE' ? 120 : 100;
  };

  // Center camera on player initially
  const centerCamera = () => {
    if (overworld.isGenerated && containerRef.current) {
      const targetHex = grid[getHexKey(overworld.player.q, overworld.player.r)];
      const { x, y: baseY } = hexToPixel(overworld.player.q, overworld.player.r, 0);
      const targetLvl = targetHex ? (targetHex.height ?? getHexHeight(targetHex.terrainType)) : 0;
      const y = baseY + getHeightOffset(targetLvl);
      
      // Smooth transition to center
      const targetX = containerRef.current.clientWidth / 2 - x * viewState.scale;
      const targetY = (containerRef.current.clientHeight / 2) - getCenterOffset() - y * viewState.scale;
      
      setViewState(prev => ({
        ...prev,
        x: targetX,
        y: targetY,
      }));
      setCameraFollow(true);
      playUiSound('CLICK');
    }
  };

  const togglePaths = () => {
    const next = !showPaths;
    setShowPaths(next);
    if (next) {
      centerCamera();
    }
    playUiSound('CLICK');
  };

  const reachableHexes = useMemo(() => {
    if (!showPaths) return new Set<string>();
    return getReachableOverworldHexes({ q: player.q, r: player.r }, player.energy, grid);
  }, [showPaths, player.q, player.r, player.energy, grid]);

  useEffect(() => {
    if (overworld.isGenerated) {
      // Initial center with default scale
      const targetHex = grid[getHexKey(overworld.player.q, overworld.player.r)];
      const { x, y: baseY } = hexToPixel(overworld.player.q, overworld.player.r, 0);
      const targetLvl = targetHex ? (targetHex.height ?? getHexHeight(targetHex.terrainType)) : 0;
      const y = baseY + getHeightOffset(targetLvl);
      setViewState({
        x: window.innerWidth / 2 - x * 1.5,
        y: (window.innerHeight / 2) - getCenterOffset() - y * 1.5,
        scale: 1.5
      });
    }
  }, [overworld.isGenerated, deviceType]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.6, Math.min(newScale, 3)); // Restricted zoom out

    setViewState({
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
    setCameraFollow(false);
  };

  const lastDist = useRef(0);
  const lastCenter = useRef<{ x: number, y: number } | null>(null);

  const handleTouchMove = (e: any) => {
    e.evt.preventDefault(); // Prevent default browser zoom/scroll
    const stage = e.target.getStage();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      if (stage.isDragging()) stage.stopDrag();

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      if (!lastCenter.current) {
        lastCenter.current = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
        };
        return;
      }

      const newCenter = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };

      const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

      if (!lastDist.current) {
        lastDist.current = dist;
        return;
      }

      const pointTo = {
        x: (newCenter.x - stage.x()) / stage.scaleX(),
        y: (newCenter.y - stage.y()) / stage.scaleX(),
      };

      const scaleBy = dist / lastDist.current;
      const newScale = stage.scaleX() * scaleBy;
      const clampedScale = Math.max(0.6, Math.min(newScale, 3)); // Restricted zoom out

      setViewState({
        scale: clampedScale,
        x: newCenter.x - pointTo.x * clampedScale,
        y: newCenter.y - pointTo.y * clampedScale,
      });

      lastDist.current = dist;
      lastCenter.current = newCenter;
      setCameraFollow(false);
    }
  };

  const handleTouchEnd = () => {
    lastDist.current = 0;
    lastCenter.current = null;
  };

  const handleDragStart = () => {
    setCameraFollow(false);
  };

  const handleDragEnd = (e: any) => {
    setViewState(prev => ({
      ...prev,
      x: e.target.x(),
      y: e.target.y()
    }));
  };

  const [showInventory, setShowInventory] = useState(false);

  const handleHexClick = async (q: number, r: number) => {
    if (overworld.isOverworldMoving) return;
    
    const clickedHex = grid[getHexKey(q, r)];
    
    if (q === player.q && r === player.r) {
      interactOverworld(q, r);
      return;
    }
    
    if (clickedHex?.poiId && clickedHex.poiId.startsWith('city_')) {
      const dist = cubeDistance({ q: player.q, r: player.r }, { q, r });
      if (dist <= 1) {
        interactOverworld(q, r);
        return;
      } else {
        // Find an adjacent passable hex to the entire building cluster
        // that is closest to the player
        const clusterHexes = Object.values(grid).filter(h => h.poiId === clickedHex.poiId);
        const allNeighbors = new Set<string>();
        for (const ch of clusterHexes) {
            const neighbors = getNeighbors(ch.q, ch.r);
            for (const n of neighbors) {
                allNeighbors.add(getHexKey(n.q, n.r));
            }
        }
        
        let bestNeighbor = null;
        let minCost = Infinity;
        let bestPath = null;
        
        for (const nKey of allNeighbors) {
          const nHex = grid[nKey];
          if (nHex && nHex.moveCost < 999 && nHex.poiId !== clickedHex.poiId) {
            const n = { q: nHex.q, r: nHex.r };
            const pathResult = findOverworldPath({ q: player.q, r: player.r }, n, grid);
            if (pathResult.path) {
              let cost = 0;
              for (const step of pathResult.path) {
                const stepHex = grid[getHexKey(step.q, step.r)];
                cost += stepHex ? stepHex.moveCost : 1;
              }
              if (cost < minCost) {
                minCost = cost;
                bestNeighbor = n;
                bestPath = pathResult.path;
              }
            }
          }
        }
        
        if (bestPath) {
          if (minCost > player.energy) {
            showToast(TEXT[language].TOAST.NEED_ENERGY.replace('{0}', minCost.toString()), 'error');
            return;
          }
          
          if (bestPath.length > 0) {
            await moveOverworldPlayer(bestPath);
            interactOverworld(q, r);
          } else {
            // Already there
            interactOverworld(q, r);
          }
          return;
        } else {
          showToast(TEXT[language].TOAST.PATH_BLOCKED, 'error');
          return;
        }
      }
    }
    
    const start = { q: player.q, r: player.r };
    const end = { q, r };
    const pathResult = findOverworldPath(start, end, grid);
    
    if (!pathResult.path) {
      let message = TEXT[language].TOAST.PATH_BLOCKED;
      if (pathResult.reason === 'IMPASSABLE') message = TEXT[language].TOAST.IMPASSABLE;
      if (pathResult.reason === 'TOO_FAR') message = TEXT[language].TOAST.TOO_FAR;
      if (pathResult.reason === 'STEEP') message = TEXT[language].TOAST.TOO_STEEP;
      if (pathResult.reason === 'VOID') message = TEXT[language].TOAST.PATH_VOID;
      showToast(message, 'error');
      return;
    }

    // Calculate total cost
    let totalCost = 0;
    for (const step of pathResult.path) {
      const hex = grid[getHexKey(step.q, step.r)];
      totalCost += hex ? hex.moveCost : 1;
    }

    if (totalCost > player.energy) {
      showToast(TEXT[language].TOAST.NEED_ENERGY.replace('{0}', totalCost.toString()), 'error');
      return;
    }

    moveOverworldPlayer(pathResult.path);
  };

  // Stable reference for the click handler to prevent unnecessary re-renders of hex nodes
  // while still allowing the handler to access the latest state.
  const handleHexClickRef = useRef(handleHexClick);
  useEffect(() => {
    handleHexClickRef.current = handleHexClick;
  }, [handleHexClick]);

  const stableHandleHexClick = useCallback((q: number, r: number) => {
    handleHexClickRef.current(q, r);
  }, []);

  if (!overworld.isGenerated) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Generating World...</div>;
  }

  // Viewport culling
  const visibleHexes = useMemo(() => {
    const hexes = [];
    // Calculate radius based on screen size and scale
    const screenRadius = Math.max(windowSize.width, windowSize.height) / (viewState.scale * GAME_CONFIG.HEX_SIZE * 1.5);
    const CHUNK_RADIUS = Math.min(35, Math.max(12, Math.ceil(screenRadius))); // Increased radius for smoother movement
    
    // We need to cull based on the camera center, not just the player!
    // But if we just use the camera center, we need to convert pixel to hex.
    // For simplicity, let's just use the camera center pixel.
    const centerX = (windowSize.width / 2 - viewState.x) / viewState.scale;
    const centerY = (windowSize.height / 2 - viewState.y) / viewState.scale;
    
    for (const key in grid) {
      const hex = grid[key];
      
      const { x, y } = hexToPixel(hex.q, hex.r, 0);
      
      // Simple distance check in pixels
      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (dist <= CHUNK_RADIUS * GAME_CONFIG.HEX_SIZE * 1.5) {
        hexes.push({ hex, y });
      }
    }
    
    // Sort by Y coordinate for proper 3D rendering (back to front)
    return hexes.sort((a, b) => a.y - b.y).map(item => item.hex);
  }, [grid, viewState.x, viewState.y, viewState.scale, windowSize]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col" ref={containerRef}>
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <Background variant="GAME" />
      </div>
      
      {/* HUD */}
      <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-30 pt-[max(0.5rem,env(safe-area-inset-top))] animate-in fade-in">
        <div className="w-full flex justify-between items-start gap-2 md:gap-4 max-w-7xl mx-auto relative pointer-events-none">
          
          {/* STATS STRIP */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="pointer-events-auto flex items-center bg-slate-900/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-slate-700/50 shadow-xl px-2 py-1.5 md:px-3 md:py-2 gap-1.5 md:gap-4 transition-all duration-300 hover:border-slate-600/50 overflow-x-auto no-scrollbar mask-linear-fade w-full md:w-fit md:shrink-0">
              
              {/* HP */}
              <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                <div className="w-7 h-7 md:w-10 md:h-10 rounded-md md:rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/30 group-hover:bg-rose-500/20 transition-colors">
                  <Heart className="w-4 h-4 md:w-5 md:h-5 text-rose-400" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">VITALITY</span>
                  <span className="text-xs md:text-xl font-black text-white leading-none">{player.hp} / {player.maxHp}</span>
                </div>
              </div>

              <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0" />

              {/* Energy */}
              <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                <div className="w-7 h-7 md:w-10 md:h-10 rounded-md md:rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/30 group-hover:bg-blue-500/20 transition-colors">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">ENERGY</span>
                  <span className="text-xs md:text-xl font-black text-white leading-none">{player.energy} / {player.maxEnergy}</span>
                </div>
              </div>

              <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0" />

              {/* Coins */}
              <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                <div className="w-7 h-7 md:w-10 md:h-10 rounded-md md:rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30 group-hover:bg-amber-500/20 transition-colors">
                  <Coins className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">CREDITS</span>
                  <span className="text-xs md:text-xl font-black text-white leading-none">{player.credits}</span>
                </div>
              </div>

              {/* Reputation badge */}
              {(() => {
                const rep = player.reputation ?? 0;
                const repColor = rep >= 80 ? 'text-amber-400' : rep >= 40 ? 'text-emerald-400' : rep <= -80 ? 'text-red-500' : rep <= -40 ? 'text-orange-400' : 'text-slate-400';
                const repLabel = rep >= 80 ? 'Страж' : rep >= 40 ? 'Уважаемый' : rep <= -80 ? 'Отверженный' : rep <= -40 ? 'Изгой' : 'Странник';
                const barWidth = Math.round(((rep + 100) / 200) * 100);
                return (
                  <div className="flex flex-col gap-0.5 min-w-[60px] md:min-w-[100px] shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider">REP</span>
                      <span className={`text-[7px] md:text-[9px] font-bold ${repColor} truncate`}>{repLabel}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, background: rep >= 40 ? '#fbbf24' : rep <= -40 ? '#ef4444' : '#94a3b8' }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex flex-col gap-2 pointer-events-auto items-end relative" ref={systemMenuRef}>
            <button 
              onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
              className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all flex items-center gap-2 ${isSystemMenuOpen ? 'bg-slate-800 border-slate-500 text-white' : 'bg-slate-800/50 hover:bg-slate-700/80 border-slate-700/50 text-slate-400 hover:text-white border'}`}
              title="Menu"
            >
              {isSystemMenuOpen ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Settings className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            {isSystemMenuOpen && (
              <div className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] z-[60] animate-in slide-in-from-top-2 duration-200">
                <div className="flex gap-2">
                    <button onClick={() => { toggleMusic(); playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}>{isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}</button>
                    <button onClick={() => { toggleSfx(); playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}>{isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                </div>
                <button onClick={() => { setLanguage(language === 'EN' ? 'RU' : 'EN'); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold uppercase">{language === 'EN' ? 'English' : 'Русский'}</span>
                </button>
                
                <button onClick={() => { setActiveModal('CODEX'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</span>
                </button>
                <button onClick={() => { setActiveModal('RANKINGS'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left border bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white`}>
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase">{t.HUD.LEADERBOARD_TITLE}</span>
                </button>
                <button onClick={() => { setActiveModal('LOG'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-200 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">{language === 'RU' ? 'Журнал Событий' : 'Event Log'}</span>
                </button>

                <div className="h-px bg-slate-700/50 my-1"></div>
                <button
                  onClick={() => {
                    playUiSound('CLICK');
                    setIsSystemMenuOpen(false);
                    setShowResetConfirm(true);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-900/10 hover:bg-amber-900/30 text-amber-400 hover:text-amber-200 border border-amber-900/30 hover:border-amber-500/50 transition-colors w-full text-left"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">{t.HUD.BTN_RETRY}</span>
                </button>
                
                <button 
                  onClick={() => {
                    playUiSound('CLICK');
                    setUIState('MENU');
                    setIsSystemMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-200 border border-red-900/30 hover:border-red-500/50 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">{t.HUD.BTN_MENU}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM DOCK */}
      <div className="absolute inset-x-0 bottom-0 p-2 md:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-6 pointer-events-none flex flex-col items-center justify-end z-30">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl md:rounded-3xl shadow-2xl p-1.5 md:p-3 pointer-events-auto flex items-center justify-between gap-2 md:gap-6 w-full md:w-auto max-w-7xl mx-auto overflow-hidden">
          
          {/* LEFT: INVENTORY */}
          <div className="flex items-center md:flex-col md:items-start gap-2 md:gap-1.5 shrink min-w-0 flex-1 md:flex-none overflow-hidden">
            <div 
              className="flex items-center justify-center w-8 h-8 md:w-full md:justify-between md:px-3 md:py-1 bg-slate-950/50 rounded-lg md:rounded-xl border border-slate-800 cursor-pointer group hover:bg-slate-800 transition-all shrink-0 touch-manipulation" 
              onClick={() => setShowInventory(true)}
            >
              <div className="hidden md:block truncate text-[10px] font-bold text-slate-400 group-hover:text-white font-mono tracking-widest uppercase">
                {language === 'RU' ? 'ИНВЕНТАРЬ' : 'INVENTORY'}
              </div>
              <Backpack className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 justify-start overflow-x-auto no-scrollbar mask-linear-fade-right pr-2">
              {[0, 1, 2, 3, 4].map(index => {
                const itemId = player.bag[index];
                const item = itemId ? ITEM_REGISTRY[itemId] : undefined;
                const slotSize = "w-7 h-7 md:w-10 md:h-10"; 
                return (
                  <div 
                    key={index} 
                    onClick={() => setShowInventory(true)}
                    className={`
                      ${slotSize} rounded-md md:rounded-lg border flex items-center justify-center relative group cursor-pointer transition-all shrink-0 touch-manipulation
                      ${item 
                        ? `bg-slate-800 ${getRarityBorder(item.rarity)} shadow-md hover:scale-105 active:scale-95` 
                        : 'bg-slate-950/50 border-slate-800/50 border-dashed'}
                    `}
                  >
                    {item ? <ItemIcon item={item} size={slotSize} /> : <div className="w-1 h-1 rounded-full bg-slate-800/50" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DIVIDER */}
          <div className="w-px h-10 md:h-16 bg-slate-800 mx-1 hidden md:block shrink-0" />

          {/* RIGHT: ACTION BUTTONS */}
          <div className="flex items-end gap-1 md:gap-3 shrink-0 ml-auto">
            <HexButton 
              variant="emerald" 
              size="lg" 
              onClick={() => {
                exploreOverworld();
                centerCamera();
              }}
              progress={overworld.activeAction === 'EXPLORE' ? overworld.actionProgress : 0}
              disabled={!!overworld.activeAction || !overworld.isWorldMap}
              title={`${t.OVERWORLD.EXPLORE} (-3 Energy)`}
            >
              <div className="flex flex-col items-center justify-center pt-1">
                <Search className="w-3.5 h-3.5 md:w-6 md:h-6" />
                <span className="text-[6px] md:text-[9px] font-bold text-emerald-400 mt-0.5">{t.OVERWORLD.EXPLORE}</span>
              </div>
            </HexButton>

            <HexButton 
              variant="red" 
              size="lg" 
              onClick={() => {
                digOverworld();
                centerCamera();
              }}
              progress={overworld.activeAction === 'DIG' ? overworld.actionProgress : 0}
              disabled={!!overworld.activeAction || !overworld.isWorldMap}
              title={`${t.OVERWORLD.DIG} (-2 Energy)`}
            >
              <div className="flex flex-col items-center justify-center pt-1">
                <Pickaxe className="w-3.5 h-3.5 md:w-6 md:h-6" />
                <span className="text-[6px] md:text-[9px] font-bold text-red-400 mt-0.5">{t.OVERWORLD.DIG}</span>
              </div>
            </HexButton>

            <HexButton 
              variant="amber" 
              size="lg" 
              onClick={() => {
                buildOverworld();
                centerCamera();
              }}
              progress={overworld.activeAction === 'BUILD' ? overworld.actionProgress : 0}
              disabled={!!overworld.activeAction || !overworld.isWorldMap}
              title={`${t.OVERWORLD.BUILD} (-2 Energy)`}
            >
              <div className="flex flex-col items-center justify-center pt-1">
                <Hammer className="w-3.5 h-3.5 md:w-6 md:h-6" />
                <span className="text-[6px] md:text-[9px] font-bold text-amber-400 mt-0.5">{t.OVERWORLD.BUILD}</span>
              </div>
            </HexButton>

            <HexButton 
              variant="blue" 
              size="lg" 
              onClick={() => {
                restOverworld();
                centerCamera();
              }}
              progress={overworld.activeAction === 'REST' ? overworld.actionProgress : 0}
              disabled={!!overworld.activeAction}
              title="REST (Needs Supplies)"
            >
              <div className="flex flex-col items-center justify-center pt-1">
                <Tent className="w-3.5 h-3.5 md:w-6 md:h-6" />
                <span className="text-[6px] md:text-[9px] font-bold text-blue-400 mt-0.5">REST</span>
              </div>
            </HexButton>

            <HexButton 
              variant="amber" 
              size="lg" 
              onClick={() => {
                interactOverworld();
                centerCamera();
              }}
              disabled={!canInteract()}
              title="INTERACT (Object / City)"
            >
              <div className="flex flex-col items-center justify-center pt-1">
                <Hand className="w-3.5 h-3.5 md:w-6 md:h-6" />
                <span className="text-[6px] md:text-[9px] font-bold text-amber-400 mt-0.5">INTERACT</span>
              </div>
            </HexButton>
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="absolute top-[15%] left-0 w-full flex justify-center z-[60] pointer-events-none px-4">
          <div className={`
            flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-full backdrop-blur-md shadow-2xl border
            animate-in slide-in-from-top-4 duration-300 max-w-[90vw] md:max-w-max
            ${toast.type === 'error' ? 'bg-red-950/60 border-red-500/50 text-red-100 animate-pulse' : ''}
            ${toast.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-100' : ''}
            ${toast.type === 'info' ? 'bg-slate-900/80 border-slate-700 text-white' : ''}
          `}>
            {toast.type === 'error' && <XCircle className="w-5 h-5 md:w-8 md:h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 md:w-6 md:h-6 text-blue-400 shrink-0" />}
            <span className="text-xs md:text-lg font-black uppercase tracking-wider md:tracking-widest leading-tight drop-shadow-md text-center md:text-left break-words">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 cursor-grab active:cursor-grabbing overflow-hidden">
        <Stage
          ref={stageRef}
          width={windowSize.width}
          height={windowSize.height}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          draggable
          x={viewState.x}
          y={viewState.y}
          scaleX={viewState.scale}
          scaleY={viewState.scale}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {visibleHexes.map(hex => {
              const { x, y } = hexToPixel(hex.q, hex.r, 0);
              
              let isLocked = false;
              if (hex.riftId) {
                  const series = hex.riftId.split('.')[0];
                  if (series === '2' && campaignProgress < 6) isLocked = true;
                  if (series === '3' && campaignProgress < 11) isLocked = true;
                  if (series === '4' && campaignProgress < 19) isLocked = true;
              }

              const NEIGHBOR_OFFSETS = [
                { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 }, 
                { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 }
              ];
              const neighborLevels = new Array(6);
              const neighborPoiIds = new Array(6);
              for(let i=0; i<6; i++) {
                  const d = NEIGHBOR_OFFSETS[i];
                  const nKey = getHexKey(hex.q + d.q, hex.r + d.r);
                  const nHex = grid[nKey];
                  neighborLevels[i] = nHex ? (nHex.height ?? getHexHeight(nHex.terrainType)) : -99;
                  neighborPoiIds[i] = nHex ? nHex.poiId : null;
              }

              return (
                <OverworldHexNode 
                  key={hex.id || getHexKey(hex.q, hex.r)}
                  hex={hex}
                  x={x}
                  y={y}
                  isLocked={isLocked}
                  isPassable={hex.isPassable}
                  neighborLevels={neighborLevels}
                  neighborPoiIds={neighborPoiIds}
                  highlight={showPaths ? (reachableHexes.has(getHexKey(hex.q, hex.r)) ? 'REACHABLE' : 'UNREACHABLE') : 'NONE'}
                  onClick={stableHandleHexClick}
                />
              );
            })}
            
            {/* Player Hero */}
            <Group
              ref={playerNodeRef}
              x={hexToPixel(visualPlayerPos.q, visualPlayerPos.r, 0).x}
              y={hexToPixel(visualPlayerPos.q, visualPlayerPos.r, 0).y + visualPlayerHeight}
            >
              {/* Glow ring — always centered, unaffected by facing flip */}
              <Circle ref={playerGlowRef} radius={18} fill="#3b82f6" opacity={0.4} />

              {/* Hero figure — flips horizontally for facing direction */}
              <Group ref={playerFigureRef} y={0}>
                <Group ref={playerBodyRef}>
                  {/* Ground shadow */}
                  <Ellipse radiusX={10} radiusY={6} fill="rgba(0,0,0,0.4)" y={0} listening={false} />

                  {/* The Cached Sprite */}
                  <KonvaImage 
                      image={spriteImage} 
                      width={64} 
                      height={64} 
                      offsetX={32} // Center X
                      offsetY={48} // Pivot near feet (match UnitRenderer logic)
                      listening={false}
                  />
                </Group>
              </Group>
            </Group>
          </Layer>
        </Stage>
      </div>

      {/* Center Camera Button (Now Toggle Paths) */}
      <button 
        onClick={togglePaths}
        className={`absolute bottom-28 right-4 md:bottom-32 md:right-6 pointer-events-auto p-3 md:p-4 rounded-full border shadow-lg transition-all ${
          showPaths 
            ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        title={language === 'RU' ? 'Показать пути' : 'Show Paths'}
      >
        <Target className={`w-5 h-5 md:w-6 md:h-6 ${showPaths ? 'animate-pulse' : ''}`} />
      </button>

      {/* New Adventure Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-slate-900 border border-amber-900/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-900/20 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
              <RotateCcw className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-black text-white uppercase mb-2">{t.HUD.BTN_RETRY}?</h3>
            <p className="text-xs text-slate-400 mb-6">
              {language === 'RU' ? 'Начать новое приключение? Текущий прогресс будет потерян.' : 'Start a new adventure? Current progress will be lost.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowResetConfirm(false); playUiSound('CLICK'); }} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs transition-colors">{language === 'RU' ? 'Отмена' : 'Cancel'}</button>
              <button onClick={() => { setShowResetConfirm(false); initOverworld(true); playUiSound('CLICK'); }} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-xs transition-colors shadow-lg shadow-amber-900/20">{language === 'RU' ? 'Подтвердить' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal Overlay */}
      <EventModal />

      {/* Inventory Modal */}
      <InventoryModal isOpen={showInventory} onClose={() => setShowInventory(false)} />

      {/* Common Dialogs (Codex, Rankings, etc) */}
      <GameDialogs 
        activeModal={activeModal}
        closeModal={() => setActiveModal(null)}
        helpTopic={helpTopic}
        closeHelp={() => setHelpTopic(null)}
        inspectedItem={inspectedItem}
        closeInspect={() => setInspectedItem(null)}
        victoryStage={victoryStage}
        setVictoryStage={setVictoryStage}
      />
    </div>
  );
};

export default OverworldView;
