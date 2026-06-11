import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Rect } from 'react-konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import { THEME_PALETTE } from './MapRenderer.tsx';
import { UpgradesTree } from './UpgradesTree.tsx';
import { ArrowLeft, Settings, Volume2, VolumeX, Music, Languages, HelpCircle, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Trophy, RefreshCw, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { FIGURES_COLLECTION } from './StoryBuilderData.ts';
import { NebulaBackground, MiniFigureBlueprint, StoryHex } from './StoryBuilderComponents.tsx';






import { StoryTutorial } from './hud/StoryTutorial.tsx';

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

const StoryBuilderView: React.FC = () => {
    const setUIState = useGameStore(state => state.setUIState);
    const playUiSound = useGameStore(state => state.playUiSound);
    const minedInSessionHexes = useGameStore(state => state.minedInSessionHexes);
    const storyMap = useGameStore(state => state.storyMap);
    const placeStoryHex = useGameStore(state => state.placeStoryHex);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);
    const clearStoryMap = useGameStore(state => state.clearStoryMap);
    const skillPoints = useGameStore(state => state.skillPoints);
    const setSkillPoints = useGameStore(state => state.setSkillPoints);
    const language = useGameStore(state => state.language);
    const setLanguage = useGameStore(state => state.setLanguage);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleSfx = useGameStore(state => state.toggleSfx);

    // Active unlocked state index
    const [unlockedFigureIndex, setUnlockedFigureIndex] = useState(() => {
        try {
            return Number(localStorage.getItem('hexopol_figure_index') || '0');
        } catch {
            return 0;
        }
    });

    const activeFigure = useMemo(() => {
        return FIGURES_COLLECTION[unlockedFigureIndex] || FIGURES_COLLECTION[0];
    }, [unlockedFigureIndex]);



    const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [cameraPos, setCameraPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 30 });
    const [zoomScale, setZoomScale] = useState(window.innerWidth < 768 ? 1.55 : 2.15);
    const [isNarrativeCollapsed, setIsNarrativeCollapsed] = useState(true); // Optimized space by defaulting to true
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tabletTab, setTabletTab] = useState<'blueprint' | 'diagnostics' | 'rules'>('blueprint');
    const isUiHidden = false;
    const [lastPlacedKey, setLastPlacedKey] = useState<string | null>(null);
    const [showUpgrades, setShowUpgrades] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [popupCell, setPopupCell] = useState<{ q: number, r: number } | null>(null);
    const [selectedBuildLevel, setSelectedBuildLevel] = useState<number>(0); // 0-9 for building higher levels, or -999 for demolish/снос
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // Visual feedback warning toast
    const [destroyButtonCell, setDestroyButtonCell] = useState<{ q: number, r: number } | null>(null);
    const [failedClickCoord, setFailedClickCoord] = useState<{ q: number, r: number } | null>(null);

    // Automation & Flare states
    const [spToasts, setSpToasts] = useState<{ id: string; text: string; x: number; y: number }[]>([]);
    const [flareKeys, setFlareKeys] = useState<Set<string>>(new Set());
    const [isAnimatingCompletion, setIsAnimatingCompletion] = useState(false);
    
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

    const handleResetCamera = useCallback(() => {
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const h = containerRef.current?.clientHeight || window.innerHeight;
        setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
        setZoomScale(w < 768 ? 1.55 : 2.15);
        playUiSound('CLICK');
    }, [playUiSound]);

    const handleScrollLeft = useCallback(() => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -140, behavior: 'smooth' });
            playUiSound('CLICK');
        }
    }, [playUiSound]);

    const handleScrollRight = useCallback(() => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 140, behavior: 'smooth' });
            playUiSound('CLICK');
        }
    }, [playUiSound]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            // Fallback
            const handleResize = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                setStageSize({ width: w, height: h });
                setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
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
            setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Shape completeness check - checks if the placed level 0 or higher hexes match the active figure's coordinates
    // under any translation offset (allows random placement anywhere on the board!)
    const completedHexKeys = useMemo(() => {
        const shape = activeFigure.shape;
        const activeHexKeys = Object.entries(storyMap)
            .filter(([_, lvl]) => lvl !== undefined && lvl >= 0)
            .map(([key, lvl]) => {
                const [q, r] = key.split(',').map(Number);
                return { q, r, lvl };
            });
        
        if (activeHexKeys.length < shape.length) return new Set<string>();

        const pt0 = shape[0];
        if (!pt0) return new Set<string>();

        for (const anchor of activeHexKeys) {
            const dq = anchor.q - pt0.q;
            const dr = anchor.r - pt0.r;

            let matchesAll = true;
            const tempKeys = new Set<string>();
            for (const pt of shape) {
                // Determine layout coordinates relative to anchor offset
                const targetKey = getHexKey(pt.q + dq, pt.r + dr);
                const targetLvl = storyMap[targetKey];
                if (targetLvl === undefined || targetLvl < 0) {
                    matchesAll = false;
                    break;
                }
                const reqLvl = pt.lvl !== undefined ? pt.lvl : 0;
                if (targetLvl !== reqLvl) {
                    matchesAll = false;
                    break;
                }
                tempKeys.add(targetKey);
            }
            if (matchesAll) return tempKeys;
        }
        return new Set<string>();
    }, [storyMap, activeFigure]);

    const targetCompleted = useMemo(() => {
        return completedHexKeys.size > 0;
    }, [completedHexKeys]);

    // Automatic Shape Assembly Completion & Neon Highlight Flare Effect
    useEffect(() => {
        if (targetCompleted && !isAnimatingCompletion) {
            setIsAnimatingCompletion(true);
            const keysToFlare = new Set(completedHexKeys);
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
                const heightVal = 12 + lvl * 12;
                sumX += px.x;
                sumY += px.y - heightVal;
                count++;
            });

            const avgX = count > 0 ? (sumX / count) : 0;
            const avgY = count > 0 ? (sumY / count) : 0;

            // Project 2D game world coordinates to screen coordinate space
            const screenX = cameraPos.x + avgX * zoomScale;
            const screenY = cameraPos.y + avgY * zoomScale;

            // Spawn SP floating toast notification at target screen location
            const toastId = Math.random().toString(36).substring(2, 9);
            const toastText = language === 'RU' ? '+1 Очко Симуляции (SP)' : '+1 Simulation Point (SP)';
            setSpToasts(prev => [...prev, { id: toastId, text: toastText, x: screenX, y: screenY }]);
            setTimeout(() => {
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
                } catch {}
            }
            
            setPopupCell(null);
            
            // Complete beautiful neon flare fadeout (do NOT clear map so the user keeps structures intact!)
            setTimeout(() => {
                setIsAnimatingCompletion(false);
                setFlareKeys(new Set());
            }, 1600);
        }
    }, [targetCompleted, completedHexKeys, unlockedFigureIndex, skillPoints, language, playUiSound, setSkillPoints, cameraPos, zoomScale, storyMap, isAnimatingCompletion]);

    const hasAnyHex = useMemo(() => {
        return Object.values(storyMap).some(lvl => lvl !== undefined && lvl >= 0);
    }, [storyMap]);

    const autoTutorialTriggeredRef = useRef(false);

    useEffect(() => {
        if (!hasAnyHex && unlockedFigureIndex <= 3) {
            if (!autoTutorialTriggeredRef.current) {
                const timer = setTimeout(() => {
                    if ((window as any).startStoryTutorial) {
                        (window as any).startStoryTutorial();
                        autoTutorialTriggeredRef.current = true;
                    }
                }, 500);
                return () => clearTimeout(timer);
            }
        } else if (hasAnyHex) {
            autoTutorialTriggeredRef.current = false;
        }
    }, [hasAnyHex, unlockedFigureIndex]);

    // Direct placement eligibility calculation
    const isEligibleForPlacement = useCallback((q: number, r: number, forceLevel?: number) => {
        const lvlToBuild = forceLevel !== undefined ? forceLevel : selectedBuildLevel;
        const currentMap = storyMap;
        if (lvlToBuild === -999) return false; // Demolish is not a placement

        const currentLvl = currentMap[getHexKey(q, r)];
        const currentlyBuilt = currentLvl !== undefined && currentLvl >= 0;

        if (!currentlyBuilt) {
            if (lvlToBuild !== 0) return false;
        }

        if (!hasAnyHex) {
            if (q === 0 && r === 0) {
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
    }, [storyMap, selectedBuildLevel, hasAnyHex]);

    const gridPoints = useMemo(() => {
        const points = [];
        const RADIUS = 12;
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
        
        const map = storyMap;
        const buildLevel = selectedBuildLevel;
        const key = getHexKey(q, r);
        const currentLvl = map[key];
        const isCurrentlyBuilt = currentLvl !== undefined && currentLvl >= 0;

        const eligible = isEligibleForPlacement(q, r);
        
        if (isCurrentlyBuilt) {
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
        const availableCount = minedInSessionHexes[buildLevel] || 0;
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
        setErrorMessage(null); // clear any previous warning
    }, [isPanning, isEligibleForPlacement, minedInSessionHexes, placeStoryHex, addMinedHexes, playUiSound, setErrorMessage, language, setDestroyButtonCell, storyMap, selectedBuildLevel, hasAnyHex]);

    const handleCellDblClick = useCallback((q: number, r: number) => {
        const key = getHexKey(q, r);
        const currentLvl = storyMap[key];
        const isCurrentlyBuilt = currentLvl !== undefined && currentLvl >= 0;
        
        if (!isCurrentlyBuilt) {
            handleResetCamera();
        }
    }, [storyMap, handleResetCamera]);

    const handleDragStart = () => { 
        isPanning.current = true; 
        setDestroyButtonCell(null);
    };
    const handleDragEnd = (e: any) => { 
        setCameraPos({ x: e.target.x(), y: e.target.y() });
        setTimeout(() => { isPanning.current = false; }, 50); 
    };

    const lastDist = useRef<number | null>(null);

    const handleWheel = (e: any) => {
        if (e.evt && typeof e.evt.preventDefault === 'function') {
            e.evt.preventDefault();
        }
        setDestroyButtonCell(null);
        const stage = e.target.getStage();
        if (!stage) return;
        
        const scaleBy = 1.05;
        const oldScale = zoomScale;
        
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - cameraPos.x) / oldScale,
            y: (pointer.y - cameraPos.y) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const clampedScale = Math.max(0.4, Math.min(2.0, newScale));
        
        setZoomScale(clampedScale);
        setCameraPos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    };

    const handleTouchStart = (e: any) => {
        setDestroyButtonCell(null);
        const touches = e.evt?.touches || e.touches || [];
        const touch1 = touches[0];
        const touch2 = touches[1];
        if (touch1 && touch2) {
            const rawEvt = e.evt || e;
            if (rawEvt && typeof rawEvt.preventDefault === 'function') {
                rawEvt.preventDefault();
            }
            try {
                const layer = typeof e.target?.getLayer === 'function' ? e.target.getLayer() : null;
                if (layer) {
                    layer.stopDrag();
                }
            } catch (err) {}

            const dist = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            lastDist.current = dist;
        } else {
            lastDist.current = null;
        }
    };

    const handleTouchMove = (e: any) => {
        const touches = e.evt?.touches || e.touches || [];
        const touch1 = touches[0];
        const touch2 = touches[1];

        if (touch1 && touch2) {
            const rawEvt = e.evt || e;
            if (rawEvt && typeof rawEvt.preventDefault === 'function') {
                rawEvt.preventDefault();
            }
            isPanning.current = true;
            setDestroyButtonCell(null);

            try {
                const layer = typeof e.target?.getLayer === 'function' ? e.target.getLayer() : null;
                if (layer) {
                    layer.stopDrag();
                }
            } catch (err) {}

            const dist = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            if (lastDist.current !== null && lastDist.current > 0) {
                const center = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2,
                };

                const oldScale = zoomScale;
                const pointTo = {
                    x: (center.x - cameraPos.x) / oldScale,
                    y: (center.y - cameraPos.y) / oldScale,
                };

                const scaleFactor = dist / lastDist.current;
                const newScale = Math.max(0.4, Math.min(2.0, oldScale * scaleFactor));
                setZoomScale(newScale);

                setCameraPos({
                    x: center.x - pointTo.x * newScale,
                    y: center.y - pointTo.y * newScale,
                });
            }
            lastDist.current = dist;
        } else {
            lastDist.current = null;
        }
    };

    const handleTouchEnd = () => { 
        lastDist.current = null; 
        setTimeout(() => { isPanning.current = false; }, 50);
    };

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
                                    className="block text-[10px] md:text-xs font-black tracking-widest text-[#22d3ee] uppercase select-none leading-none mb-1 text-center"
                                    style={{
                                        textShadow: '0 0 10px rgba(34, 211, 238, 0.95), 0 0 20px rgba(34, 211, 238, 0.5)'
                                    }}
                                >
                                    {language === 'RU' ? 'ФИГУРА СОБРАНА!' : 'SHAPE COMPLETED!'}
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
                <Stage 
                    width={stageSize.width} 
                    height={stageSize.height}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => setDestroyButtonCell(null)}
                    onTap={() => setDestroyButtonCell(null)}
                >
                    <Layer listening={false}>
                        <NebulaBackground width={stageSize.width} height={stageSize.height} />
                        <Rect
                            x={0}
                            y={0}
                            width={stageSize.width}
                            height={stageSize.height}
                            fillRadialGradientStartPoint={{ x: stageSize.width/2, y: stageSize.height/2 }}
                            fillRadialGradientStartRadius={Math.min(stageSize.width, stageSize.height) * 0.4}
                            fillRadialGradientEndPoint={{ x: stageSize.width/2, y: stageSize.height/2 }}
                            fillRadialGradientEndRadius={Math.max(stageSize.width, stageSize.height) * 0.8}
                            fillRadialGradientColorStops={[0, 'transparent', 1, 'rgba(2, 6, 23, 1)']}
                            listening={false}
                        />
                    </Layer>
                    <Layer 
                        x={cameraPos.x} 
                        y={cameraPos.y} 
                        scaleX={zoomScale}
                        scaleY={zoomScale}
                        draggable 
                        onDragStart={handleDragStart} 
                        onDragEnd={handleDragEnd}
                        dragBoundFunc={(pos) => {
                            const BOUND_X = stageSize.width * 2.2 * Math.max(1, zoomScale);
                            const BOUND_Y = stageSize.height * 2.2 * Math.max(1, zoomScale);
                            const centerX = stageSize.width / 2;
                            const centerY = stageSize.height / 2 - (stageSize.width < 768 ? 20 : 50);
                            return {
                                x: Math.max(Math.min(pos.x, centerX + BOUND_X), centerX - BOUND_X),
                                y: Math.max(Math.min(pos.y, centerY + BOUND_Y), centerY - BOUND_Y),
                            };
                        }}
                    >
                        <Group>
                            {gridPoints.map(coord => {
                                const key = getHexKey(coord.q, coord.r);
                                const lvl = storyMap[key];
                                const blueprintPt = activeFigure.shape.find(pt => pt.q === coord.q && pt.r === coord.r);
                                const isBlueprint = !!blueprintPt && (lvl === undefined || lvl < 0);
                                const blueprintLvl = blueprintPt?.lvl !== undefined ? blueprintPt.lvl : 0;
                                
                                const isEligible = isEligibleForPlacement(coord.q, coord.r);
                                const isCenterInitially = coord.q === 0 && coord.r === 0 && !hasAnyHex;
                                const isDemolishMode = selectedBuildLevel === -999;
                                const availableCount = minedInSessionHexes[selectedBuildLevel] || 0;
                                const canPlaceHex = isDemolishMode ? (lvl !== undefined && lvl >= 0) : (isEligible && availableCount > 0);



                                return (
                                    <StoryHex
                                        key={key}
                                        q={coord.q}
                                        r={coord.r}
                                        level={lvl}
                                        isBlueprint={isBlueprint}
                                        blueprintLevel={blueprintLvl}
                                        isEligible={isEligible}
                                        isCenterInitially={isCenterInitially}
                                        isSelected={popupCell !== null && popupCell.q === coord.q && popupCell.r === coord.r}
                                        isNew={lastPlacedKey === key}
                                        canPlace={canPlaceHex}
                                        isFlaring={flareKeys.has(key)}
                                        isFailedClick={failedClickCoord !== null && failedClickCoord.q === coord.q && failedClickCoord.r === coord.r}
                                        onClick={handleCellClick}
                                        onDblClick={handleCellDblClick}
                                    />
                                );
                            })}
                        </Group>
                    </Layer>
                </Stage>
            </div>
            
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden p-4 md:p-8">
                
                {/* FLOATING LIGHTWEIGHT ERROR MESSAGE (Moved ergonomically to perfectly centered bottom position, avoiding overflow) */}
                <AnimatePresence>
                    {errorMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="absolute bottom-36 md:bottom-28 left-0 right-0 mx-auto z-[100] pointer-events-auto w-[calc(100%-3rem)] max-w-sm flex justify-center"
                        >
                            <div 
                                onClick={() => { playUiSound('CLICK'); setErrorMessage(null); }}
                                className="bg-slate-950/98 border border-slate-800 text-red-400 font-mono font-black uppercase text-xs tracking-wider px-4 py-3 rounded-lg shadow-xl w-full cursor-pointer hover:bg-slate-900 transition-all select-none text-center"
                            >
                                {errorMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* FLOATING ACTION TOOLTIP FOR SAME-LEVEL HEX DEMOLISHING */}
                <AnimatePresence>
                    {destroyButtonCell && (() => {
                        const { q, r } = destroyButtonCell;
                        const key = getHexKey(q, r);
                        const lvl = storyMap[key];
                        if (lvl === undefined || lvl < 0) return null;
                        
                        const px = hexToPixel(q, r);
                        const heightVal = 12 + lvl * 12;
                        const yOffsetOffset = -heightVal;
                        const topFaceY = px.y + yOffsetOffset;
                        
                        // Calculate screen position
                        const leftPos = cameraPos.x + px.x * zoomScale;
                        const topPos = cameraPos.y + topFaceY * zoomScale - 46 * zoomScale; // place it 46px above the hex top face
                        
                        return (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: 10 }}
                                style={{
                                    position: 'absolute',
                                    left: `${leftPos}px`,
                                    top: `${topPos}px`,
                                    transform: `translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.25, zoomScale))})`,
                                    zIndex: 120,
                                }}
                                className="pointer-events-auto"
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playUiSound('SUCCESS');
                                        placeStoryHex(q, r, -999);
                                        addMinedHexes({ [lvl]: 1 });
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
                
                {/* TOP HEADER STATUS */}
                <motion.div 
                    animate={{ y: isUiHidden ? -100 : 0, opacity: isUiHidden ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center w-full pointer-events-auto h-14 relative z-[50]"
                >
                    <div className="flex items-center gap-2 h-full">
                        <button 
                            onClick={() => { playUiSound('CLICK'); setUIState('MENU'); }}
                            className="flex items-center justify-center w-10 h-10 bg-slate-900/90 border border-slate-800 rounded-xl hover:bg-slate-800/90 hover:border-indigo-500/30 text-slate-400 hover:text-white transition-all duration-250 shadow-md backdrop-blur-md cursor-pointer active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" /> 
                        </button>
                    </div>

                    {/* INTERACTIVE TASK CAPSULE (Squeezed between back and settings) */}
                    <div className="flex-1 mx-2 max-w-[240px] sm:max-w-xs h-11 py-0.5">
                        <div 
                            onClick={() => { playUiSound('CLICK'); setIsNarrativeCollapsed(!isNarrativeCollapsed); }}
                            className="bg-slate-900/95 border border-indigo-500/30 hover:border-indigo-500/50 rounded-xl h-full shadow-lg backdrop-blur-md flex items-center justify-between pl-1.5 pr-3 relative cursor-pointer hover:bg-slate-800/90 transition-all duration-250 select-none overflow-hidden"
                        >
                            {/* Micro progress line at top of the capsule */}
                            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-950/60 overflow-hidden rounded-t-xl">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${((unlockedFigureIndex + 1) / FIGURES_COLLECTION.length) * 100}%` }}
                                />
                            </div>

                            <div className="flex items-center gap-2 py-0.5 min-w-0 flex-1">
                                {/* Compact vector thumbnail preview of the shape with correct, standardized, restricted sizes */}
                                <MiniFigureBlueprint 
                                    shape={activeFigure.shape} 
                                    cellSize={6} 
                                    className="w-[36px] h-[36px] bg-transparent shrink-0 overflow-visible transition-all duration-300"
                                    style={{ 
                                        margin: '0 !important', 
                                        marginLeft: '0px', 
                                        marginRight: '0px', 
                                        marginTop: '0px', 
                                        marginBottom: '0px', 
                                        padding: '0px' 
                                    }}
                                />

                                <div className="flex flex-col justify-center min-w-0 text-left pl-1">
                                    <span className="text-[7.5px] font-mono font-black text-indigo-400/80 uppercase tracking-widest leading-none">
                                        {language === 'RU' ? 'ЗАДАЧА' : 'CHALLENGE'}
                                    </span>
                                    <span className="text-[12.5px] font-black font-mono text-white tracking-tight leading-none mt-1 shadow-sm">
                                        {unlockedFigureIndex + 1} <span className="text-slate-500 font-medium text-[9.5px]">/ {FIGURES_COLLECTION.length}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {targetCompleted && (
                                    <span className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-[6.5px] font-mono font-black px-1 py-0.5 rounded leading-none shrink-0 tracking-wide">DONE</span>
                                )}
                                <div className="text-slate-400 hover:text-white transition-colors duration-200 shrink-0">
                                    {isNarrativeCollapsed ? <ChevronDown className="w-3.5 h-3.5 animate-pulse" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                </div>
                            </div>
                        </div>
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
                        <div className="relative h-full flex items-center">
                            <button 
                                onClick={() => { playUiSound('CLICK'); setIsSettingsOpen(!isSettingsOpen); }}
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
                                        className="absolute top-full right-0 mt-2 p-3 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[200px] z-[60] origin-top-right"
                                    > 
                                        <button 
                                            onClick={() => { playUiSound('CLICK'); (window as any).startStoryTutorial && (window as any).startStoryTutorial(); setIsSettingsOpen(false); }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all w-full text-left font-black uppercase text-[9px] tracking-[0.1em]"
                                        >
                                            <HelpCircle className="w-4 h-4 shrink-0" />
                                            <span>{language === 'RU' ? 'ОБУЧЕНИЕ ГЕКСАГОН' : 'HEXAGON TUTORIAL'}</span>
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

                {/* FLOATING DROPDOWN FOR EXPANDED TASK DETAILS (Interactive Engineering Tablet) */}
                <AnimatePresence>
                    {!isNarrativeCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, y: -15, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-[84px] md:top-[112px] left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-md max-h-[calc(100vh-170px)] sm:max-h-[calc(100vh-210px)] overflow-y-auto bg-slate-950/80 border border-white/10 hover:border-indigo-500/25 rounded-2xl shadow-2xl p-4 select-none backdrop-blur-xl z-[45] flex flex-col pointer-events-auto transition-all duration-300"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Sleek Top Edge Progress Line */}
                            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-900/60 overflow-hidden rounded-t-2xl">
                                <div 
                                    className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${((unlockedFigureIndex + 1) / FIGURES_COLLECTION.length) * 100}%` }}
                                />
                            </div>

                            {/* Tablet Header */}
                            <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-2 mt-1">
                                <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[7.5px] font-black text-cyan-400 uppercase tracking-widest leading-none">
                                            {language === 'RU' ? 'ИНЖЕНЕРНЫЙ ПЛАНШЕТ СБОРКИ' : 'ENGINEERING TABLET'}
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <span className="text-[6px] font-mono text-slate-500 uppercase tracking-wider">
                                        {language === 'RU' ? `ЧЕРТЕЖ: ${unlockedFigureIndex + 1} ИЗ ${FIGURES_COLLECTION.length}` : `BLUEPRINT: ${unlockedFigureIndex + 1} OF ${FIGURES_COLLECTION.length}`}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => { playUiSound('CLICK'); setIsNarrativeCollapsed(true); }}
                                    className="text-[7.5px] font-black text-slate-400 hover:text-white uppercase shrink-0 rounded hover:bg-white/5 px-2 py-1 transition-colors flex items-center gap-1 border border-white/5"
                                >
                                    <X className="w-2.5 h-2.5" />
                                    <span>{language === 'RU' ? 'СВЕРНУТЬ' : 'CLOSE'}</span>
                                </button>
                            </div>

                            {/* Tablet Tabs */}
                            <div className="grid grid-cols-2 gap-1 mb-3 bg-slate-900/50 p-0.5 rounded-lg border border-white/5">
                                {[
                                    { id: 'blueprint', labelRU: 'СХЕМА И АНАЛИЗ', labelEN: 'DIAGRAM & ANALYSIS' },
                                    { id: 'rules', labelRU: 'ИНСТРУКЦИЯ', labelEN: 'GUIDE' }
                                ].map((tab) => {
                                    const isActive = tabletTab === tab.id || (tab.id === 'blueprint' && tabletTab === 'diagnostics');
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => { playUiSound('CLICK'); setTabletTab(tab.id as any); }}
                                            className={`py-1.5 px-2 rounded-md font-black text-[8.5px] md:text-[10px] tracking-wider uppercase transition-all ${isActive ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                        >
                                            {language === 'RU' ? tab.labelRU : tab.labelEN}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Centerpiece Container Panel */}
                            {tabletTab === 'blueprint' && (
                                <div className="flex flex-col">
                                    {/* Holographic Projection viewport */}
                                    <div className="w-full h-56 bg-slate-900/20 border border-indigo-500/20 rounded-xl mb-3 flex items-center justify-center p-4 relative overflow-hidden backdrop-blur-md shadow-[inset_0_0_24px_rgba(99,102,241,0.15)]">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06),transparent_80%)] pointer-events-none" />
                                        
                                        {/* Science fiction corner reticles */}
                                        <div className="absolute top-2.5 left-2.5 w-3 h-3 border-t-2 border-l-2 border-indigo-500/50 rounded-tl" />
                                        <div className="absolute top-2.5 right-2.5 w-3 h-3 border-t-2 border-r-2 border-indigo-500/50 rounded-tr" />
                                        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b-2 border-l-2 border-indigo-500/50 rounded-bl" />
                                        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b-2 border-r-2 border-indigo-500/50 rounded-br" />
 
                                        <div className="absolute top-2.5 left-7 text-[7px] font-mono tracking-wider text-indigo-400/40 uppercase">
                                            {language === 'RU' ? 'ПРОЕКЦИЯ ЦЕЛЕВОЙ СТРУКТУРЫ' : 'TARGET BLUEPRINT PROJECTION'}
                                        </div>
                                        <div className="absolute bottom-2.5 right-3 flex gap-1.5 items-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                            <span className="text-[7px] font-mono text-cyan-400/60 uppercase font-bold">
                                                {language === 'RU' ? 'АНАЛИЗ СОВПАДЕНИЙ' : 'MATCH ANALYSIS'}
                                            </span>
                                        </div>
 
                                        {/* Animated Laser Scanning Line */}
                                        <motion.div 
                                            animate={{ y: ['0%', '100%'] }} 
                                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} 
                                            className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.5)] pointer-events-none z-10"
                                            style={{ top: 0 }}
                                        />
 
                                        <MiniFigureBlueprint 
                                            shape={activeFigure.shape} 
                                            cellSize={24} 
                                            className="w-full h-full max-w-[280px] max-h-[200px] bg-transparent p-0 drop-shadow-[0_0_30px_rgba(99,102,241,0.4)]"
                                        />
                                    </div>

                                    {/* Live Field Analysis and Diagnostics merged into the same window */}
                                    {(() => {
                                        const shape = activeFigure.shape;
                                        const activeHexKeys = Object.entries(storyMap)
                                            .filter(([_, lvl]) => lvl !== undefined && lvl >= 0)
                                            .map(([key, lvl]) => {
                                                const [q, r] = key.split(',').map(Number);
                                                return { q, r, lvl };
                                            });
                                        
                                        let bestMatchCount = 0;
                                        for (const anchor of activeHexKeys) {
                                            let matchedCount = 0;
                                            for (const pt of shape) {
                                                const targetKey = getHexKey(anchor.q + pt.q, anchor.r + pt.r);
                                                const targetLvl = storyMap[targetKey];
                                                const reqLvl = pt.lvl !== undefined ? pt.lvl : 0;
                                                if (targetLvl !== undefined && targetLvl >= 0 && targetLvl === reqLvl) {
                                                    matchedCount++;
                                                }
                                            }
                                            if (matchedCount > bestMatchCount) {
                                                bestMatchCount = matchedCount;
                                            }
                                        }
                                        
                                        const percentage = shape.length > 0 ? Math.round((bestMatchCount / shape.length) * 100) : 0;
                                        
                                        return (
                                            <div className="flex flex-col gap-2 bg-slate-900/40 border border-white/5 rounded-xl p-3 mb-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[8.5px] font-black text-cyan-400 uppercase tracking-widest">
                                                        {language === 'RU' ? 'АНАЛИЗ ПОЛЯ И СОВПАДЕНИЯ' : 'FIELD CHECK & ALIGNMENT'}
                                                    </span>
                                                    <span className="text-white font-mono font-black text-[10px]">{percentage}%</span>
                                                </div>
                                                
                                                {/* Progress bar container */}
                                                <div className="w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden p-[1px] border border-white/5 mb-1">
                                                    <motion.div 
                                                        className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full"
                                                        animate={{ width: `${percentage}%` }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-[8px] font-mono border-t border-white/5 pt-1.5">
                                                    <div>
                                                        <span className="text-slate-500 font-bold block">{language === 'RU' ? 'ПОСТРОЕНО ГЕКСОВ:' : 'HEXES BUILT:'}</span>
                                                        <span className="text-white font-black">{activeHexKeys.length}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500 font-bold block">{language === 'RU' ? 'СОВПАЛО С ЧЕРТЕЖОМ:' : 'SUCCESSFULLY ALIGNED:'}</span>
                                                        <span className="text-cyan-400 font-black">{bestMatchCount} / {shape.length}</span>
                                                    </div>
                                                </div>

                                                <div className="text-[8px] font-sans border-t border-white/5 pt-1.5 leading-normal">
                                                    {percentage === 100 ? (
                                                        <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                                                            <span>
                                                                {language === 'RU' ? 'СТРУКТУРА СОВПАДАЕТ!' : 'ALIGNMENT COMPLETE!'}
                                                            </span>
                                                        </div>
                                                    ) : percentage > 0 ? (
                                                        <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                            <span>
                                                                {language === 'RU' ? `Достройте элементы до требуемых высот.` : `Place matching height levels.`}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-slate-500 italic font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                                                            <span>
                                                                {language === 'RU' ? 'Разместите детали на игровом поле.' : 'Begin placing coordinates.'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {tabletTab === 'rules' && (
                                <div className="flex flex-col text-left mb-3.5">
                                    {/* Header Info */}
                                    <div className="mb-2.5">
                                        <h3 className="text-[12px] font-black text-white uppercase tracking-tight leading-tight mb-0.5">
                                            {language === 'RU' ? activeFigure.nameRU : activeFigure.nameEN}
                                        </h3>
                                        <p className="text-slate-400 text-[9.5px] leading-relaxed font-sans font-medium line-clamp-2">
                                            {language === 'RU' ? activeFigure.descRU : activeFigure.descEN}
                                        </p>
                                    </div>

                                    {/* Step Guidelines Panel */}
                                    <div className="p-2.5 bg-slate-950/40 border border-white/5 rounded-xl flex flex-col gap-2 text-[8px] text-slate-400 font-sans leading-relaxed font-medium">
                                        <div className="text-[7px] font-black text-indigo-400 tracking-wider uppercase mb-0.5">
                                            {language === 'RU' ? 'РУКОВОДСТВО ПО СТРОИТЕЛЬСТВУ' : 'CONSTRUCTION GUIDE RULES'}
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-[7px] font-black text-cyan-400 shrink-0">1</span>
                                            <div>
                                                <span className="text-slate-200 font-bold block">
                                                    {language === 'RU' ? 'Шаг 1. Запуск основы' : '1. Anchor Base'}
                                                </span>
                                                <span>
                                                    {language === 'RU' ? 'Размещайте гексы уровня 0 (с цифрой 0 в центре — голубой цвет) кликом на пустые ячейки.' : 'Place level 0 hexes (digit 0 inside — cyan color) by clicking on empty gray cells on the field.'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center text-[7px] font-black text-purple-400 shrink-0">2</span>
                                            <div>
                                                <span className="text-slate-200 font-bold block">
                                                    {language === 'RU' ? 'Шаг 2. Подъем высоты' : '2. Elevate Heights'}
                                                </span>
                                                <span>
                                                    {language === 'RU' ? 'Повышайте высоту добавленных гексов кнопкой "Upgrade" за материалы, проверяя нужный цвет уровня.' : 'Use "Upgrade" with material to raise the hex to the target height level matching the blueprint.'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-500/30 flex items-center justify-center text-[7px] font-black text-amber-400 shrink-0">3</span>
                                            <div>
                                                <span className="text-slate-200 font-bold block">
                                                    {language === 'RU' ? 'Шаг 3. Соседняя поддержка для уровня 2 и выше' : '3. Neighbor Support Scaffold'}
                                                </span>
                                                <span>
                                                    {language === 'RU' ? 'Помните, для подъема гекса до уровня 2 и выше (цифры 2-9) требуется, чтобы рядом было не менее 2-х гексов такой же высоты!' : 'Structures at level 2 and above (digits 2-9) need at least 2 adjacent neighbor hexes of that height to be stable!'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Claim & Completion Action Button (Appeared only during final complete phase) */}
                            {isAnimatingCompletion && (
                                <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="w-full py-2.5 bg-cyan-950/45 border border-cyan-500/35 text-cyan-400 font-extrabold uppercase text-[8.5px] tracking-widest rounded-xl text-center flex items-center justify-center gap-2 animate-pulse select-none shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                        <span>{language === 'RU' ? 'ФИГУРА ВЫПОЛНЕНА! (+1 SP)' : 'STRUCTURE COMPLETED! (+1 SP)'}</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* BOTTOM CONTENT - Compact Inventory Carousel with floating SP island */}
                <div className="mt-auto flex flex-col items-center justify-end pointer-events-none pt-4 w-full max-w-5xl mx-auto px-4 md:px-0 select-none pb-2">
                    
                    {/* "Levels" (Уровни) button precisely in the empty region specified */}
                    {!isUiHidden && (
                        <motion.button
                            id="tutorial-levels-btn"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            onClick={() => { playUiSound('CLICK'); setUIState('CAMPAIGN_MAP'); }}
                            className="pointer-events-auto mb-3 px-6 py-2.5 bg-gradient-to-r from-slate-900/90 via-indigo-950/90 to-slate-900/90 border border-indigo-500/30 hover:border-indigo-400 text-indigo-200 hover:text-white rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] backdrop-blur-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        >
                            <Map className="w-4 h-4 text-indigo-400 animate-pulse" />
                            <span>{language === 'RU' ? 'Карта уровней' : 'Levels Map'}</span>
                        </motion.button>
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
                        <div id="tutorial-shape-list" className="w-full bg-slate-950/45 border rounded-2xl p-2 backdrop-blur-xl animate-border-glow-premium relative overflow-hidden transition-all duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500/20 to-transparent" />
                            
                            {/* Carousel Wrapper */}
                            <div className="relative flex items-center w-full px-5">
                                
                                {/* Left Scroll Command */}
                                <button
                                    onClick={handleScrollLeft}
                                    style={{
                                        paddingLeft: '0px',
                                        marginLeft: '-8px'
                                    }}
                                    className="absolute left-0 z-20 w-6 h-6 rounded-lg bg-[#0c132c]/90 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95 cursor-pointer"
                                    title={language === 'RU' ? 'Назад' : 'Prev'}
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                </button>

                                {/* Scrolling container */}
                                <div 
                                    ref={carouselRef}
                                    className="w-full flex flex-row gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-nowrap scroll-smooth"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {Array.from({ length: 10 }).map((_, lvl) => {
                                        const qty = minedInSessionHexes[lvl] || 0;
                                        const isSelected = selectedBuildLevel === lvl;
                                        const theme = THEME_PALETTE[String(lvl)] || THEME_PALETTE['0'];
                                        const isPlaceable = placeableLevels.has(lvl);
                                        
                                        // Dynamic tooltip descriptions
                                        const tooltipText = qty <= 0
                                            ? (language === 'RU' ? 'Нет в наличии' : 'Out of stock')
                                            : isPlaceable
                                                ? (language === 'RU' ? `Уровень ${lvl}: готов к установке` : `Level ${lvl}: ready to place`)
                                                : (language === 'RU' ? `Уровень ${lvl} (Недоступно): постройте сначала опорные блоки` : `Level ${lvl} (Locked): build parent support blocks first`);

                                        return (
                                            <button
                                                key={lvl}
                                                onClick={() => { playUiSound('CLICK'); setSelectedBuildLevel(lvl); }}
                                                title={tooltipText}
                                                className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl border text-center transition-all w-13 h-17 relative cursor-pointer outline-none group ${
                                                    isSelected
                                                        ? isPlaceable
                                                            ? 'bg-indigo-950/45 border-cyan-400/70 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] scale-102 font-bold'
                                                            : 'bg-slate-950/35 border-red-500/30 text-rose-400/60 opacity-40 scale-100 brightness-[0.45] grayscale saturate-50'
                                                        : qty > 0 
                                                            ? isPlaceable 
                                                                ? 'bg-slate-950/50 border-white/5 text-slate-300 hover:bg-[#0f1530] hover:border-white/10'
                                                                : 'bg-slate-950/20 border-white/5 opacity-25 text-slate-500 scale-98 hover:opacity-40 brightness-[0.4] grayscale saturate-[20%]'
                                                            : 'bg-slate-950/10 border-white/5 opacity-10 text-slate-600 scale-95 hover:opacity-20 grayscale saturate-0 brightness-[0.3]'
                                                }`}
                                            >
                                                <div className="w-10 h-11 flex items-center justify-center select-none pointer-events-none">
                                                    {drawInventoryHex(lvl, theme)}
                                                </div>

                                                <span className={`text-[12.5px] mt-0.5 font-mono font-black leading-none tracking-tight select-none pointer-events-none ${
                                                    qty > 0 
                                                        ? isPlaceable 
                                                            ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                                                            : 'text-amber-600/30 drop-shadow-none opacity-40'
                                                        : 'text-slate-500/30'
                                                }`}>
                                                    x{qty}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right Scroll Command */}
                                <button
                                    onClick={handleScrollRight}
                                    style={{
                                        marginRight: '-8px',
                                        marginLeft: '0px'
                                    }}
                                    className="absolute right-0 z-20 w-6 h-6 rounded-lg bg-[#0c132c]/90 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95 cursor-pointer"
                                    title={language === 'RU' ? 'Вперед' : 'Next'}
                                >
                                    <ChevronRight className="w-3 h-3" />
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

            {/* HIGH TECH INTENSIVE PHYSICAL RULES */}
            <AnimatePresence>
                {isHelpOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto"
                        onClick={() => setIsHelpOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(79,70,229,0.25)] relative overflow-hidden text-left"
                        >
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                            <div className="flex justify-between items-start mb-6 z-20 relative">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/15 rounded-lg border border-indigo-500/35 text-indigo-400">
                                        <Info className="w-5 h-5 text-cyan-400 shrink-0" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none mb-1">SYSTEM_GUIDE</span>
                                        <h2 className="text-base md:text-lg font-black text-white uppercase tracking-wider leading-none">
                                            {language === 'RU' ? 'Правила Гексагона' : 'Hexagon Guide rules'}
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={() => { playUiSound('CLICK'); setIsHelpOpen(false); }} className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed relative z-20">
                                {language === 'RU' 
                                    ? 'Гексагон — это творческое логическое пространство, где вы собираете древние фигуры из гексов. Накапливайте Очки Умений для развития вашей Кампании:' 
                                    : 'The Hexagon is a sanctuary of spatial construction where you shape hex figures. Use your analytical wits to claim Skill Points and power your global campaign Upgrades:'}
                            </p>

                            <div className="space-y-4 mb-6 relative z-20 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                                <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                        {language === 'RU' ? '1. Подача ресурсов (Плитки 0 уровня)' : '1. Supply Level 0 Tiles'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Вам изначально дается 10 плиток почвы 0-го уровня. При размещении новых плиток баланс автоматически пополняется до 10 штук, так что у вас всегда есть материал! Дополнительные плитки добываются через прохождение уровней в режиме Кампании.'
                                            : 'You receive 10 level 0 tiles initially. Placement consumes a block, though the matrix maintains your backup buffer at 10 tiles, ensuring you never run out! Additional supply tiles are gathered by beating Simulation Campaign levels.'}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                                        {language === 'RU' ? '2. Очерёдность и Обводка' : '2. Adjacency Outline'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Первая плитка выкладывается в самый центр (0,0), который упруго мигает синим вектором. Каждая последующая должна соприкасаться с уже уложенными гексами. Все доступные для укладки клетки обводятся синим пунктиром.'
                                            : 'The first cell sits exactly at the anchor center (0,0), which glows with energetic cyan. All subsequent hexes must attach adjacent to built ones. Valid placement borders dynamically outline in dashed line.'}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
                                        {language === 'RU' ? '3. Выкладывание по чертежам или случайно' : '3. Blueprint or Organic Shape'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Каждая фигура имеет фиолетовый призрак-чертёж на поле. Вы можете собрать её строго по чертежу вокруг центра, а можете случайно разместить где угодно в стороне. Как только нужная форма совпадёт — она будет засчитана!'
                                            : 'Each figure renders as a faint purple holographic ghost blueprint at the center. You can shape it on coordinates or organically assemble it anywhere offset. Once the form structure matches, the system validates it!'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => { playUiSound('CLICK'); setIsHelpOpen(false); }}
                                className="w-full bg-indigo-600/25 border border-indigo-500 text-indigo-400 hover:bg-indigo-600 hover:text-white font-black py-3 rounded-xl transition-all uppercase tracking-[0.25em] text-xs shadow-xl active:scale-98 cursor-pointer relative z-20"
                            >
                                {language === 'RU' ? 'Вернуться в игру' : 'Resume Hexopl'}
                            </button>
                        </motion.div>
                    </motion.div>
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
                                                addMinedHexes({ [currentLevel]: 1 });
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
        </div>
    );
};

export default StoryBuilderView;
