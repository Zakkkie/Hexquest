import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import { THEME_PALETTE } from './MapRenderer.tsx';
import StoryBoardPixi from './StoryBoardPixi.tsx';
import { UpgradesTree } from './UpgradesTree.tsx';
import { ArrowLeft, Settings, Volume2, VolumeX, Music, Languages, HelpCircle, Info, ChevronLeft, ChevronRight, X, Trophy, RefreshCw, Map, AlertTriangle, Hexagon, Terminal, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


import { FIGURES_COLLECTION } from './StoryBuilderData.ts';
import { textureService } from '../services/textureService.ts';
import { getPixiTexture, getHeightOffset } from '../services/pixiHexRender.ts';






import { StoryTutorial } from './hud/StoryTutorial.tsx';
import { LevelExitDialog } from './hud/LevelExitDialog.tsx';

const drawInventoryHex = (lvl: number, theme: any) => {
    return (
        <svg viewBox="0 0 40 46" className="w-10 h-11 drop-shadow-[0_2.5px_5px_rgba(0,0,0,0.65)] select-none pointer-events-none transition-all duration-300">
            {/* 3D Bottom/Side extrusion */}
            <polygon points="20,0 38,10 38,36 20,46 2,36 2,10" fill={theme.dark} />
            {/* Top plate */}
            <polygon points="20,0 38,10 38,30 20,40 2,30 2,10" fill={theme.main} stroke={theme.stroke} strokeWidth="2.5" />
            
            {/* Soft top bevel line */}
            <polyline points="2,10 20,20 38,10" stroke="rgba(255,255,255,0.35)" strokeWidth="1" fill="none" />
            
            <text 
                x="20" 
                y="19" 
                textAnchor="middle" 
                fill={theme.light || '#ffffff'} 
                stroke="#000000"
                strokeWidth="1.5"
                paintOrder="stroke"
                className="text-[22px] font-[900] tracking-tight font-sans"
                dominantBaseline="central"
                style={{ filter: "drop-shadow(0px 1px 1.5px rgba(0,0,0,0.85))" }}
            >
                {lvl}
            </text>
        </svg>
    );
};

const TexturePreview: React.FC<{ level: number }> = ({ level }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = '';
        try {
            const canvas = textureService.getTexture(level, 0, 0, undefined);
            const clone = document.createElement('canvas');
            clone.width = canvas.width;
            clone.height = canvas.height;
            const ctx = clone.getContext('2d');
            if (ctx) {
                ctx.drawImage(canvas, 0, 0);
            }
            clone.className = "w-full h-full object-contain";
            containerRef.current.appendChild(clone);
        } catch (e) {
            console.error(e);
        }
    }, [level]);

    return <div ref={containerRef} className="w-6 h-6 rounded bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center pointer-events-none select-none" />;
};

const StoryBuilderView: React.FC = () => {
    const setUIState = useGameStore(state => state.setUIState);
    const playUiSound = useGameStore(state => state.playUiSound);
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

    const [exitTargetState, setExitTargetState] = useState<'MENU' | 'CAMPAIGN_MAP' | null>(null);
    const minedInSessionHexes = useGameStore(state => state.minedInSessionHexes);
    const collectedHexes = useGameStore(state => state.collectedHexes);
    const storyMap = useGameStore(state => state.storyMap);
    const placeStoryHex = useGameStore(state => state.placeStoryHex);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);
    const clearStoryMap = useGameStore(state => state.clearStoryMap);
    const startDefenseSiege = useGameStore(state => state.startDefenseSiege);
    const consumeStoryHexes = useGameStore(state => state.consumeStoryHexes);
    const transmuteHexes = useGameStore(state => state.transmuteHexes);
    const skillPoints = useGameStore(state => state.skillPoints);
    const setSkillPoints = useGameStore(state => state.setSkillPoints);
    const language = useGameStore(state => state.language);
    const setLanguage = useGameStore(state => state.setLanguage);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleSfx = useGameStore(state => state.toggleSfx);
    const contrastHighlighting = useGameStore(state => state.campaignUpgrades?.contrastHighlighting || 0);
    const claimedLevelRewards = useGameStore(state => state.claimedLevelRewards) || [];

    const totalInventoryTiles = useMemo(() => {
        let sum = 0;
        for (let lvl = 0; lvl <= 9; lvl++) {
            const sessionQty = (minedInSessionHexes as any)[lvl] || (minedInSessionHexes as any)[String(lvl)] || 0;
            const permaQty = (collectedHexes as any)[lvl] || (collectedHexes as any)[String(lvl)] || 0;
            sum += sessionQty + permaQty;
        }
        return sum;
    }, [minedInSessionHexes, collectedHexes]);

    // Active unlocked state index
    const [unlockedFigureIndex, setUnlockedFigureIndex] = useState(() => {
        try {
            return Number(localStorage.getItem('hexopol_figure_index') || '0');
        } catch {
            return 0;
        }
    });

    const isSiegeActive = useMemo(() => {
        const completedNormalCount = claimedLevelRewards.filter(id => !id.startsWith('siege_completed_')).length;
        return completedNormalCount > 0 && 
               completedNormalCount % 5 === 0 && 
               !claimedLevelRewards.includes(`siege_completed_${completedNormalCount}`);
    }, [claimedLevelRewards]);

    useEffect(() => {
        if (isSiegeActive) {
            setIsNarrativeCollapsed(true);
        }
    }, [isSiegeActive]);

    const activeFigure = useMemo(() => {
        return FIGURES_COLLECTION[unlockedFigureIndex] || FIGURES_COLLECTION[0];
    }, [unlockedFigureIndex]);



    const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    // We get initial values from the global store, which decouples them from state updates
    const initialStoreCamera = useGameStore.getState().cameraPos;
    const initialStoreZoom = useGameStore.getState().zoomScale;

    const cameraPosRef = useRef(initialStoreCamera);
    const zoomScaleRef = useRef(initialStoreZoom);

    // Holds the latest updateTooltipPos so stable callbacks can call it without deps churn.
    const updateTooltipPosRef = useRef<(() => void) | null>(null);

    // Reactive camera (store-driven) so the Pixi board reflects reset/resize updates.
    const storeCameraPos = useGameStore(state => state.cameraPos);
    const storeZoomScale = useGameStore(state => state.zoomScale);
    const pixiCamera = useMemo(
        () => ({ x: storeCameraPos.x, y: storeCameraPos.y, scale: storeZoomScale }),
        [storeCameraPos, storeZoomScale]
    );

    const storeUpdateTimeoutRef = useRef<any>(null);

    // Camera changes coming back from the Pixi board (wheel / pinch / drag pan).
    const handlePixiCameraChange = useCallback((cam: { x: number; y: number; scale: number }) => {
        cameraPosRef.current = { x: cam.x, y: cam.y };
        zoomScaleRef.current = cam.scale;
        updateTooltipPosRef.current?.();

        // Debounce Zustand store updates to avoid triggering massive parent re-renders during active interaction
        if (storeUpdateTimeoutRef.current) {
            clearTimeout(storeUpdateTimeoutRef.current);
        }
        storeUpdateTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current) {
                useGameStore.getState().setCameraPos({ x: cam.x, y: cam.y });
                useGameStore.getState().setZoomScale(cam.scale);
            }
        }, 150);
    }, []);

    const destroyTooltipRef = useRef<HTMLDivElement>(null);

    const [isNarrativeCollapsed, setIsNarrativeCollapsed] = useState(true); // Optimized space by defaulting to true
    const [panelZOrder, setPanelZOrder] = useState<('tablet' | 'terminal' | 'settings')[]>(['tablet', 'terminal', 'settings']);

    const bringToFront = useCallback((panel: 'tablet' | 'terminal' | 'settings') => {
        setPanelZOrder(prev => {
            const filtered = prev.filter(p => p !== panel);
            return [...filtered, panel];
        });
    }, []);

    const toggleTablet = useCallback(() => {
        setIsNarrativeCollapsed(prev => {
            const next = !prev;
            if (!next) {
                bringToFront('tablet');
            }
            return next;
        });
    }, [bringToFront]);

    const toggleSettings = useCallback(() => {
        setIsSettingsOpen(prev => {
            const next = !prev;
            if (next) {
                bringToFront('settings');
            }
            return next;
        });
    }, [bringToFront]);

    const openTerminal = useCallback(() => {
        setIsTerminalLogExpanded(true);
        bringToFront('terminal');
    }, [bringToFront]);
    
    useEffect(() => {
        (window as any).setStoryNarrativeCollapsed = (val: boolean) => {
            setIsNarrativeCollapsed(val);
            if (!val) {
                bringToFront('tablet');
            }
        };
        return () => {
            delete (window as any).setStoryNarrativeCollapsed;
        };
    }, [bringToFront]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const showShapeHint = false;
    const [tabletTab, setTabletTab] = useState<'blueprint' | 'diagnostics' | 'rules'>('blueprint');
    const isUiHidden = false;
    const [lastPlacedKey, setLastPlacedKey] = useState<string | null>(null);
    const [showUpgrades, setShowUpgrades] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [popupCell, setPopupCell] = useState<{ q: number, r: number } | null>(null);
    const [selectedBuildLevel, setSelectedBuildLevel] = useState<number>(0); // 0-9 for building higher levels, or -999 for demolish/снос
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // Visual feedback warning toast
    const [destroyButtonCell, setDestroyButtonCell] = useState<{ q: number, r: number } | null>(null);
    const [failedClickCoord, setFailedClickCoord] = useState<{ q: number, r: number } | null>(null);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    // CENTRALIZED HIGH-TECH NOTIFICATION LOGS
    const [isTerminalLogExpanded, setIsTerminalLogExpanded] = useState(false);
    const [systemLogs, setSystemLogs] = useState<{ id: string; textRU: string; textEN: string; time: string; type: 'info' | 'success' | 'warning' }[]>([
        {
            id: 'init',
            textRU: 'Операционная связь установлена. Сектор стабилен.',
            textEN: 'Operations link established. Sector telemetry stable.',
            time: new Date().toLocaleTimeString().substring(0, 8),
            type: 'success'
        }
    ]);

    const addSystemLog = useCallback((textRU: string, textEN: string, type: 'info' | 'success' | 'warning' = 'info') => {
        setSystemLogs(prev => [
            {
                id: Math.random().toString(36).substring(2, 9),
                textRU,
                textEN,
                time: new Date().toLocaleTimeString().substring(0, 8),
                type
            },
            ...prev
        ].slice(0, 50));
    }, []);

    const [diagnosticsRun, setDiagnosticsRun] = useState<{
        status: 'IDLE' | 'SUCCESS' | 'FAILED';
        results: {
            level: number;
            canvasOk: boolean;
            pixiOk: boolean;
            width: number;
            height: number;
            errorMsg?: string;
            elapsedMs: number;
        }[];
        totalElapsedMs: number;
    } | null>(null);

    const verifyPixiTextures = useCallback(() => {
        const results = [];
        const testLevels = [-3, -2, -1, 0, 1, 2, 3];
        
        for (const lvl of testLevels) {
            const startTime = performance.now();
            try {
                const canvas = textureService.getTexture(lvl, 0, 0, undefined);
                const canvasOk = !!canvas && canvas instanceof HTMLCanvasElement;
                
                const pixiTex = getPixiTexture(canvas);
                const pixiOk = !!pixiTex && pixiTex.width > 0 && pixiTex.height > 0;
                
                results.push({
                    level: lvl,
                    canvasOk,
                    pixiOk,
                    width: pixiTex?.width ?? 0,
                    height: pixiTex?.height ?? 0,
                    elapsedMs: Number((performance.now() - startTime).toFixed(2))
                });
            } catch (err: any) {
                results.push({
                    level: lvl,
                    canvasOk: false,
                    pixiOk: false,
                    width: 0,
                    height: 0,
                    errorMsg: err?.message || String(err),
                    elapsedMs: Number((performance.now() - startTime).toFixed(2))
                });
            }
        }
        return results;
    }, []);

    const updateTooltipPos = useCallback(() => {
        if (!destroyTooltipRef.current || !destroyButtonCell) return;
        const { q, r } = destroyButtonCell;
        const px = hexToPixel(q, r);
        const lvl = storyMap[getHexKey(q, r)] || 0;
        const heightVal = 10 + lvl * 10;
        const topFaceY = px.y - heightVal;
        
        const camX = cameraPosRef.current.x;
        const camY = cameraPosRef.current.y;
        const scale = zoomScaleRef.current;
        
        const leftPos = camX + px.x * scale;
        const topPos = camY + topFaceY * scale - 46 * scale;
        
        destroyTooltipRef.current.style.left = `${leftPos}px`;
        destroyTooltipRef.current.style.top = `${topPos}px`;
        destroyTooltipRef.current.style.transform = `translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.25, scale))})`;
    }, [destroyButtonCell, storyMap]);

    updateTooltipPosRef.current = updateTooltipPos;

    useEffect(() => {
        updateTooltipPos();
    }, [destroyButtonCell, updateTooltipPos]);

    // Automation & Flare states
    const [spToasts, setSpToasts] = useState<{ id: string; text: string; x: number; y: number; congratsRU?: string; congratsEN?: string; cleanNameRU?: string; cleanNameEN?: string }[]>([]);
    const [flareKeys, setFlareKeys] = useState<Set<string>>(new Set());
    const [isAnimatingCompletion, setIsAnimatingCompletion] = useState(false);

    const isUnmountingRef = useRef(false);
    useEffect(() => {
        isUnmountingRef.current = false;
        return () => {
            isUnmountingRef.current = true;
            if (storeUpdateTimeoutRef.current) {
                clearTimeout(storeUpdateTimeoutRef.current);
            }
        };
    }, []);

    // Tracks error messages and adds them to centralized system logs
    useEffect(() => {
        if (errorMessage) {
            addSystemLog(errorMessage, errorMessage, 'warning');
        }
    }, [errorMessage, addSystemLog]);

    // Auto-collapse expanded windows when user clicks outside them
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target || typeof target.closest !== 'function') return;

            // Check if any of the floating panels are expanded
            const anyExpanded = !isNarrativeCollapsed || isTerminalLogExpanded || isSettingsOpen;
            if (!anyExpanded) return;

            // Check if the click was inside any of the panels or their toggle controls
            const insideTablet = target.closest('#tutorial-blueprint-tablet') || target.closest('#tutorial-blueprint-toggle');
            const insideOpsLink = target.closest('#operations-link-container');
            const insideSettings = target.closest('#settings-container');

            if (!insideTablet && !insideOpsLink && !insideSettings) {
                // Click was outside all expanded panels, collapse them
                if (!isNarrativeCollapsed) setIsNarrativeCollapsed(true);
                if (isTerminalLogExpanded) setIsTerminalLogExpanded(false);
                if (isSettingsOpen) setIsSettingsOpen(false);
            }
        };

        document.addEventListener('click', handleOutsideClick, { capture: true });
        return () => {
            document.removeEventListener('click', handleOutsideClick, { capture: true });
        };
    }, [isNarrativeCollapsed, isTerminalLogExpanded, isSettingsOpen]);

    // Tracks SP changes and logs shape completion
    const prevSpRef = useRef(skillPoints);
    useEffect(() => {
        if (skillPoints > prevSpRef.current) {
            const diff = skillPoints - prevSpRef.current;
            addSystemLog(
                `УСПЕХ: Новая форма успешно синтезирована! Получено +${diff} SP.`,
                `SUCCESS: New blueprint shape synthesized! +${diff} SP awarded.`,
                'success'
            );
        }
        prevSpRef.current = skillPoints;
    }, [skillPoints, addSystemLog]);

    // Dynamic celestial constellation map computation of target blueprint figure
    const constellationData = useMemo(() => {
        if (!activeFigure || !activeFigure.shape || activeFigure.shape.length === 0) return null;
        
        const HEX_STEP_SIZE = 26; // Larger and clearer scale for background blueprint pattern
        const coords = activeFigure.shape.map((pt, idx) => {
            const rawX = HEX_STEP_SIZE * (Math.sqrt(3) * pt.q + (Math.sqrt(3) / 2) * pt.r);
            const rawY = HEX_STEP_SIZE * (1.5 * pt.r) * 0.8;
            return {
                id: idx,
                q: pt.q,
                r: pt.r,
                lvl: pt.lvl ?? 0,
                x: rawX,
                y: rawY
            };
        });

        // Find bounding box limits to center correctly
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        coords.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const centeredCoords = coords.map(pt => ({
            ...pt,
            cx: pt.x - centerX,
            cy: pt.y - centerY
        }));

        // Determine all unique neighbor connecting links (distance = 1)
        const lines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
        for (let i = 0; i < centeredCoords.length; i++) {
            for (let j = i + 1; j < centeredCoords.length; j++) {
                const a = centeredCoords[i];
                const b = centeredCoords[j];
                const dq = a.q - b.q;
                const dr = a.r - b.r;
                const isNeighbor = Math.abs(dq) <= 1 && Math.abs(dr) <= 1 && Math.abs(dq + dr) <= 1;
                if (isNeighbor) {
                    lines.push({
                        id: `${i}-${j}`,
                        x1: a.cx,
                        y1: a.cy,
                        x2: b.cx,
                        y2: b.cy
                    });
                }
            }
        }

        const width = Math.max(maxX - minX + 60, 180);
        const height = Math.max(maxY - minY + 60, 180);

        return {
            points: centeredCoords,
            lines,
            width,
            height
        };
    }, [activeFigure]);
    
    // Auto-dismiss destroyButtonCell when clicking anywhere else on the document
    useEffect(() => {
        if (!destroyButtonCell) return;
        const autoDismiss = () => {
            setDestroyButtonCell(null);
        };
        const timer = setTimeout(() => {
            window.addEventListener('click', autoDismiss);
            window.addEventListener('touchstart', autoDismiss);
        }, 10);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', autoDismiss);
            window.removeEventListener('touchstart', autoDismiss);
        };
    }, [destroyButtonCell]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    const handleResetCamera = useCallback((silent?: boolean) => {
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const h = containerRef.current?.clientHeight || window.innerHeight;
        
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        // 1. Include active figure shape blueprint coordinates
        if (activeFigure && activeFigure.shape && activeFigure.shape.length > 0) {
            activeFigure.shape.forEach(pt => {
                const pixel = hexToPixel(pt.q, pt.r);
                if (pixel.x < minX) minX = pixel.x;
                if (pixel.x > maxX) maxX = pixel.x;
                if (pixel.y < minY) minY = pixel.y;
                if (pixel.y > maxY) maxY = pixel.y;
            });
        }

        // 2. Always include the player's core matrix (0,0) as base player unit anchor
        const corePixel = hexToPixel(0, 0);
        const coreLvl = storyMap['0,0'] ?? 0;
        const coreHeightOffset = getHeightOffset(coreLvl);
        minX = Math.min(minX, corePixel.x);
        maxX = Math.max(maxX, corePixel.x);
        minY = Math.min(minY, corePixel.y + coreHeightOffset);
        maxY = Math.max(maxY, corePixel.y);

        // 3. Find and include all other built high-level structures in storyMap
        let maxLvl = 0;
        Object.entries(storyMap).forEach(([key, lvl]) => {
            if (lvl !== undefined && lvl >= 0) {
                if (lvl > maxLvl) maxLvl = lvl;
                const [qStr, rStr] = key.split(',');
                const q = parseInt(qStr);
                const r = parseInt(rStr);
                if (!isNaN(q) && !isNaN(r)) {
                    const pixel = hexToPixel(q, r);
                    const hOffset = getHeightOffset(lvl);
                    
                    if (pixel.x < minX) minX = pixel.x;
                    if (pixel.x > maxX) maxX = pixel.x;
                    
                    const topY = pixel.y + hOffset;
                    const baseY = pixel.y;
                    if (topY < minY) minY = topY;
                    if (baseY > maxY) maxY = baseY;
                }
            }
        });

        const figureWidth = (maxX - minX > 0) ? (maxX - minX) : 100;
        const figureHeight = (maxY - minY > 0) ? (maxY - minY) : 100;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const isMobile = w < 768;
        // Base utilization factor (safe screen percentage to center components and prevent clipping)
        let utilization = 0.80;
        
        if (isMobile) {
            // Give extra margin on mobile by default
            utilization = 0.70;
            // If the player builds high-level structures (level >= 3), zoom out further so they remain visible
            if (maxLvl >= 3) {
                utilization = Math.max(0.48, 0.70 - (maxLvl - 2) * 0.05);
            }
        } else {
            if (maxLvl >= 3) {
                utilization = Math.max(0.60, 0.80 - (maxLvl - 2) * 0.03);
            }
        }

        // "охватывать не менее 100% фигуры" means 100% of the figure should be fully visible and centered.
        const scaleX = (w * utilization) / figureWidth;
        const scaleY = (h * utilization) / figureHeight;
        let targetZoom = Math.min(scaleX, scaleY);
        // Clamp to a reasonable range (minimum 0.15 to support fitting high structures even on very narrow/portrait mobile viewports)
        targetZoom = Math.max(0.15, Math.min(2.5, targetZoom));

        // Adjust centerY offset on mobile to comfortably lift high towers into clear viewport space
        const vOffset = isMobile ? h * 0.03 : 0;
        const targetPos = { 
            x: w / 2 - centerX * targetZoom, 
            y: (h / 2 + vOffset) - centerY * targetZoom 
        };

        cameraPosRef.current = targetPos;
        zoomScaleRef.current = targetZoom;

        // Camera state is now applied by StoryBoardPixi via the store-driven `camera` prop.
        updateTooltipPos();
        useGameStore.getState().setCameraPos(targetPos);
        useGameStore.getState().setZoomScale(targetZoom);
        if (!silent) {
            playUiSound('CLICK');
        }
    }, [activeFigure, storyMap, playUiSound, updateTooltipPos]);

    const handleResetCameraRef = useRef(handleResetCamera);
    useEffect(() => {
        handleResetCameraRef.current = handleResetCamera;
    }, [handleResetCamera]);

    // Automatically fit camera to the shape on mount and when active figure changes
    useEffect(() => {
        const timer = setTimeout(() => {
            handleResetCameraRef.current(true);
        }, 100);
        return () => clearTimeout(timer);
    }, [activeFigure]);

    const handleScrollLeft = useCallback(() => {
        if (totalInventoryTiles === 0) {
            playUiSound('ERROR');
            return;
        }
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -140, behavior: 'smooth' });
            playUiSound('CLICK');
        }
    }, [playUiSound, totalInventoryTiles]);

    const handleScrollRight = useCallback(() => {
        if (totalInventoryTiles === 0) {
            playUiSound('ERROR');
            return;
        }
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 140, behavior: 'smooth' });
            playUiSound('CLICK');
        }
    }, [playUiSound, totalInventoryTiles]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            // Fallback
            const handleResize = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                setStageSize({ width: w, height: h });
                setTimeout(() => {
                    handleResetCameraRef.current(true);
                }, 10);
            };
            window.addEventListener('resize', handleResize);
            handleResize();
            return () => window.removeEventListener('resize', handleResize);
        }

        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            const w = Math.max(100, Math.floor(width));
            const h = Math.max(100, Math.floor(height));
            setStageSize({ width: w, height: h });
            setTimeout(() => {
                handleResetCameraRef.current(true);
            }, 10);
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Shape completeness check - checks if the placed level 0 or higher hexes match the active figure's coordinates
    // under any translation offset (allows random placement anywhere on the board!)
    const completedHexKeys = useMemo(() => {
        // Disabled shape matching in Sandbox. Shape building is handled in levels.
        return new Set<string>();
    }, []);

    const targetCompleted = false;

    // Automatic Shape Assembly Completion & Neon Highlight Flare Effect
    useEffect(() => {
        let toastTimeout: any = null;
        let consumeTimeout: any = null;
        let keysToFlare: Set<string> | null = null;

        if (targetCompleted && !isAnimatingCompletion) {
            setIsAnimatingCompletion(true);
            keysToFlare = new Set(completedHexKeys);
            setFlareKeys(keysToFlare);
            
            // Play success sound
            playUiSound('SUCCESS');
            
            // Calculate center coordinate of completed shape for floating notification position
            let sumX = 0;
            let sumY = 0;
            let count = 0;
            keysToFlare.forEach(key => {
                const [q, r] = key.split(',').map(Number);
                const px = hexToPixel(q, r);
                const lvl = storyMap[key] || 0;
                const heightVal = 10 + lvl * 10;
                sumX += px.x;
                sumY += px.y - heightVal;
                count++;
            });

            const avgX = count > 0 ? (sumX / count) : 0;
            const avgY = count > 0 ? (sumY / count) : 0;

            // Project 2D game world coordinates to screen coordinate space
            const screenX = cameraPosRef.current.x + avgX * zoomScaleRef.current;
            const screenY = cameraPosRef.current.y + avgY * zoomScaleRef.current;

            // Spawn SP floating toast notification at target screen location
            const toastId = Math.random().toString(36).substring(2, 9);
            const toastText = language === 'RU' ? '+1 Очко Симуляции (SP)' : '+1 Simulation Point (SP)';
            setSpToasts(prev => [...prev, { 
                id: toastId, 
                text: toastText, 
                x: screenX, 
                y: screenY,
                congratsRU: activeFigure?.congratsRU,
                congratsEN: activeFigure?.congratsEN,
                cleanNameRU: activeFigure?.cleanNameRU,
                cleanNameEN: activeFigure?.cleanNameEN
            }]);
            toastTimeout = setTimeout(() => {
                setSpToasts(prev => prev.filter(t => t.id !== toastId));
            }, 3000);
            
            // Grant 1 SP to the gameplay store
            setSkillPoints(skillPoints + 1);
            
            // Auto advance next challenge
            const nextIndex = unlockedFigureIndex + 1;
            if (nextIndex < FIGURES_COLLECTION.length) {
                setUnlockedFigureIndex(nextIndex);
                try {
                    localStorage.setItem('hexopol_figure_index', String(nextIndex));
                } catch (e) {
                    console.warn(e);
                }
            } else {
                setUnlockedFigureIndex(0);
                try {
                    localStorage.setItem('hexopol_figure_index', '0');
                } catch { /* empty */ }
            }
            
            setPopupCell(null);
            
            // Consume hexes logically immediately, but keep visually flaring, wait, no.
            // Consume after flare fadeout.
            consumeTimeout = setTimeout(() => {
                if (keysToFlare) {
                    consumeStoryHexes(Array.from(keysToFlare));
                }
                setIsAnimatingCompletion(false);
                setFlareKeys(new Set());
                consumeTimeout = null;
            }, 1600);
        }

        return () => {
            if (toastTimeout) clearTimeout(toastTimeout);
            if (isUnmountingRef.current) {
                if (consumeTimeout) {
                    clearTimeout(consumeTimeout);
                    if (keysToFlare) {
                        consumeStoryHexes(Array.from(keysToFlare));
                    }
                }
            }
        };
    }, [targetCompleted, completedHexKeys, unlockedFigureIndex, skillPoints, language, playUiSound, setSkillPoints, storyMap, isAnimatingCompletion, consumeStoryHexes]);

    const hasAnyHex = useMemo(() => {
        return Object.values(storyMap).some(lvl => lvl !== undefined && lvl >= 0);
    }, [storyMap]);

    const startCenterPoint = useMemo(() => {
        if (storyMap['0,0'] !== -999) {
            return { q: 0, r: 0 };
        }
        let bestQ = 0;
        let bestR = 0;
        let bestDist = 999;
        const RADIUS = 24;
        for (let q = -RADIUS; q <= RADIUS; q++) {
            for (let r = -RADIUS; r <= RADIUS; r++) {
                if (Math.abs(q + r) <= RADIUS) {
                    const key = `${q},${r}`;
                    if (storyMap[key] !== -999) {
                        const dist = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestQ = q;
                            bestR = r;
                        }
                    }
                }
            }
        }
        return { q: bestQ, r: bestR };
    }, [storyMap]);

    const autoTutorialTriggeredRef = useRef<boolean>(false);

    useEffect(() => {
        const hasSeenTutorial = sessionStorage.getItem('story_tutorial_seen') === 'true';
        if (!hasAnyHex && unlockedFigureIndex <= 3 && !hasSeenTutorial) {
            if (!autoTutorialTriggeredRef.current) {
                const timer = setTimeout(() => {
                    if ((window as any).startStoryTutorial) {
                        (window as any).startStoryTutorial();
                        autoTutorialTriggeredRef.current = true;
                        sessionStorage.setItem('story_tutorial_seen', 'true');
                    }
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [hasAnyHex, unlockedFigureIndex]);

    // Direct placement eligibility calculation
    const isEligibleForPlacement = useCallback((q: number, r: number, forceLevel?: number) => {
        const lvlToBuild = forceLevel !== undefined ? forceLevel : selectedBuildLevel;
        const currentMap = storyMap;
        if (lvlToBuild === -999) return false; // Demolish is not a placement

        const currentLvl = currentMap[getHexKey(q, r)];
        if (currentLvl === -999) return false; // Void tile cannot be built upon!

        const currentlyBuilt = currentLvl !== undefined && currentLvl >= 0;

        if (!currentlyBuilt) {
            if (lvlToBuild !== 0) return false;
        }

        if (!hasAnyHex) {
            if (q === startCenterPoint.q && r === startCenterPoint.r) {
                return lvlToBuild === 0;
            }
            return false;
        }

        if (currentlyBuilt) {
            if (lvlToBuild <= currentLvl) return false;
            // Upgrade rule from battle: must upgrade step-by-step
            if (lvlToBuild !== currentLvl + 1) return false;
        }
        
        const neighbors = [
            { dq: 1, dr: -1 }, { dq: 1, dr: 0 }, { dq: 0, dr: 1 },
            { dq: -1, dr: 1 }, { dq: -1, dr: 0 }, { dq: 0, dr: -1 }
        ];

        let hasValidNeighbor = false;
        const neighborLevels: number[] = [];

        for (const n of neighbors) {
            const nLvl = currentMap[getHexKey(q + n.dq, r + n.dr)];
            
            if (nLvl !== undefined && nLvl >= 0) {
                hasValidNeighbor = true;
                neighborLevels.push(nLvl);
            }
        }

        if (!currentlyBuilt && !hasValidNeighbor) {
            return false;
        }

        // STABILITY CHECK (Strict Equal Level Rule for L1+)
        const currentLevel = currentlyBuilt ? currentLvl : 0;
        if (currentLevel >= 1) {
            // Check if there are at least 5 neighbors strictly higher than currentLevel (Depression rule)
            const higherNeighborsCount = neighborLevels.filter(lvl => lvl > currentLevel).length;
            const isDepressionRule = higherNeighborsCount >= 5;

            if (!isDepressionRule) {
                const supportNeighborsCount = neighborLevels.filter(lvl => lvl === currentLevel).length;
                if (supportNeighborsCount < 2) {
                    return false;
                }
            }
        }

        return true;
    }, [storyMap, selectedBuildLevel, hasAnyHex, startCenterPoint]);

    const gridPoints = useMemo(() => {
        const points = [];
        const RADIUS = 24;
        for (let q = -RADIUS; q <= RADIUS; q++) {
            for (let r = -RADIUS; r <= RADIUS; r++) {
                if (Math.abs(q + r) <= RADIUS) {
                    const px = hexToPixel(q, r);
                    points.push({ q, r, x: px.x, y: px.y });
                }
            }
        }

        return points.sort((a, b) => {
            const depthA = (a.y * 10) + (a.x * 0.1);
            const depthB = (b.y * 10) + (b.x * 0.1);
            return depthA - depthB;
        });
    }, []);

    // Build a lookup object from the active figure shape to avoid O(n) find() per cell per render
    const blueprintShapeMap = useMemo(() => {
        // Empty in sandbox mode so no violet blueprint outlines are shown. Shape building is in levels.
        return { /* empty */ } as Record<string, number>;
    }, []);

    // Count available blocks for the current build level (stable scalar, computed once per render)
    const currentLevelAvailableCount = useMemo(() => {
        return (minedInSessionHexes[selectedBuildLevel] || (minedInSessionHexes as any)[String(selectedBuildLevel)] || 0) +
               (collectedHexes[selectedBuildLevel] || (collectedHexes as any)[String(selectedBuildLevel)] || 0);
    }, [minedInSessionHexes, collectedHexes, selectedBuildLevel]);

    // Stable per-cell data: recomputes only when storyMap / figure / build-level / inventory change.
    // Does NOT recompute when popupCell, lastPlacedKey, flareKeys, failedClickCoord, errorMessage,
    // spToasts, tabletTab, isSettingsOpen, etc. change — those are the frequent UI-only state changes
    // that previously forced 469 × 6-neighbour eligibility re-evaluations per render.
    const cellDataList = useMemo(() => {
        const isDemolishMode = selectedBuildLevel === -999;
        const avail = isDemolishMode ? 0 : currentLevelAvailableCount;
        return gridPoints.map(coord => {
            const key = getHexKey(coord.q, coord.r);
            const lvl = storyMap[key];
            const blueprintLvlVal = blueprintShapeMap[key];
            const isBlueprint = blueprintLvlVal !== undefined && (lvl === undefined || (lvl >= 0 && lvl < blueprintLvlVal));
            const blueprintLevel = blueprintLvlVal !== undefined ? blueprintLvlVal : 0;
            const isEligible = isEligibleForPlacement(coord.q, coord.r);
            const isCenterInitially = coord.q === startCenterPoint.q && coord.r === startCenterPoint.r && !hasAnyHex && lvl !== -999;
            const canPlaceHex = isDemolishMode ? (lvl !== undefined && lvl >= 0) : (isEligible && avail > 0);
            const isCore = coord.q === 0 && coord.r === 0;
            return { key, q: coord.q, r: coord.r, lvl, isBlueprint, blueprintLevel, isEligible, isCenterInitially, canPlaceHex, isCore };
        });
    }, [gridPoints, storyMap, blueprintShapeMap, selectedBuildLevel, currentLevelAvailableCount,
        isEligibleForPlacement, startCenterPoint, hasAnyHex]);

    // Memoize the set of levels that have at least one valid slot on the map
    const placeableLevels = useMemo(() => {
        const placeable = new Set<number>();
        for (let lvl = 0; lvl <= 9; lvl++) {
            const hasSlot = gridPoints.some(gp => isEligibleForPlacement(gp.q, gp.r, lvl));
            if (hasSlot) {
                placeable.add(lvl);
            }
        }
        return placeable;
    }, [storyMap, isEligibleForPlacement, gridPoints]);

    const isPanning = useRef(false);

    const handleCellClick = useCallback((q: number, r: number) => {
        if (isPanning.current) return;
        
        if (isSiegeActive) {
            playUiSound('ERROR');
            const alertMsg = language === 'RU'
                ? "⚠️ Защита ядра активна! Строительство запрещено до ее завершения."
                : "⚠️ Core Defense is active! Construction is blocked until complete.";
            setErrorMessage(alertMsg);
            useGameStore.getState().showToast(alertMsg, 'error');
            setTimeout(() => {
                setErrorMessage(curr => curr === alertMsg ? null : curr);
            }, 5000);
            return;
        }
        
        const map = storyMap;
        const buildLevel = selectedBuildLevel;
        const key = getHexKey(q, r);
        const currentLvl = map[key];
        if (currentLvl === -999) {
            playUiSound('ERROR');
            return;
        }
        const isCurrentlyBuilt = currentLvl !== undefined && currentLvl >= 0;

        const eligible = isEligibleForPlacement(q, r);
        
        if (isCurrentlyBuilt) {
            if (q === 0 && r === 0 && (buildLevel === -999 || (currentLvl === buildLevel && buildLevel !== -999))) {
                playUiSound('ERROR');
                setErrorMessage(language === 'RU' ? 'Главное ядро (0,0) неуязвимо и не может быть удалено!' : 'The Core Matrix (0,0) is invulnerable and cannot be demolished!');
                setTimeout(() => setErrorMessage(null), 5000);
                return;
            }
            if (currentLvl === buildLevel && buildLevel !== -999) {
                playUiSound('CLICK');
                setDestroyButtonCell(prev => (prev && prev.q === q && prev.r === r) ? null : { q, r });
                return;
            }
            // Dismiss destroy button cell on other cell interactions
            setDestroyButtonCell(null);
            if (eligible && buildLevel !== -999) {
                // If it's an existing tile, and the current selected level is valid for upgrading
                // (It will fall through to execute placement)
            } else {
                if (buildLevel === -999) {
                    // Demolish popup
                    playUiSound('CLICK');
                    setPopupCell({ q, r });
                    return;
                } else {
                    // Trying to place a forbidden upgraded hex (support or height-step violation)
                    playUiSound('ERROR');
                    setFailedClickCoord({ q, r });
                    setTimeout(() => setFailedClickCoord(curr => (curr?.q === q && curr?.r === r) ? null : curr), 1500);

                    const currentLevel = currentLvl;
                    let blockBuildErrorMsg = '';

                    if (buildLevel !== currentLevel + 1) {
                        blockBuildErrorMsg = language === 'RU'
                            ? `Стройте пошагово! Высоту можно повысить только на +1 (нужно поставить Уровень ${currentLevel + 1}).`
                            : `Build step-by-step! Height can only be raised by +1 (you should select Level ${currentLevel + 1}).`;
                    } else {
                        blockBuildErrorMsg = language === 'RU'
                            ? `Неустойчиво! Для высоты Уровня ${buildLevel} нужно 2 соседних блока Уровня ${currentLevel} или выше.`
                            : `Unstable! Level ${buildLevel} height requires at least 2 adjacent neighbor blocks of Level ${currentLevel} or higher.`;
                    }

                    setErrorMessage(blockBuildErrorMsg);
                    setTimeout(() => {
                        setErrorMessage(curr => curr === blockBuildErrorMsg ? null : curr);
                    }, 5000);
                    return;
                }
            }
        } else if (!eligible) {
            setDestroyButtonCell(null);
            playUiSound('ERROR');
            setFailedClickCoord({ q, r });
            setTimeout(() => setFailedClickCoord(curr => (curr?.q === q && curr?.r === r) ? null : curr), 1500);

            let blockBuildErrorMsg = '';
            if (buildLevel !== 0) {
                blockBuildErrorMsg = language === 'RU'
                    ? `На пустом гексе можно построить только базовый Уровень 0!`
                    : `On empty space you can only place a standard Level 0 block first!`;
            } else {
                blockBuildErrorMsg = language === 'RU'
                    ? `Этот гекс недоступен! Ставьте блоки Уровня 0 только рядом со своими существующими блоками.`
                    : `This hex is out of range! Place Level 0 blocks adjacent to your existing blocks.`;
            }

            setErrorMessage(blockBuildErrorMsg);
            setTimeout(() => {
                setErrorMessage(curr => curr === blockBuildErrorMsg ? null : curr);
            }, 5000);
            return;
        }

        // Ensure player has the selected block in inventory
        const availableCount = (minedInSessionHexes[buildLevel] || (minedInSessionHexes as any)[String(buildLevel)] || 0) + (collectedHexes[buildLevel] || (collectedHexes as any)[String(buildLevel)] || 0);
        if (availableCount <= 0) {
            playUiSound('WARNING');
            setFailedClickCoord({ q, r });
            setTimeout(() => setFailedClickCoord(curr => (curr?.q === q && curr?.r === r) ? null : curr), 1500);

            const inventoryErrorMsg = language === 'RU'
                ? `У вас нет блоков Уровня ${buildLevel} в инвентаре! Добудьте их в кампании или режиме раскопок.`
                : `You don't have Level ${buildLevel} blocks in your inventory! Mine them in Campaign or Excavation mode.`;
            
            setErrorMessage(inventoryErrorMsg);
            setTimeout(() => {
                setErrorMessage(curr => curr === inventoryErrorMsg ? null : curr);
            }, 5000);
            return;
        }

        // Place new block!
        placeStoryHex(q, r, buildLevel);
        playUiSound('SUCCESS');
        setLastPlacedKey(key);
        setTimeout(() => setLastPlacedKey(prev => prev === key ? null : prev), 600);
        setErrorMessage(null); // clear any previous warning
    }, [isPanning, isEligibleForPlacement, minedInSessionHexes, collectedHexes, placeStoryHex, addMinedHexes, playUiSound, setErrorMessage, language, setDestroyButtonCell, storyMap, selectedBuildLevel, hasAnyHex]);

    const handleCellDblClick = useCallback((q: number, r: number) => {
        const key = getHexKey(q, r);
        const currentLvl = storyMap[key];
        if (currentLvl === -999) {
            playUiSound('ERROR');
            return;
        }
        const isCurrentlyBuilt = currentLvl !== undefined && currentLvl >= 0;
        
        if (!isCurrentlyBuilt) {
            handleResetCamera();
        }
    }, [storyMap, handleResetCamera]);

    // Pan/zoom (wheel, drag, two-finger pinch) and hover/click hit-testing are now
    // handled inside StoryBoardPixi; camera changes flow back via handlePixiCameraChange.

    // Clear board reset
    const handleClearBoard = () => {
        playUiSound('CLICK');
        setIsSettingsOpen(false);
        setShowClearConfirm(true);
    };

    const confirmClearBoard = () => {
        playUiSound('CLICK');
        clearStoryMap();
        setPopupCell(null);
        setShowClearConfirm(false);
    };

    return (
        <div id="tutorial-hex-board" ref={containerRef} className="absolute inset-0 bg-[#020617] flex flex-col font-sans overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse-nebula {
                    0%, 100% { transform: scale(1) translate(0px, 0px); opacity: 0.18; }
                    50% { transform: scale(1.15) translate(25px, -15px); opacity: 0.38; }
                }
                @keyframes pulse-nebula-slow {
                    0%, 100% { transform: scale(1.1) translate(0px, 0px); opacity: 0.15; }
                    50% { transform: scale(0.95) translate(-35px, 35px); opacity: 0.32; }
                }
                @keyframes flow-matrix {
                    0% { background-position: 0px 0px; }
                    100% { background-position: 40px 80px; }
                }
                .blueprint-grid-glow {
                    background-image: 
                        linear-gradient(rgba(99, 102, 241, 0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99, 102, 241, 0.06) 1px, transparent 1px);
                    background-size: 40px 40px;
                    background-position: center;
                    animation: flow-matrix 140s linear infinite;
                }
                .blueprint-grid-sub {
                    background-image: 
                        linear-gradient(rgba(34, 211, 238, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(34, 211, 238, 0.02) 1px, transparent 1px);
                    background-size: 8px 8px;
                    background-position: center;
                }
                .cosmic-vignette {
                    background: radial-gradient(circle at center, transparent 15%, rgba(2, 6, 23, 0.65) 65%, rgba(1, 4, 16, 0.95) 98%);
                }
                .hud-telemetry {
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 8px;
                    color: rgba(99, 102, 241, 0.4);
                    letter-spacing: 0.15em;
                }
                @keyframes breathe-constellation {
                    0%, 100% {
                        opacity: 0.75;
                        stroke-width: 2.2px;
                    }
                    50% {
                        opacity: 1.0;
                        stroke-width: 3.8px;
                    }
                }
                .constellation-glow-line {
                    animation: breathe-constellation 3.0s ease-in-out infinite;
                    stroke-linejoin: round;
                    stroke-linecap: round;
                }
            `}} />

            {/* DEEP COSMIC PROTOCOL ROOM BACKDROP */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
                {/* 1. Nebula Layer 1 - Violet Glow */}
                <div 
                    className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[140px] mix-blend-screen"
                    style={{ animation: 'pulse-nebula 24s ease-in-out infinite' }}
                />
                {/* 2. Nebula Layer 2 - Cyan Glow */}
                <div 
                    className="absolute -bottom-[15%] -right-[15%] w-[85%] h-[85%] bg-cyan-600/8 rounded-full blur-[160px] mix-blend-screen"
                    style={{ animation: 'pulse-nebula-slow 30s ease-in-out infinite' }}
                />
                
                {/* 3. Holographic drawing grid */}
                <div className="absolute inset-0 blueprint-grid-glow opacity-80" />
                <div className="absolute inset-0 blueprint-grid-sub opacity-50" />
                
                {/* 4. Heavy cinematic vignette to focus on construction area */}
                <div className="absolute inset-0 cosmic-vignette" />

                {/* 5. Minimalist Ambient Decors - Blueprint Area Indicators */}
                <div className="absolute bottom-[32px] left-6 flex flex-col gap-0.5 hud-telemetry opacity-50 select-none hidden md:block">
                    <div>SECTOR: [OMEGA_NEBULA_SIM_v2.0]</div>
                    <div>LATENCY: [0.03ms]</div>
                </div>
                <div className="absolute bottom-[32px] right-6 flex flex-col gap-0.5 hud-telemetry opacity-50 text-right select-none hidden md:block">
                    <div>MAT_LIMIT: [ACTIVE_HARD_CAP]</div>
                    <div>ENGINEERING_ALIGN: [COAXIAL]</div>
                </div>

                {/* 6. Cosmic Constellation Overlay in Starry Celestial Background sky */}
                <AnimatePresence>
                {showShapeHint && constellationData && (() => {
                    const getLevelColor = (lvl: number) => {
                        switch(lvl) {
                            case 0: return '#94a3b8'; // bright silver slate
                            case 1: return '#22d3ee'; // vivid cyan
                            case 2: return '#3b82f6'; // bright blue
                            case 3: return '#a855f7'; // vibrant purple
                            default: return '#fda4af'; // light pink border
                        }
                    };

                    const getLevelBg = (lvl: number) => {
                        switch(lvl) {
                            case 0: return 'rgba(148, 163, 184, 0.12)';
                            case 1: return 'rgba(34, 211, 238, 0.22)';
                            case 2: return 'rgba(59, 130, 246, 0.25)';
                            case 3: return 'rgba(168, 85, 247, 0.28)';
                            default: return 'rgba(253, 164, 175, 0.28)';
                        }
                    };

                    return (
                        <div className="absolute top-[85px] sm:top-[100px] md:top-[120px] left-1/2 -translate-x-1/2 pointer-events-none select-none z-10 flex flex-col items-center">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                            >
                                {/* Constellation Star Map SVG */}
                                <svg 
                                    width={constellationData.width} 
                                    height={constellationData.height} 
                                    viewBox={`${-constellationData.width/2} ${-constellationData.height/2} ${constellationData.width} ${constellationData.height}`}
                                    className="overflow-visible drop-shadow-[0_0_28px_rgba(34,211,238,0.65)] transition-all duration-500"
                                >
                                {/* Hexagon outlines defining each cell of the blueprint shape boundary */}
                                {constellationData.points.map((pt) => {
                                    const hexPoints: string[] = [];
                                    const hexSize = 26; // Matches HEX_STEP_SIZE perfectly for zero spacing/touching hexes
                                    for (let i = 0; i < 6; i++) {
                                        const angle = (60 * i + 30) * Math.PI / 180;
                                        const hx = pt.cx + Math.cos(angle) * hexSize;
                                        const hy = pt.cy + Math.sin(angle) * hexSize * 0.8; // Perspective factor matches center projection
                                        hexPoints.push(`${hx},${hy}`);
                                    }

                                    const clr = getLevelColor(pt.lvl);
                                    const bg = getLevelBg(pt.lvl);

                                    return (
                                        <g key={`hex-boundary-${pt.id}`}>
                                            <polygon
                                                points={hexPoints.join(' ')}
                                                fill={bg}
                                                stroke={clr}
                                                strokeWidth={pt.lvl > 0 ? "3.2" : "2.0"}
                                                className="constellation-glow-line"
                                                style={{
                                                    filter: `drop-shadow(0 0 8px ${clr})`
                                                }}
                                            />
                                            {/* Display the height/level number clearly inside each blueprint cell */}
                                            <text
                                                x={pt.cx}
                                                y={pt.cy + 4}
                                                textAnchor="middle"
                                                fontSize="12.5px"
                                                fontWeight="900"
                                                fill={pt.lvl > 0 ? "#ffffff" : "rgba(255,255,255,0.55)"}
                                                fontFamily="monospace"
                                                className="select-none pointer-events-none"
                                                style={{
                                                    textShadow: `0 0 8px ${clr}`
                                                }}
                                            >
                                                {pt.lvl}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                            </motion.div>
                        </div>
                    );
                })()}
                </AnimatePresence>
            </div>

            {/* FLOATING +1 SP NOTIFICATIONS CONTAINER FLOATING OVER THE COMPLETED SHAPE */}
            <div className="absolute inset-0 pointer-events-none z-[100] select-none overflow-hidden">
                <AnimatePresence>
                    {spToasts.map((toast) => (
                        <div
                            key={toast.id}
                            style={{ 
                                left: toast.x, 
                                top: toast.y, 
                                position: 'absolute', 
                                transform: 'translate(-50%, -50%)',
                            }}
                            className="pointer-events-none select-none z-[100]"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 30 }}
                                animate={{ opacity: [0, 1, 1, 0.9, 0], scale: [0.7, 1.25, 1.25, 1.0, 0.5], y: -120 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2.2, ease: "easeOut" }}
                                className="pointer-events-none text-center flex flex-col items-center select-none w-max shrink-0"
                            >
                                <span 
                                    className="block text-[14px] md:text-base font-black tracking-widest text-[#22d3ee] uppercase select-none leading-none mb-1 text-center"
                                    style={{
                                        textShadow: '0 0 10px rgba(34, 211, 238, 0.95), 0 0 20px rgba(34, 211, 238, 0.5)'
                                    }}
                                >
                                    {language === 'RU' 
                                        ? `${toast.cleanNameRU?.toUpperCase() || 'ФИГУРА'} СОБРАН${!toast.cleanNameRU ? 'А' : ''}!` 
                                        : `${toast.cleanNameEN?.toUpperCase() || 'SHAPE'} COMPLETED!`}
                                </span>
                                <span 
                                    className="block text-2xl md:text-4xl font-black text-white tracking-widest select-none leading-none text-center"
                                    style={{
                                        textShadow: '0 0 12px rgba(255, 255, 255, 1.0), 0 0 25px rgba(34, 211, 238, 0.8)'
                                    }}
                                >
                                    +1 SP
                                </span>
                            </motion.div>
                        </div>
                    ))}
                </AnimatePresence>
            </div>

            {/* CANVAS */}
            <div
                className="absolute inset-0 z-0"
            >
                <StoryBoardPixi
                    cells={cellDataList}
                    camera={pixiCamera}
                    dimensions={stageSize}
                    transient={{
                        popupKey: popupCell ? getHexKey(popupCell.q, popupCell.r) : null,
                        flareKeys,
                        lastPlacedKey,
                        failedClickKey: failedClickCoord ? getHexKey(failedClickCoord.q, failedClickCoord.r) : null,
                        hoveredKey,
                    }}
                    contrastHighlighting={contrastHighlighting}
                    figureIndex={unlockedFigureIndex}
                    onCellClick={handleCellClick}
                    onCellDblClick={handleCellDblClick}
                    onHover={setHoveredKey}
                    onCameraChange={handlePixiCameraChange}
                    onBackgroundClick={() => setDestroyButtonCell(null)}
                />
            </div>
            
            {/* TOP HEADER STATUS MENU BAR (ABOVE ALL OTHER WINDOWS) */}
            <div 
                className="absolute top-0 left-0 right-0 p-4 md:p-8 pointer-events-none"
                style={{ zIndex: isSettingsOpen ? 100 + panelZOrder.indexOf('settings') * 10 : 9999 }}
            >
                <motion.div 
                    animate={{ y: isUiHidden ? -100 : 0, opacity: isUiHidden ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center w-full pointer-events-auto h-14 relative z-[9999]"
                >
                    <div className="flex items-center gap-2 h-full">
                        <button 
                            onClick={() => { playUiSound('CLICK'); setExitTargetState('MENU'); setIsExitDialogOpen(true); }}
                            className="flex items-center justify-center w-10 h-10 bg-slate-900/90 border border-slate-800 rounded-xl hover:bg-slate-800/90 hover:border-indigo-500/30 text-slate-400 hover:text-white transition-all duration-250 shadow-md backdrop-blur-md cursor-pointer active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" /> 
                        </button>
                    </div>

                    {/* STATIC TITLE FOR SANDBOX WORKSPACE (SWAPS TO PULSING LAUNCH SIEGE BUTTON IF EVENT IS ACTIVE) */}
                    <div className="flex-1 mx-2 flex items-center justify-center text-center">
                        {(() => {
                            if (isSiegeActive) {
                                return (
                                    <motion.button
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ 
                                            scale: [1, 1.05, 1],
                                            opacity: 1
                                        }}
                                        transition={{ 
                                            scale: {
                                                repeat: Infinity,
                                                duration: 1.5,
                                                ease: "easeInOut"
                                            },
                                            opacity: { duration: 0.3 }
                                        }}
                                        onClick={() => { playUiSound('CLICK'); startDefenseSiege(); }}
                                        className="h-10 px-6 sm:px-10 bg-gradient-to-r from-red-650 via-rose-700 to-red-650 text-white font-black uppercase text-[10px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.25em] rounded-xl border-2 border-red-500 hover:border-white shadow-[0_0_25px_rgba(239,68,68,0.7)] flex items-center gap-2 cursor-pointer transition-all active:scale-95 select-none"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
                                        <span>{language === 'RU' ? '💥 НАЧАТЬ ЗАЩИТУ ЯДРА! 💥' : '💥 LAUNCH CORE DEFENSE! 💥'}</span>
                                    </motion.button>
                                );
                            } else {
                                return (
                                    <button
                                        id="tutorial-blueprint-toggle"
                                        onClick={() => { playUiSound('CLICK'); toggleTablet(); }}
                                        className="flex flex-col justify-center text-center px-4 py-1 rounded-full bg-slate-900/40 hover:bg-indigo-950/20 border border-indigo-500/10 hover:border-indigo-400/30 cursor-pointer transition-all duration-200 active:scale-95 select-none"
                                    >
                                        <span className="text-[8px] font-mono tracking-[0.2em] text-indigo-400 font-black uppercase leading-none">
                                            {language === 'RU' ? 'ПОЛИГОН НЕБЬЮЛА' : 'NEBULA PROVING GROUND'}
                                        </span>
                                        <span className="text-[12.5px] font-black tracking-tight text-white leading-none mt-1 shadow-sm uppercase font-sans flex items-center gap-1 justify-center">
                                            {language === 'RU' ? 'Проектирование ядра' : 'Core Engineering'}
                                            <span className="text-[8px] text-indigo-400 animate-pulse">▼</span>
                                        </span>
                                    </button>
                                );
                            }
                        })()}
                    </div>

                    <div className="flex items-center gap-2 h-full">
                        {/* Floating SP Island inside top header bar */}
                        <button 
                            id="tutorial-sp-badge"
                            onClick={() => { playUiSound('CLICK'); setShowUpgrades(true); }}
                            className="h-10 px-3 bg-slate-900/95 border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-950/40 rounded-xl flex items-center gap-1.5 shadow-md text-indigo-300 text-xs font-semibold cursor-pointer select-none backdrop-blur-md transition-all active:scale-95 duration-200"
                        >
                            <Trophy className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="text-white font-black text-[11px] md:text-xs">{skillPoints} SP</span>
                        </button>

                        {/* Settings Button */}
                        <div id="settings-container" className="relative h-full flex items-center" onPointerDown={() => bringToFront('settings')}>
                            <button 
                                onClick={() => { playUiSound('CLICK'); toggleSettings(); }}
                                className={`w-10 h-10 flex items-center justify-center backdrop-blur-md border rounded-xl transition-all duration-200 shadow-md active:scale-95 cursor-pointer ${
                                    isSettingsOpen 
                                        ? 'bg-slate-800 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                                        : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                <Settings className={`w-4.5 h-4.5 ${isSettingsOpen ? 'rotate-90 text-white' : ''} transition-transform duration-500`} />
                            </button>

                            <AnimatePresence>
                                {isSettingsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        className="absolute top-full right-0 mt-2 p-3 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[200px] z-[9999] origin-top-right"
                                    > 
                                        <button 
                                            onClick={() => { playUiSound('CLICK'); (window as any).startStoryTutorial && (window as any).startStoryTutorial(); setIsSettingsOpen(false); }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all w-full text-left font-black uppercase text-[9px] tracking-[0.1em]"
                                        >
                                            <HelpCircle className="w-4 h-4 shrink-0" />
                                            <span>{language === 'RU' ? 'ОБУЧЕНИЕ ГЕКСАГОН' : 'HEXAGON TUTORIAL'}</span>
                                        </button>

                                        <button 
                                            onClick={() => { playUiSound('CLICK'); startDefenseSiege(); setIsSettingsOpen(false); }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-all w-full text-left font-black uppercase text-[9px] tracking-[0.1em]"
                                        >
                                            <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse text-rose-400" />
                                            <span>{language === 'RU' ? 'ТЕСТ ОБОРОНЫ ЯДРА' : 'TEST CORE DEFENSE'}</span>
                                        </button>

                                        <button 
                                            onClick={handleClearBoard}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-900/40 hover:text-white transition-all w-full text-left font-black uppercase text-[9px] tracking-[0.1em]"
                                        >
                                            <RefreshCw className="w-4 h-4 shrink-0 transition-transform hover:rotate-180" />
                                            <span>{language === 'RU' ? 'Очистить карту' : 'Clear Board'}</span>
                                        </button>

                                        <div className="h-px bg-white/5 my-0.5" />

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); toggleMusic(); }}
                                                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}
                                            >
                                                {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); toggleSfx(); }}
                                                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}
                                            >
                                                {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="h-px bg-white/5 my-0.5" />

                                        <div className="px-1 py-1 flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">
                                                <Languages className="w-3 h-3" />
                                                {language === 'RU' ? 'Язык' : 'Language'}
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => { playUiSound('CLICK'); setLanguage('RU'); }}
                                                    className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${language === 'RU' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    RU
                                                </button>
                                                <button 
                                                    onClick={() => { playUiSound('CLICK'); setLanguage('EN'); }}
                                                    className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${language === 'EN' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    EN
                                                </button>
                                            </div>
                                        </div>


                                    </motion.div>
                                )}
                            </AnimatePresence>


                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end overflow-hidden p-4 md:p-8">

                {/* COMPACT FLOATING OPERATIONS LINK & LOGS PANEL (Centralized high-tech notification/info link, optimized for mobile screens) */}
                <div 
                    id="operations-link-container" 
                    className="absolute top-[76px] md:top-[100px] left-4 right-4 sm:left-auto sm:right-8 pointer-events-auto flex flex-col items-end sm:w-[320px] select-none"
                    style={{ zIndex: 100 + panelZOrder.indexOf('terminal') * 10 }}
                    onPointerDown={() => bringToFront('terminal')}
                >
                    
                    {/* Collapsed State Panel */}
                    {!isTerminalLogExpanded ? (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            onClick={() => { playUiSound('CLICK'); openTerminal(); }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-slate-950/90 border border-indigo-500/30 hover:border-indigo-400 rounded-xl shadow-2xl backdrop-blur-md transition-all active:scale-98 group cursor-pointer text-left"
                        >
                            <div className="flex items-center gap-2 overflow-hidden w-full">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                                </span>
                                <div className="flex flex-col overflow-hidden flex-1">
                                    <span className="text-[13px] font-mono text-slate-100 font-semibold tracking-tight truncate leading-normal block">
                                        {systemLogs[0] ? (language === 'RU' ? systemLogs[0].textRU : systemLogs[0].textEN) : 'Initializing link...'}
                                    </span>
                                </div>
                            </div>
                        </motion.button>
                    ) : (
                        /* Expanded High-Tech Panel with full logs, completely optimized for mobile screen bounds and free of unnecessary guidelines/texts */
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="w-full bg-slate-950/98 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-[0_0_35px_rgba(99,102,241,0.25)] backdrop-blur-xl flex flex-col relative overflow-hidden"
                        >
                            {/* Visual Reticles & Accents */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/50 rounded-tl" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-500/50 rounded-tr" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-500/50 rounded-bl" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/50 rounded-br" />
                            <div className="absolute inset-0 bg-scanlines opacity-[0.06] pointer-events-none" />

                            {/* Header */}
                            <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/30 text-indigo-400 shrink-0">
                                        <Terminal className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[9.5px] font-black uppercase text-indigo-400 tracking-widest leading-none">OPERATIONS LINK</span>
                                        <span className="text-[12px] font-bold text-white uppercase tracking-tight leading-none mt-0.5">
                                            {language === 'RU' ? 'СИСТЕМНЫЕ УВЕДОМЛЕНИЯ' : 'SYSTEM NOTIFICATIONS'}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { playUiSound('CLICK'); setIsTerminalLogExpanded(false); }}
                                    className="p-1.5 bg-slate-900/80 border border-white/5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Complete log with full untruncated text of the latest notification, beautifully styled */}
                            <div className="max-h-[200px] md:max-h-[280px] overflow-y-auto pr-1 border border-white/5 rounded-xl bg-slate-900/20 p-2 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-indigo-500/30">
                                {(() => {
                                    const log = systemLogs[0];
                                    if (!log) {
                                        return (
                                            <div className="text-center py-4 text-xs font-mono text-slate-500">
                                                {language === 'RU' ? 'Нет уведомлений' : 'No notifications'}
                                            </div>
                                        );
                                    }
                                    let textCls = "text-slate-300";
                                    let dotCls = "bg-slate-400";
                                    let containerCls = "bg-slate-950/40 border border-white/5 p-2.5 rounded-lg";
                                    if (log.type === 'success') {
                                        textCls = "text-emerald-400 font-semibold";
                                        dotCls = "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]";
                                        containerCls = "bg-emerald-950/10 border border-emerald-500/20 p-2.5 rounded-lg";
                                    } else if (log.type === 'warning') {
                                        textCls = "text-rose-400 font-bold";
                                        dotCls = "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]";
                                        containerCls = "bg-rose-950/10 border border-rose-500/20 p-2.5 rounded-lg";
                                    }
                                    return (
                                        <div key={log.id} className={`flex flex-col gap-1.5 text-left ${containerCls}`}>
                                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-white/5 pb-1 mb-1">
                                                <span className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
                                                    <span className="uppercase tracking-wider font-bold">{log.type}</span>
                                                </span>
                                                <span className="font-semibold">{log.time}</span>
                                            </div>
                                            <p className={`text-[13px] leading-relaxed break-words whitespace-pre-wrap ${textCls}`}>
                                                {language === 'RU' ? log.textRU : log.textEN}
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    )}
                </div>
                
                {/* FLOATING ACTION TOOLTIP FOR SAME-LEVEL HEX DEMOLISHING */}
                <AnimatePresence>
                    {destroyButtonCell && (() => {
                        const { q, r } = destroyButtonCell;
                        const key = getHexKey(q, r);
                        const lvl = storyMap[key];
                        if (lvl === undefined || lvl < 0) return null;
                        
                        const px = hexToPixel(q, r);
                        const heightVal = 10 + lvl * 10;
                        const yOffsetOffset = -heightVal;
                        const topFaceY = px.y + yOffsetOffset;
                        
                        // Calculate screen position
                        const leftPos = cameraPosRef.current.x + px.x * zoomScaleRef.current;
                        const topPos = cameraPosRef.current.y + topFaceY * zoomScaleRef.current - 46 * zoomScaleRef.current; // place it 46px above the hex top face
                        
                        return (
                            <motion.div 
                                ref={destroyTooltipRef}
                                initial={{ scale: 0, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: 10 }}
                                style={{
                                    position: 'absolute',
                                    left: `${leftPos}px`,
                                    top: `${topPos}px`,
                                    transform: `translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.25, zoomScaleRef.current))})`,
                                    zIndex: 120,
                                }}
                                className="pointer-events-auto"
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playUiSound('SUCCESS');
                                        placeStoryHex(q, r, -999);
                                        setDestroyButtonCell(null);
                                    }}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseUp={(e) => e.stopPropagation()}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[8px] md:text-[9.5px] tracking-wider px-2.5 py-1.5 rounded-lg shadow-[0_5px_15px_rgba(239,68,68,0.4)] border border-red-500 flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <span>✖</span>
                                    <span>{language === 'RU' ? 'УНИЧТОЖИТЬ' : 'DESTROY'}</span>
                                </button>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>



                {/* FLOATING DROPDOWN FOR EXPANDED TASK DETAILS (Interactive Engineering Tablet) */}
                <AnimatePresence>
                    {!isNarrativeCollapsed && (
                        <motion.div
                            id="tutorial-blueprint-tablet"
                            initial={{ opacity: 0, y: -15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-[84px] md:top-[112px] left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md max-h-[calc(100vh-170px)] sm:max-h-[calc(100vh-210px)] overflow-y-auto bg-slate-950/80 border border-white/10 hover:border-indigo-500/25 rounded-2xl shadow-2xl p-4 select-none backdrop-blur-xl flex flex-col pointer-events-auto transition-all duration-300"
                            style={{ zIndex: 100 + panelZOrder.indexOf('tablet') * 10 }}
                            onPointerDown={() => bringToFront('tablet')}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Sleek Top Edge Progress Line */}
                            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-900/60 overflow-hidden rounded-t-2xl">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `100%` }}
                                />
                            </div>

                            {/* Tablet Header */}
                            <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2 mt-1">
                                <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">
                                            {language === 'RU' ? 'ИНЖЕНЕРНЫЙ ТЕРМИНАЛ' : 'ENGINEERING TERMINAL'}
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
                                        {language === 'RU' ? `ПРОЕКТИРОВАНИЕ ЯДРА` : `CORE SANDBOX`}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => { playUiSound('CLICK'); setIsNarrativeCollapsed(true); }}
                                    className="text-[9.5px] font-black text-slate-400 hover:text-white uppercase shrink-0 rounded hover:bg-white/5 px-2.5 py-1 transition-colors flex items-center gap-1.5 border border-white/5"
                                >
                                    <X className="w-3 h-3" />
                                    <span>{language === 'RU' ? 'СВЕРНУТЬ' : 'CLOSE'}</span>
                                </button>
                            </div>

                            {/* Tablet Tabs */}
                            <div className="grid grid-cols-3 gap-1 mb-3 bg-slate-900/50 p-0.5 rounded-lg border border-white/5">
                                {[
                                    { id: 'blueprint', labelRU: 'СТАТУС', labelEN: 'STATUS' },
                                    { id: 'diagnostics', labelRU: 'ДИАГНОСТИКА', labelEN: 'DIAGNOSTICS' },
                                    { id: 'rules', labelRU: 'ИНСТРУКЦИЯ', labelEN: 'GUIDE' }
                                ].map((tab) => {
                                    const isActive = tabletTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => { playUiSound('CLICK'); setTabletTab(tab.id as any); }}
                                            className={`py-1.5 px-2 rounded-md font-black text-[11px] md:text-[12.5px] tracking-wider uppercase transition-all ${isActive ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                        >
                                            {language === 'RU' ? tab.labelRU : tab.labelEN}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Centerpiece Container Panel */}
                            {tabletTab === 'blueprint' && (
                                <div className="flex flex-col">
                                    {/* Holographic Projection viewport - Engineering Schematic */}
                                    <div className="w-full bg-slate-900/20 border border-indigo-500/20 rounded-xl mb-3 p-4 relative overflow-hidden backdrop-blur-md shadow-[inset_0_0_24px_rgba(99,102,241,0.15)] flex flex-col gap-3 min-h-[56px]">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_80%)] pointer-events-none" />
                                        
                                        {/* Science fiction corner reticles */}
                                        <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-indigo-500/50 rounded-tl" />
                                        <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-indigo-500/50 rounded-tr" />
                                        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-indigo-500/50 rounded-bl" />
                                        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-indigo-500/50 rounded-br" />
 
                                        <div className="absolute top-2.5 left-7 text-[9px] font-mono tracking-wider text-indigo-400/40 uppercase">
                                            {language === 'RU' ? 'ИНЖЕНЕРНАЯ СХЕМА УЗЛОВ' : 'ENGINEERING SCHEMATIC'}
                                        </div>
                                        
                                        {(() => {
                                            const placedAll = Object.values(storyMap).filter(l => l !== undefined && l >= 0);
                                            const placedNodes = placedAll.length;
                                            const maxLevelPlaced = placedAll.length ? placedAll.reduce((a, b) => Math.max(a, b as number), 0) : 0;
                                            const totalVolume = placedAll.reduce((sum, val) => sum + (val as number), 0);
                                            const highTiers = placedAll.filter(l => (l as number) >= 5).length;
                                            
                                            return (
                                                <div className="mt-4 flex gap-3 h-full">
                                                    {/* Left Visual Diagram */}
                                                    <div className="w-[80px] h-[80px] shrink-0 border border-indigo-500/30 rounded-lg flex items-center justify-center bg-indigo-950/20 relative">
                                                        <Hexagon className="w-10 h-10 text-cyan-400 absolute opacity-30 animate-spin" style={{ animationDuration: '10s' }} />
                                                        <Hexagon className="w-6 h-6 text-indigo-300 relative z-10" />
                                                        <div className="absolute bottom-1 right-1 text-[6px] text-cyan-400 font-mono">v1.0</div>
                                                    </div>
                                                    {/* Right Stats */}
                                                    <div className="flex-1 flex flex-col justify-center gap-2">
                                                        <div>
                                                            <div className="flex justify-between items-baseline mb-0.5">
                                                                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">{language === 'RU' ? 'СТРОИТЕЛЬНЫЕ УЗЛЫ' : 'CONSTRUCTION NODES'}</span>
                                                                <span className="text-[13px] font-mono text-white font-bold">{placedNodes}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-800/80 h-1 rounded overflow-hidden">
                                                                <div className="bg-cyan-500 h-full" style={{ width: `${Math.min(100, placedNodes)}%` }} />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between items-baseline mb-0.5">
                                                                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">{language === 'RU' ? 'ОБЪЕМ ПЛАТФОРМ' : 'PLATFORM VOLUME'}</span>
                                                                <span className="text-[13px] font-mono text-white font-bold">{totalVolume}</span>
                                                            </div>
                                                            <div className="h-[2px] w-full border-b border-dashed border-indigo-500/30" />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                                            <div className="bg-slate-900/60 border border-white/5 rounded p-1.5 flex flex-col justify-center items-center">
                                                                <span className="text-[8.5px] text-slate-500 tracking-wider mb-0.5">{language === 'RU' ? 'МАКС ВЫСОТА' : 'MAX HEIGHT'}</span>
                                                                <span className="text-[13px] text-amber-400 font-black font-mono">L{maxLevelPlaced}</span>
                                                            </div>
                                                            <div className="bg-slate-900/60 border border-white/5 rounded p-1.5 flex flex-col justify-center items-center">
                                                                <span className="text-[8.5px] text-slate-500 tracking-wider mb-0.5">{language === 'RU' ? 'ЯДРА (L5+)' : 'CORES L5+'}</span>
                                                                <span className="text-[13px] text-rose-400 font-black font-mono">{highTiers}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
 
                                        {/* Animated Laser Scanning Line */}
                                        <motion.div 
                                            animate={{ y: ['0%', '100%'] }} 
                                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} 
                                            className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.5)] pointer-events-none z-10"
                                            style={{ top: 0 }}
                                        />
                                    </div>

                                    {/* Summary removed as merged into Holographic Projection viewport */}
                                </div>
                            )}

                            {tabletTab === 'diagnostics' && (
                                <div className="flex flex-col text-left mb-3.5 scrollbar-thin overflow-y-auto max-h-[420px] pr-1">
                                    <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5 gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-black text-rose-400 uppercase tracking-widest leading-none">
                                                    {language === 'RU' ? 'ТЕСТИРОВАНИЕ ТЕКСТУР PIXIJS' : 'PIXIJS TEXTURE DIAGNOSTICS'}
                                                </span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    playUiSound('CLICK');
                                                    const start = performance.now();
                                                    const res = verifyPixiTextures();
                                                    const end = performance.now();
                                                    const isAnyFailed = res.some(r => !r.canvasOk || !r.pixiOk);
                                                    setDiagnosticsRun({
                                                        status: isAnyFailed ? 'FAILED' : 'SUCCESS',
                                                        results: res,
                                                        totalElapsedMs: Number((end - start).toFixed(2))
                                                    });
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-500 font-extrabold text-[10px] tracking-wide uppercase px-2 py-1 rounded transition-colors text-white border border-indigo-400/30 font-sans cursor-pointer shadow-md select-none outline-none"
                                            >
                                                {language === 'RU' ? 'ЗАПУСТИТЬ ТЕСТ' : 'RUN TEST'}
                                            </button>
                                        </div>

                                        <p className="text-slate-400 text-[11px] font-medium leading-normal mb-3">
                                            {language === 'RU' 
                                                ? 'Этот инструмент проверяет процедурную генерацию текстур услугой TextureService и их корректное сопоставление с WebGL контекстом рендерера PixiJS.' 
                                                : 'This tool verifies procedural texture generation via TextureService and validates that HTML Canvas objects map correctly to PixiJS GPU textures.'}
                                        </p>

                                        {diagnosticsRun ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between text-[10.5px] font-mono bg-slate-950/40 p-2 rounded border border-white/5">
                                                    <div>
                                                        <span className="text-slate-500 font-bold block">{language === 'RU' ? 'СТАТУС ПРОВЕРКИ:' : 'VERIFICATION STATUS:'}</span>
                                                        <span className={`font-black uppercase text-[11.5px] ${diagnosticsRun.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                                            {diagnosticsRun.status === 'SUCCESS' ? 'PASS / УСПЕШНО' : 'FAIL / ОШИБКА'}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-slate-500 font-bold block">{language === 'RU' ? 'ОБЩЕЕ ВРЕМЯ:' : 'TOTAL ELAPSED TIME:'}</span>
                                                        <span className="text-white font-black">{diagnosticsRun.totalElapsedMs} ms</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1.5 mt-1">
                                                    {diagnosticsRun.results.map((res) => {
                                                        return (
                                                            <div key={res.level} className="bg-slate-950/25 border border-white/5 p-2 rounded-lg flex items-center justify-between text-[10px] font-mono hover:bg-slate-950/40 transition-colors">
                                                                <div className="flex items-center gap-2">
                                                                    <TexturePreview level={res.level} />
                                                                    <div>
                                                                        <span className="text-white font-bold block">Level {res.level} ({res.level >= 0 ? `L${res.level}` : `M${Math.abs(res.level)}`})</span>
                                                                        <span className="text-slate-500 font-bold">Res: {res.width}x{res.height} px</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-1 items-end">
                                                                    <div className="flex gap-1">
                                                                        <span className={`px-1 rounded text-[9px] font-black uppercase ${res.canvasOk ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950/60 text-rose-500 border border-rose-500/20'}`}>
                                                                            Canvas
                                                                        </span>
                                                                        <span className={`px-1 rounded text-[9px] font-black uppercase ${res.pixiOk ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950/60 text-rose-500 border border-rose-500/20'}`}>
                                                                            PixiJS
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-slate-500 text-[9px] font-bold">{res.elapsedMs} ms</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 rounded-lg text-slate-500 font-medium text-[11px] gap-2">
                                                <Info className="w-4 h-4 text-slate-600 animate-pulse" />
                                                <span>{language === 'RU' ? 'Ожидание запуска диагностики...' : 'Awaiting manual trigger...'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tabletTab === 'rules' && (
                                <div className="flex flex-col text-left mb-3.5">
                                    {/* Header Info */}
                                    <div className="mb-2.5">
                                        <h3 className="text-[14px] font-black text-white uppercase tracking-tight leading-tight mb-0.5">
                                            {language === 'RU' ? 'РЕЖИМ ПРОЕКТИРОВАНИЯ ЯДРА' : 'CORE SANDBOX ENGINEERING MODE'}
                                        </h3>
                                        <p className="text-slate-400 text-[11.5px] leading-relaxed font-sans font-medium">
                                            {language === 'RU' ? 'Здесь нет ограничений. Свободно стройте оборонительные платформы для предстоящих Защит ядра от вредоносных ботов.' : 'There are no limits here. Construct defensive platforms freely for upcoming Core Defense scenarios against malicious bots.'}
                                        </p>
                                    </div>

                                    {/* Step Guidelines Panel */}
                                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-2.5 text-[11px] text-slate-400 font-sans leading-relaxed font-medium">
                                        <div className="text-[9px] font-black text-indigo-400 tracking-wider uppercase mb-0.5">
                                            {language === 'RU' ? 'РУКОВОДСТВО ПО СТРОИТЕЛЬСТВУ' : 'CONSTRUCTION GUIDE RULES'}
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-[9px] font-black text-cyan-400 shrink-0">1</span>
                                            <div>
                                                <span className="text-slate-200 font-extrabold text-[12.5px] block">
                                                    {language === 'RU' ? 'Шаг 1. Платформы' : '1. Core Platforms'}
                                                </span>
                                                <span className="text-slate-400 text-[11px] font-sans">
                                                    {language === 'RU' ? 'Размещайте блоки L0 или удаляйте их для настройки платформ ядра.' : 'Place Level 0 blocks or demolish them to shape territory around the core.'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center text-[9px] font-black text-purple-400 shrink-0">2</span>
                                            <div>
                                                <span className="text-slate-200 font-extrabold text-[12.5px] block">
                                                    {language === 'RU' ? 'Шаг 2. Подъем высоты' : '2. Elevate Heights'}
                                                </span>
                                                <span className="text-slate-400 text-[11px] font-sans">
                                                    {language === 'RU' ? 'Используйте материалы для усиления укреплений блоков до L9+.' : 'Use materials to elevate block heights up to L9+ for scaling rewards.'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500/30 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0">3</span>
                                            <div>
                                                <span className="text-slate-200 font-extrabold text-[12.5px] block">
                                                    {language === 'RU' ? 'Шаг 3. Защита ядра' : '3. Core Defense'}
                                                </span>
                                                <span className="text-slate-400 text-[11px] font-sans">
                                                    {language === 'RU' ? 'Каждые 5 уровней активируется атака ботов. Постройте прочную защиту!' : 'Every 5 simulated levels triggers a bot invasion. Build sturdy defenses!'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Removed Completion Banner */}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOTTOM CONTENT - Compact Inventory Carousel with floating SP island */}
                <div className="mt-auto flex flex-col items-center justify-end pointer-events-none pt-4 w-full max-w-5xl mx-auto px-4 md:px-0 select-none pb-2">
                    
                    {/* "Levels" (Уровни) buttons down the bottom region */}
                    {!isUiHidden && (
                        <div className="flex items-center justify-center gap-3 mb-3 pointer-events-auto">
                            <motion.button
                                id="tutorial-levels-btn"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                onClick={() => { playUiSound('CLICK'); setUIState('CAMPAIGN_MAP'); }}
                                className="px-5 py-2.5 bg-gradient-to-r rounded-xl backdrop-blur-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 from-slate-900/90 via-indigo-950/90 to-slate-900/90 border border-indigo-500/30 hover:border-indigo-400 text-indigo-200 hover:text-white shadow-[0_4px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                            >
                                <Map className="w-4 h-4 text-indigo-400" />
                                <span>{language === 'RU' ? 'Карта уровней' : 'Levels Map'}</span>
                            </motion.button>
                        </div>
                    )}

                    {/* COMPACT CAROUSEL - relocated elegantly to the center (cells made smaller, L0 to L9, eraser) */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ 
                            y: isUiHidden ? 100 : 0, 
                            opacity: isUiHidden ? 0 : 1,
                            pointerEvents: isUiHidden ? 'none' : 'auto'
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-full md:max-w-md lg:max-w-xl flex flex-col items-stretch pointer-events-auto"
                    >
                        <div id="tutorial-shape-list" className="w-full bg-slate-950/45 border rounded-2xl p-2 backdrop-blur-xl animate-border-glow-premium relative transition-all duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500/20 to-transparent" />
                            
                            {/* Carousel Wrapper */}
                            <div className="relative flex items-center w-full px-5">
                                
                                {/* Left Scroll Command */}
                                <button
                                    onClick={handleScrollLeft}
                                    className={`absolute left-0 -translate-x-[calc(100%-1px)] top-1/2 -translate-y-1/2 z-20 w-5 h-12 rounded-l-xl bg-[#090d22]/95 border border-r-0 flex items-center justify-center transition-all ${
                                        totalInventoryTiles > 0
                                            ? 'border-cyan-400/50 text-cyan-400 hover:text-white hover:bg-cyan-950/40 shadow-[-8px_0_12px_-4px_rgba(34,211,238,0.5)] hover:shadow-[-8px_0_20px_-4px_rgba(34,211,238,0.8)] active:scale-95 cursor-pointer'
                                            : 'border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                                    }`}
                                    title={language === 'RU' ? 'Назад' : 'Prev'}
                                    disabled={totalInventoryTiles === 0}
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 -mr-0.5" />
                                </button>

                                {/* Scrolling container */}
                                <div 
                                    ref={carouselRef}
                                    className="w-full flex flex-row gap-1.5 overflow-x-auto pt-3 pb-1 px-1 scrollbar-none flex-nowrap scroll-smooth"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {Array.from({ length: 10 }).map((_, lvl) => {
                                        const sessionQty = minedInSessionHexes[lvl] || (minedInSessionHexes as any)[String(lvl)] || 0;
                                        const permaQty = collectedHexes[lvl] || (collectedHexes as any)[String(lvl)] || 0;
                                        const qty = sessionQty + permaQty;
                                        const isSelected = selectedBuildLevel === lvl;
                                        const theme = THEME_PALETTE[String(lvl)] || THEME_PALETTE['0'];
                                        const isPlaceable = placeableLevels.has(lvl);
                                        const canTransmute = qty >= 3 && lvl < 9;
                                        
                                        // Dynamic tooltip descriptions
                                        const tooltipText = qty <= 0
                                            ? (language === 'RU' ? 'Нет в наличии' : 'Out of stock')
                                            : isPlaceable
                                                ? (language === 'RU' ? `Уровень ${lvl}: готов к установке` : `Level ${lvl}: ready to place`)
                                                : (language === 'RU' ? `Уровень ${lvl} (Недоступно): постройте сначала опорные блоки` : `Level ${lvl} (Locked): build parent support blocks first`);

                                        return (
                                            <div key={lvl} className="flex flex-col items-center shrink-0">
                                                <div className="relative">
                                                <button
                                                    onClick={() => {
                                                        if (isSiegeActive) {
                                                            playUiSound('ERROR');
                                                            const alertMsg = language === 'RU'
                                                                ? "⚠️ Защита ядра активна! Строительство запрещено до ее завершения."
                                                                : "⚠️ Core defense is active! Construction is blocked until complete.";
                                                            setErrorMessage(alertMsg);
                                                            useGameStore.getState().showToast(alertMsg, 'error');
                                                            setTimeout(() => {
                                                                setErrorMessage(curr => curr === alertMsg ? null : curr);
                                                            }, 5000);
                                                            return;
                                                        }
                                                        
                                                        playUiSound('CLICK'); 
                                                        setSelectedBuildLevel(lvl); 
                                                    }}
                                                    title={tooltipText}
                                                    className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl border text-center transition-all w-13 h-17 relative cursor-pointer outline-none group ${
                                                        isSelected
                                                            ? isPlaceable
                                                                ? 'bg-indigo-950/45 border-cyan-400/70 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] scale-102 font-bold'
                                                                : 'bg-slate-950/35 border-red-500/30 text-rose-400/60 scale-100'
                                                            : qty > 0 
                                                                ? isPlaceable 
                                                                    ? 'bg-slate-950/50 border-white/5 text-slate-300 hover:bg-[#0f1530] hover:border-white/10'
                                                                    : 'bg-slate-950/20 border-white/5 text-slate-400 scale-98 hover:bg-[#0f1530]/20'
                                                                : 'bg-slate-950/10 border-white/5 text-slate-500 scale-95 hover:bg-[#0f1530]/15'
                                                    }`}
                                                >
                                                    <div className={`w-10 h-11 flex items-center justify-center select-none pointer-events-none transition-all ${
                                                        isSelected
                                                            ? isPlaceable
                                                                ? ''
                                                                : 'opacity-40 brightness-[0.5] grayscale saturate-50'
                                                            : qty > 0
                                                                ? isPlaceable
                                                                    ? ''
                                                                    : 'opacity-30 brightness-[0.45] grayscale saturate-[20%]'
                                                                : 'opacity-20 brightness-[0.35] grayscale saturate-0'
                                                    }`}>
                                                        {drawInventoryHex(lvl, theme)}
                                                    </div>

                                                    <span className={`text-[12.5px] mt-0.5 font-mono font-black leading-none tracking-tight select-none pointer-events-none transition-all ${
                                                        qty > 0 
                                                            ? isPlaceable 
                                                                ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] font-bold' 
                                                                : 'text-amber-500 font-medium' 
                                                            : 'text-slate-300 font-medium opacity-90'
                                                    }`}>
                                                        x{qty}
                                                    </span>
                                                </button>
                                                
                                                {/* Transmutation Button */}
                                                {canTransmute && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            playUiSound('SUCCESS'); // use a nice sound
                                                            
                                                            if (isSiegeActive) {
                                                                playUiSound('ERROR');
                                                                const alertMsg = language === 'RU'
                                                                    ? "⚠️ Защита ядра активна! Трансмутация запрещена до ее завершения."
                                                                    : "⚠️ Core defense is active! Transmutation is blocked until complete.";
                                                                setErrorMessage(alertMsg);
                                                                useGameStore.getState().showToast(alertMsg, 'error');
                                                                setTimeout(() => {
                                                                    setErrorMessage(curr => curr === alertMsg ? null : curr);
                                                                }, 5000);
                                                                return;
                                                            }
                                                            transmuteHexes(lvl, lvl + 1, 1);
                                                        }}
                                                        title={language === 'RU' ? `Сплавить 3 гекса L${lvl} в 1 гекс L${lvl + 1}` : `Transmute 3x L${lvl} into 1x L${lvl + 1}`}
                                                        className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-cyan-900 border border-cyan-400 p-0.5 z-30 hover:bg-cyan-700 hover:scale-110 active:scale-95 transition-all shadow-[0_0_10px_rgba(34,211,238,0.5)] group overflow-hidden pt-[2px] -mt-[4px]"
                                                    >
                                                        <RefreshCw className="w-3 h-3 text-cyan-200 group-hover:text-white" />
                                                    </button>
                                                )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Right Scroll Command */}
                                <button
                                    onClick={handleScrollRight}
                                    className={`absolute right-0 translate-x-[calc(100%-1px)] top-1/2 -translate-y-1/2 z-20 w-5 h-12 rounded-r-xl bg-[#090d22]/95 border border-l-0 flex items-center justify-center transition-all ${
                                        totalInventoryTiles > 0
                                            ? 'border-cyan-400/50 text-cyan-400 hover:text-white hover:bg-cyan-950/40 shadow-[8px_0_12px_-4px_rgba(34,211,238,0.5)] hover:shadow-[8px_0_20px_-4px_rgba(34,211,238,0.8)] active:scale-95 cursor-pointer'
                                            : 'border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                                    }`}
                                    title={language === 'RU' ? 'Вперед' : 'Next'}
                                    disabled={totalInventoryTiles === 0}
                                >
                                    <ChevronRight className="w-3.5 h-3.5 -ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* CLEAR CONFIRMATION DIALOG */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
                        onClick={() => setShowClearConfirm(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative text-center"
                        >
                            <RefreshCw className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse opacity-80" />
                            <h3 className="text-xl md:text-2xl font-black font-mono text-white mb-2 tracking-tight uppercase">
                                {language === 'RU' ? 'Сброс поля' : 'Wipe Board'}
                            </h3>
                            <p className="text-slate-300 mb-6 text-sm md:text-base px-2">
                                {language === 'RU' 
                                    ? 'Вы уверены, что хотите полностью очистить игровое поле? Это действие необратимо.' 
                                    : 'Are you sure you want to completely clear the game board? This action cannot be undone.'}
                            </p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs md:text-sm rounded-xl transition-all border border-slate-700 active:scale-95 touch-manipulation"
                                >
                                    {language === 'RU' ? 'Отмена' : 'Cancel'}
                                </button>
                                <button 
                                    onClick={confirmClearBoard}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs md:text-sm rounded-xl transition-all border border-red-500/50 shadow-[0_4px_15px_rgba(239,68,68,0.4)] active:scale-95 touch-manipulation"
                                >
                                    {language === 'RU' ? 'Очистить' : 'Clear'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* GLOBAL RECOVERY / CAMPAIGN UPGRADES TREE */}
            <AnimatePresence>
                {showUpgrades && (
                    <UpgradesTree onClose={() => setShowUpgrades(false)} key="upgrades-tree" />
                )}
            </AnimatePresence>

            {/* INTERACTIVE DEMOLITION CONFIRMATION MODAL */}
            <AnimatePresence>
                {popupCell && (() => {
                    const key = getHexKey(popupCell.q, popupCell.r);
                    const currentLevel = storyMap[key];
                    if (currentLevel === undefined) return null;
                    
                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto"
                            onClick={() => setPopupCell(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 15 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 15 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-950 border-2 border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] relative text-left"
                            >
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                                
                                <div className="text-center p-2 z-20 relative">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                        <X className="w-7 h-7 font-black" />
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1.5 text-center">
                                        {language === 'RU' ? 'ПОДТВЕРДИТЬ СНОС?' : 'CONFIRM DEMOLITION?'}
                                    </h4>
                                    <p className="text-slate-400 text-[10px] mb-6 text-center leading-relaxed">
                                        {language === 'RU' 
                                            ? `Вы уверены, что хотите демонтировать и убрать этот гекс уровня L${currentLevel}? Плитка будет перенесена обратно на ваш склад.`
                                            : `Are you sure you want to demolish and remove this L${currentLevel} hex? The tile will be reclaimed and placed back inside your depository.`}
                                    </p>
                                    
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => { playUiSound('CLICK'); setPopupCell(null); }}
                                            className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                                        >
                                            {language === 'RU' ? 'ОТМЕНА' : 'CANCEL'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                playUiSound('SUCCESS');
                                                placeStoryHex(popupCell.q, popupCell.r, -999);

                                                setPopupCell(null);
                                            }}
                                            className="flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-1 cursor-pointer border border-red-500"
                                        >
                                            <span className="text-[11px] leading-none">✖</span>
                                            <span>{language === 'RU' ? 'СНЕСТИ' : 'DEMOLISH'}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            <StoryTutorial />

            <LevelExitDialog 
                isOpen={isExitDialogOpen}
                onClose={() => setIsExitDialogOpen(false)}
                onConfirm={() => {
                    setIsExitDialogOpen(false);
                    if (exitTargetState) setUIState(exitTargetState);
                }}
                mode="SANDBOX"
                language={language === 'RU' ? 'RU' : 'EN'}
                playUiSound={playUiSound}
            />
        </div>
    );
};

export default StoryBuilderView;
