// Pure frame-model layer extracted from MapRenderer.tsx (file-size split):
// objective-arrow completion rules + the per-frame render-item calculation.
// No PIXI, no store access — unit-testable.
import { Hex, Entity } from '../types.ts';
import { getHexKey } from './hexUtils.ts';
import { HEX_SIZE, getLevelConfig } from '../rules/config.ts';
import { getHeightOffset } from './pixiHexRender.ts';

export const NEIGHBOR_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, 
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export const VOID_LEVEL_FLAG = -99;

export const cubeDistance = (a: { q: number; r: number }, b: { q: number; r: number }): number => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

export const isObjectiveHexCompleted = (
    objHex: any,
    grid: Record<string, Hex> | undefined,
    player: Entity | undefined,
    activeLevelId: string | undefined,
    activatedMiniMonuments: string[] | undefined,
    portalActive: boolean | undefined
): boolean => {
    if (!grid || !player) return false;
    const hexKey = `${objHex.q},${objHex.r}`;
    const gridCell = grid[hexKey];

    // If it's a MINI_MONUMENT (Obelisk), check if it's already activated in state
    if (gridCell?.structureType === 'MINI_MONUMENT' || objHex.label?.toLowerCase().includes('obelisk')) {
        return !!(activatedMiniMonuments && activatedMiniMonuments.includes(hexKey));
    }

    // If it's a MONUMENT, check if the portal is already active
    if (gridCell?.structureType === 'MONUMENT' || objHex.label?.toLowerCase().includes('monument')) {
        return !!portalActive;
    }

    // Sim 1.0: Linear path
    if (activeLevelId === '1.0') {
        const waveCoords = [
            "0,0", "1,0", "2,0", "3,0", "4,0", "5,0",
            "6,0", "6,1", "5,2", "4,3", "3,3", "2,3", "1,3", "0,3", "-1,3", "-2,3"
        ];
        const playerIdx = waveCoords.indexOf(`${player.q},${player.r}`);
        const hexIdx = waveCoords.indexOf(hexKey);
        
        let completedByPath = false;
        if (playerIdx !== -1 && hexIdx !== -1) {
            completedByPath = playerIdx >= hexIdx;
        } else if (playerIdx !== -1 && hexIdx === -1) {
             completedByPath = true; // should not happen 
        }
        
        // However, for steps that require an action (Build at 1,0 or Dig at 3,0),
        // we shouldn't consider the hex "completed" just by being ON it, until the action is done.
        if (playerIdx === hexIdx) {
            // Player is ON the objective! Is it complete?
            if (gridCell) {
                if (objHex.label === 'Build') {
                    if (gridCell.currentLevel < objHex.targetLevel) return false;
                }
                if (objHex.label === 'Dig') {
                    if (gridCell.currentLevel > objHex.targetLevel) return false;
                }
            }
            return true;
        }

        return completedByPath;
    }

    // Sim 1.1: Wave path checkpoints
    if (activeLevelId === '1.1') {
        if (objHex.label === 'Capital' || objHex.color === 'emerald') {
            return player.q === objHex.q && player.r === objHex.r;
        }
        if (gridCell && objHex.targetLevel) {
            return gridCell.currentLevel >= objHex.targetLevel;
        }
    }

    // Sim 1.2: Reach Capital
    if (activeLevelId === '1.2') {
        if (objHex.label === 'Goal') {
            return gridCell ? gridCell.currentLevel <= 0 : false;
        }
    }

    // Sim 1.3: Recovery & Reactor
    if (activeLevelId === '1.3') {
        if (player.coins >= 15) return true;
        if (objHex.q === 0 && objHex.r === 0) {
            const reactor = grid['0,0'];
            return (reactor?.recoveryCharges ?? 0) === 0;
        }
        const hexKey = `${objHex.q},${objHex.r}`;
        const hex = grid[hexKey];
        if (hex) {
            if (player.q === objHex.q && player.r === objHex.r && player.recoveredCurrentHex) return true;
            if (hex.lastRecoveryUseTime && hex.lastRecoveryUseTime > 0) return true;
        }
        return false;
    }

    // Sim 1.5: Heal / Deep Mine
    if (activeLevelId === '1.5') {
        if (objHex.label === 'Heal') {
            return gridCell ? gridCell.structureType !== 'VOID' : false;
        }
        if (objHex.label === 'Deep Mine') {
            return gridCell ? gridCell.currentLevel <= -2 : false;
        }
    }

    // Sim 1.6: Reach Capital
    if (activeLevelId === '1.6') {
        if (objHex.label === 'Capital') {
            return player.q === objHex.q && player.r === objHex.r;
        }
    }

    // Rift-repair objectives (1.9 and the generated restoreRift levels): met when
    // the hex is no longer VOID. Label-based so every level using 'Rift' markers
    // gets the correct arrow without a per-id branch.
    if (objHex.label === 'Rift') {
        return !!gridCell && gridCell.structureType !== 'VOID';
    }

    // Sim 1.5 (Heal rift): same rift-repair semantics — met once the hex is no
    // longer VOID.
    if (activeLevelId === '1.5' && objHex.label === 'Heal') {
        return !!gridCell && gridCell.structureType !== 'VOID';
    }

    // Default construction or excavation behavior
    if (gridCell) {
        if (objHex.targetLevel > 0) {
            return gridCell.currentLevel >= objHex.targetLevel;
        } else if (objHex.targetLevel < 0) {
            return gridCell.currentLevel <= objHex.targetLevel;
        } else {
            // targetLevel === 0
            if (objHex.label === 'Goal' || objHex.label === 'Capital' || objHex.color === 'emerald') {
                return player.q === objHex.q && player.r === objHex.r;
            }
            return gridCell.currentLevel === 0;
        }
    }

    return false;
};

export const runLocalRenderCalculation = (
    grid: Record<string, Hex> | undefined,
    player: Entity | undefined,
    bots: Entity[] | undefined,
    rotation: number,
    pendingKey: string | null,
    selectedHexId: string | null,
    camera: { x: number; y: number; scale: number; rotation: number } | undefined,
    dimensions: { width: number; height: number } | undefined,
    isCampaign: boolean,
    playerGrowthIntent?: 'RECOVER' | 'UPGRADE' | 'DIG' | 'TURRET' | null,
    isDefenseMode?: boolean,
    forceReveal?: boolean
): any[] => {
    if (!grid || !player) return [];

    const items: any[] = [];

    const angleRad = rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;
    const ONE_POINT_FIVE = 1.5;

    const botPositions = new Set<string>();
    if (bots) {
        for (const b of bots) {
            botPositions.add(`${b.q},${b.r}`);
        }
    }

    const playerQ = player.q;
    const playerR = player.r;

    const playerOwnedHexes = isDefenseMode
        ? Object.values(grid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore)
        : [];

    for (const hexId in grid) {
        const hex = grid[hexId];
        const hq = hex.q;
        const hr = hex.r;
        const distToPlayer = cubeDistance({ q: playerQ, r: playerR }, { q: hq, r: hr });
        
        let isRevealed = !!hex.revealed || !!forceReveal;
        let finalVisibility = 0;

        if (isDefenseMode || forceReveal) {
            isRevealed = true;
            finalVisibility = 1.0;
        } else {
            if (distToPlayer > 5) continue;
            
            if (distToPlayer <= 2) {
                finalVisibility = 1.0;
            } else if (distToPlayer === 3) {
                finalVisibility = 0.70;
            } else if (distToPlayer === 4) {
                finalVisibility = 0.40;
            } else if (distToPlayer === 5) {
                finalVisibility = 0.15;
            }
        }

        const finalOpacity = finalVisibility;
        const finalLighting = finalVisibility;

        if (finalOpacity <= 0) continue;

        const rawX = HEX_SIZE * (SQRT3 * hq + SQRT3_2 * hr);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * hr);
        
        if (camera && dimensions) {
            const x = rawX * cos - rawY * sin;
            const y = (rawX * sin + rawY * cos) * 0.8;
            
            const screenX = camera.x + x * camera.scale;
            const screenY = camera.y + y * camera.scale;
            
            const margin = HEX_SIZE * 4.0;
            const scaledMargin = margin * camera.scale;
            
            if (
                screenX < -scaledMargin ||
                screenX > dimensions.width + scaledMargin ||
                screenY < -scaledMargin ||
                screenY > dimensions.height + scaledMargin
            ) {
                continue;
            }
        }

        const baseDepth = (rawX * sin + rawY * cos) * 0.8;
        const depth = baseDepth + (hex.currentLevel || 0) * 0.01;

        const isVoid = hex.structureType === 'VOID';
        const currentLevel = hex.currentLevel ?? 0;
        const offsetY = getHeightOffset(currentLevel);

        const isOccupiedByPlayer = hq === playerQ && hr === playerR;
        const neighborLevels = NEIGHBOR_DIRECTIONS.map(d => {
            const nKey = getHexKey(hq + d.q, hr + d.r);
            const nHex = grid[nKey];
            if (!nHex || (!nHex.revealed && !forceReveal)) return VOID_LEVEL_FLAG;
            if (nHex.structureType === 'VOID') return VOID_LEVEL_FLAG;
            return nHex.currentLevel ?? 0;
        });

        let calculatedProgress = 0;
        if (isRevealed && hex.progress > 0 && !isVoid) {
            let needed = 30; // fallback
            const actingEntity = (player && player.q === hq && player.r === hr)
                ? player
                : bots?.find((b: any) => b.q === hq && b.r === hr);

            if (actingEntity) {
                let intent: 'UPGRADE' | 'RECOVER' | 'DIG' | 'TURRET' | null = null;
                if (actingEntity.type === 'PLAYER') {
                    intent = playerGrowthIntent || null;
                } else {
                    const nextInQueue = actingEntity.movementQueue?.[0];
                    if (nextInQueue && nextInQueue.intent) {
                        intent = nextInQueue.intent;
                    } else if (actingEntity.memory?.plan?.steps?.[0]?.type) {
                        const stepType = actingEntity.memory.plan.steps[0].type;
                        if (stepType === 'UPGRADE') intent = 'UPGRADE';
                        else if (stepType === 'DIG') intent = 'DIG';
                        else if (stepType === 'RECOVER') intent = 'RECOVER';
                    }
                }

                if (intent) {
                    const activeStatuses = actingEntity.activeStatuses || [];
                    const hasScannerBuff = activeStatuses.some((s: any) => s.type === 'STATUS_SCANNER_BUFF');
                    const hasGodMode = activeStatuses.some((s: any) => s.type === 'GOD_MODE');
                    const growthAccelerator = hasGodMode ? 10 : (hasScannerBuff ? 2 : 0);

                    if (intent === 'RECOVER') {
                        const config = getLevelConfig(hex.maxLevel);
                        needed = config.growthTime;
                    } else if (intent === 'DIG') {
                        const curLvl = hex.currentLevel ?? 0;
                        const baseSecs = curLvl >= 1 ? (curLvl + 2) : 3;
                        const baseTicks = baseSecs * 10;
                        needed = actingEntity.type !== 'PLAYER' ? baseTicks : Math.max(10, baseTicks - (growthAccelerator * 5));
                    } else if (intent === 'UPGRADE') {
                        const config = getLevelConfig(hex.currentLevel + 1);
                        needed = Math.max(10, config.growthTime - (growthAccelerator * 5));
                    } else if (intent === 'TURRET') {
                        needed = 40;
                    }
                }
            }
            calculatedProgress = Math.min(1.0, hex.progress / needed);
        }

        items.push({
            type: 'HEX',
            depth: depth,
            id: hexId,
            props: {
                x: rawX, y: rawY,
                q: hq, r: hr,
                id: hexId,
                offsetY: isRevealed ? offsetY : -10,
                level: isRevealed ? currentLevel : 0,
                maxLevel: isRevealed ? hex.maxLevel : 0,
                structureType: isRevealed ? (hex.structureType as string) : 'NONE',
                neighborLevels: isRevealed ? neighborLevels : [0,0,0,0,0,0],
                isSelected: selectedHexId === hexId,
                isPending: hexId === pendingKey,
                isOccupied: isRevealed && (isOccupiedByPlayer || botPositions.has(`${hq},${hr}`)),
                isGrowing: isRevealed && hex.progress > 0 && !isVoid,
                isRankLocked: isRevealed && currentLevel > player.playerLevel,
                progress: calculatedProgress,
                durability: isRevealed ? hex.durability : 0,
                artifactType: isRevealed ? hex.artifact?.type : undefined,
                biome: isRevealed ? hex.biome : undefined,
                poiType: isRevealed ? hex.poiType : undefined,
                hologramTargetLevel: isRevealed ? hex.hologramTargetLevel : undefined,
                isPassable: hex.isPassable,
                isRevealed: isRevealed,
                opacity: finalOpacity,
                lighting: finalLighting
            }
        });
    }

    const allEntities = [{ ...player, isPlayer: true }, ...(bots || []).map((b: any) => ({ ...b, isPlayer: false }))];
    const playerPos = { q: playerQ, r: playerR };

    for (const u of allEntities) {
        let uOpacity = 1.0;
        const uQ = u.q;
        const uR = u.r;

        if (!u.isPlayer) {
            if (isDefenseMode || forceReveal) {
                uOpacity = 1.0;
            } else {
                const uHex = grid[getHexKey(uQ, uR)];
                const isRevealed = uHex ? uHex.revealed : false;
                if (!isRevealed && !forceReveal) continue;

                const distToPlayer = cubeDistance({ q: uQ, r: uR }, playerPos);
                if (distToPlayer <= 2) {
                    uOpacity = 1.0;
                } else if (distToPlayer === 3) {
                    uOpacity = 0.85;
                } else if (distToPlayer === 4) {
                    uOpacity = 0.65;
                } else if (distToPlayer === 5) {
                    uOpacity = 0.45;
                } else {
                    uOpacity = 0.30;
                }
            }
        }

        const rawX = HEX_SIZE * (SQRT3 * uQ + SQRT3_2 * uR);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * uR);
        
        if (camera && dimensions) {
            const x = rawX * cos - rawY * sin;
            const y = (rawX * sin + rawY * cos) * 0.8;
            const screenX = camera.x + x * camera.scale;
            const screenY = camera.y + y * camera.scale;
            const margin = HEX_SIZE * 4.0;
            const scaledMargin = margin * camera.scale;
            if (
                screenX < -scaledMargin ||
                screenX > dimensions.width + scaledMargin ||
                screenY < -scaledMargin ||
                screenY > dimensions.height + scaledMargin
            ) {
                continue;
            }
        }

        const baseDepth = (rawX * sin + rawY * cos) * 0.8;
        const uHex = grid[getHexKey(uQ, uR)];
        const hLevel = uHex ? (uHex.currentLevel ?? 0) : 0;
        const depthBias = 1; 

        items.push({
            type: 'UNIT',
            depth: baseDepth + depthBias,
            id: u.id,
            props: {
                id: u.id,
                q: uQ, r: uR,
                x: rawX, y: rawY,
                isPlayer: u.isPlayer,
                color: u.avatarColor,
                hexLevel: hLevel,
                totalCoinsEarned: u.totalCoinsEarned,
                upgradePointCount: u.recentUpgrades?.length || 0,
                headIndex: u.headIndex,
                bodyIndex: u.bodyIndex,
                opacity: uOpacity,
                type: u.type
            }
        });
    }

    items.sort((a, b) => {
        const depthDiff = a.depth - b.depth;
        if (depthDiff !== 0) return depthDiff;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });

    return items;
};

export const isFinishTile = (q: number, r: number, activeLevelConfig: any): boolean => {
    if (!activeLevelConfig) return false;
    if (activeLevelConfig.id === '1.0' && q === -2 && r === 3) return true;
    if (activeLevelConfig.id === '1.1' && q === -10 && r === 0) return true;
    if (activeLevelConfig.id === '1.2' && q === 0 && r === 0) return true;
    if (activeLevelConfig.id === '1.3' && q === 0 && r === 0) return true;
    if (activeLevelConfig.id === '1.5' && q === 0 && r === 0) return true;
    if (activeLevelConfig.id === '1.6' && q === 8 && r === 0) return true;

    // Generic check for other levels:
    // If there is an objectiveHex with color 'emerald' or containing 'capital' / 'portal' / 'goal' / 'exit' / 'finish' in its label
    const objFinish = activeLevelConfig.objectiveHexes?.find((o: any) => {
        const lbl = o.label?.toLowerCase() || '';
        return o.color === 'emerald' || 
               lbl.includes('capital') || 
               lbl.includes('portal') || 
               lbl.includes('goal') || 
               lbl.includes('exit') || 
               lbl.includes('finish') ||
               lbl.includes('endpoint');
    });
    if (objFinish && objFinish.q === q && objFinish.r === r) return true;

    return false;
};

export const areAllConditionsMet = (
    session: any,
    activeLevelConfig: any
): boolean => {
    if (!session || !activeLevelConfig) return false;

    // 1. If it's a monument-based portal level (like Series 2, 3, 4 etc.)
    // the monument portal is active when state.portalActive is true
    const hasMonument = Object.values(session.grid || {}).some((h: any) => h.structureType === 'MONUMENT');
    if (hasMonument) {
        return !!session.portalActive;
    }

    // 2. If the level has required shapes, check if they are built
    if (activeLevelConfig.requiredShapes && activeLevelConfig.requiredShapes.length > 0) {
        return !!(session.completedShapeCoords && session.completedShapeCoords.length > 0);
    }

    // 3. If there are objectiveHexes
    if (activeLevelConfig.objectiveHexes && activeLevelConfig.objectiveHexes.length > 0) {
        const nonFinishObjectives = activeLevelConfig.objectiveHexes.filter((o: any) => {
            const labelLower = o.label?.toLowerCase() || '';
            const isFinishObj = labelLower.includes('capital') || 
                                labelLower.includes('portal') || 
                                labelLower.includes('goal') || 
                                o.color === 'emerald';
            return !isFinishObj;
        });

        if (nonFinishObjectives.length > 0) {
            const allPreCompleted = nonFinishObjectives.every((o: any) => 
                isObjectiveHexCompleted(o, session.grid, session.player, activeLevelConfig.id, session.activatedMiniMonuments, session.portalActive)
            );
            if (!allPreCompleted) return false;
        }
    }

    // 4. Simulate the player standing on the finish tile and checking win conditions
    if (activeLevelConfig.hooks?.checkWinCondition) {
        let finishQ = session.player.q;
        let finishR = session.player.r;

        if (activeLevelConfig.id === '1.0') { finishQ = -2; finishR = 3; }
        else if (activeLevelConfig.id === '1.1') { finishQ = -10; finishR = 0; }
        else if (activeLevelConfig.id === '1.2') { finishQ = 0; finishR = 0; }
        else if (activeLevelConfig.id === '1.3') { finishQ = 0; finishR = 0; }
        else if (activeLevelConfig.id === '1.5') { finishQ = 0; finishR = 0; }
        else if (activeLevelConfig.id === '1.6') { finishQ = 8; finishR = 0; }
        else {
            const emeraldObj = activeLevelConfig.objectiveHexes?.find((o: any) => o.color === 'emerald' || o.label?.toLowerCase().includes('portal') || o.label?.toLowerCase().includes('capital'));
            if (emeraldObj) {
                finishQ = emeraldObj.q;
                finishR = emeraldObj.r;
            }
        }

        const simState = {
            ...session,
            player: {
                ...session.player,
                q: finishQ,
                r: finishR
            }
        };

        try {
            return !!activeLevelConfig.hooks.checkWinCondition(simState);
        } catch (e) {
            return true;
        }
    }

    return true;
};

