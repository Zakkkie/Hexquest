
import { Hex, HexCoord } from '../types';
import { HEX_SIZE } from '../rules/config';
import { textureService } from './textureService';
import { safifyCoord } from '../utils/safeCoordinates';
import { getNeighbors, getHexKey, pixelToHex } from './hexUtils';

const DEG_TO_RAD = Math.PI / 180;
const VOID_LEVEL_FLAG = -99;

// Visual Constants reused from HexNode logic
const THEME_PALETTE: Record<string, { main: string, dark: string, stroke: string }> = {
    '0': { main: '#1e293b', dark: '#0f172a', stroke: '#475569' }, 
    '1': { main: '#0f172a', dark: '#020617', stroke: '#0c4a6e' }, 
    '2': { main: '#172554', dark: '#0f172a', stroke: '#0284c7' }, 
    '3': { main: '#1e3a8a', dark: '#172554', stroke: '#0ea5e9' }, 
    '4': { main: '#312e81', dark: '#1e1b4b', stroke: '#6366f1' }, 
    '5': { main: '#4c1d95', dark: '#2e1065', stroke: '#8b5cf6' }, 
    '6': { main: '#581c87', dark: '#3b0764', stroke: '#a855f7' }, 
    '7': { main: '#701a75', dark: '#4a044e', stroke: '#d946ef' }, 
    '8': { main: '#451a03', dark: '#271a0c', stroke: '#d97706' }, 
    '9': { main: '#713f12', dark: '#422006', stroke: '#f59e0b' }, 
    '10': { main: '#854d0e', dark: '#713f12', stroke: '#fcd34d' }, 
    '-1': { main: '#292524', dark: '#1c1917', stroke: '#57534e' }, 
    '-2': { main: '#1c1917', dark: '#0c0a09', stroke: '#44403c' }, 
    '-3': { main: '#0c0a09', dark: '#000000', stroke: '#292524' }, 
    '-4': { main: '#450a0a', dark: '#2a0505', stroke: '#991b1b' }, 
    '-5': { main: '#7f1d1d', dark: '#450a0a', stroke: '#dc2626' }, 
    '-6': { main: '#991b1b', dark: '#7f1d1d', stroke: '#ef4444' }, 
    '-7': { main: '#c2410c', dark: '#7c2d12', stroke: '#f97316' }, 
    '-8': { main: '#fff7ed', dark: '#c2410c', stroke: '#ffffff' },
};

const getTheme = (level: number) => {
    if (level > 8) return THEME_PALETTE['10'];
    if (level < -8) return THEME_PALETTE['-8'];
    const key = String(level);
    if (THEME_PALETTE[key]) return THEME_PALETTE[key];
    if (level > 0) {
        if (level <= 3) return THEME_PALETTE['1'];
        if (level <= 7) return THEME_PALETTE['4'];
        return THEME_PALETTE['8'];
    } 
    if (level < 0) {
        if (level >= -3) return THEME_PALETTE['-1'];
        if (level >= -7) return THEME_PALETTE['-4'];
        return THEME_PALETTE['-8'];
    }
    return THEME_PALETTE['0'];
};

const getHeightOffset = (level: number) => {
    if (level <= VOID_LEVEL_FLAG) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

// Projection Helpers
const SQRT3 = Math.sqrt(3);
const SQRT3_2 = SQRT3 / 2;
const ONE_POINT_FIVE = 1.5;
const MAX_WALL_DEPTH = HEX_SIZE * 4;

interface RenderItem {
    hex: Hex;
    x: number;
    y: number;
    offsetY: number;
    depth: number;
}

export class StaticGridRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    }

    public getCanvas() {
        return this.canvas;
    }

    private getVisibleBounds(viewState: { x: number; y: number; scale: number; rotation: number }, dimensions: { width: number; height: number }) {
        const { x: camX, y: camY, scale, rotation } = viewState;
        const { width, height } = dimensions;

        // Invert transform to get local coordinates for corners
        // Local = (Screen - Translate) / Scale
        // We add a safety margin (e.g. -100) to ensure we cover partial hexes
        const MARGIN = 100;
        const topLeft = { x: (0 - MARGIN - camX) / scale, y: (0 - MARGIN - camY) / scale };
        const topRight = { x: (width + MARGIN - camX) / scale, y: (0 - MARGIN - camY) / scale };
        const bottomLeft = { x: (0 - MARGIN - camX) / scale, y: (height + MARGIN - camY) / scale };
        const bottomRight = { x: (width + MARGIN - camX) / scale, y: (height + MARGIN - camY) / scale };

        const corners = [topLeft, topRight, bottomLeft, bottomRight];
        const hexes = corners.map(p => pixelToHex(p.x, p.y, rotation));

        let qMin = Infinity, qMax = -Infinity, rMin = Infinity, rMax = -Infinity;
        
        hexes.forEach(h => {
            qMin = Math.min(qMin, h.q);
            qMax = Math.max(qMax, h.q);
            rMin = Math.min(rMin, h.r);
            rMax = Math.max(rMax, h.r);
        });

        // Add padding for hex size + walls (vertical height)
        const PADDING = 3; 

        return {
            qMin: Math.floor(qMin) - PADDING,
            qMax: Math.ceil(qMax) + PADDING,
            rMin: Math.floor(rMin) - PADDING,
            rMax: Math.ceil(rMax) + PADDING
        };
    }

    public render(
        grid: Record<string, Hex>,
        viewState: { x: number; y: number; scale: number; rotation: number },
        dimensions: { width: number; height: number },
        selectedHexId: string | null,
        hoveredHexId: string | null
    ) {
        // 1. Resize Canvas to Viewport with DPR Support
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = dimensions.width;
        const logicalHeight = dimensions.height;
        const pixelWidth = logicalWidth * dpr;
        const pixelHeight = logicalHeight * dpr;

        if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
            this.canvas.width = pixelWidth;
            this.canvas.height = pixelHeight;
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Apply DPR scale to context
        this.ctx.resetTransform();
        this.ctx.scale(dpr, dpr);

        const { x: camX, y: camY, scale, rotation } = viewState;
        
        // Trigonometry for Rotation
        const angleRad = rotation * DEG_TO_RAD;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // Precompute projection for Culling & Sorting
        const renderList: RenderItem[] = [];
        
        // Frustum Culling Optimization: Iterate only visible bounds
        const bounds = this.getVisibleBounds(viewState, dimensions);

        for (let q = bounds.qMin; q <= bounds.qMax; q++) {
            for (let r = bounds.rMin; r <= bounds.rMax; r++) {
                const key = getHexKey(q, r);
                const hex = grid[key];
                
                if (!hex || !hex.revealed) continue;
            
                // Raw Hex Position
                const rawX = HEX_SIZE * (SQRT3 * hex.q + SQRT3_2 * hex.r);
                const rawY = HEX_SIZE * (ONE_POINT_FIVE * hex.r);

                // Rotated & Squashed Position (Screen Space relative to camera center 0,0)
                const rx = rawX * cos - rawY * sin;
                const ry = (rawX * sin + rawY * cos) * 0.8;

                // Final Screen Position
                const screenX = (rx * scale) + camX;
                const screenY = (ry * scale) + camY;

                // Note: Standard frustum culling check removed here as bounding box iteration handles it more efficiently
                // though edge hexes might still be slightly offscreen, which is fine.

                const level = (hex.structureType as string) === 'VOID' ? 0 : hex.maxLevel;
                const offsetY = (hex.structureType as string) === 'VOID' ? -2 : getHeightOffset(level);

                renderList.push({
                    hex,
                    x: screenX,
                    y: screenY,
                    offsetY: offsetY * scale, // Scale height too!
                    depth: screenY // Sort by screen Y for correct occlusion
                });
            }
        }

        // Sort Painter's Algorithm (Back to Front)
        renderList.sort((a, b) => a.depth - b.depth);

        // --- DRAWING LOOP ---
        this.ctx.save();
        // Since we calculated screen coordinates manually including scale/translate, 
        // we don't apply camera transform here. We are drawing in Screen Space.

        for (const item of renderList) {
            this.drawHex(item, scale, rotation, selectedHexId, hoveredHexId, grid);
        }

        this.ctx.restore();
    }

    private drawHex(
        item: RenderItem, 
        scale: number, 
        rotation: number, 
        selectedId: string | null, 
        hoveredId: string | null,
        grid: Record<string, Hex>
    ) {
        const { hex, x, y, offsetY } = item;
        const ctx = this.ctx;
        
        const size = HEX_SIZE * scale;
        const isVoid = hex.structureType === 'VOID';
        const isMonument = hex.structureType === 'MONUMENT';
        const isSelected = hex.id === selectedId;
        const isHovered = hex.id === hoveredId;
        const level = hex.maxLevel;
        
        const theme = getTheme(level);
        const strokeColor = isMonument ? '#fcd34d' : theme.stroke;
        
        // --- 1. WALLS (Sides) ---
        // Calculate corner points
        const corners = [];
        const topY = y + offsetY;
        const angleOffset = rotation * DEG_TO_RAD;

        for (let i = 0; i < 6; i++) {
            const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
            corners.push({
                x: x + Math.cos(angle) * size,
                y: topY + Math.sin(angle) * size * 0.8 // Squash factor applied to radius
            });
        }

        // Draw Walls only where needed (Neighbor Occlusion)
        if (!isVoid) {
            const texture = textureService.getSideTexture(level);
            const pat = texture ? ctx.createPattern(texture, 'repeat') : null;
            const neighbors = getNeighbors(hex.q, hex.r);

            for (let i = 0; i < 6; i++) {
                const next = (i + 1) % 6;
                // Wall culling: only draw if this face is visible to camera
                const midAngle = (60 * i + 60) * DEG_TO_RAD + angleOffset;
                const isFrontFacing = Math.sin(midAngle) > 0;
                if (!isFrontFacing) continue;

                // Neighbor Height Check
                const nbCoord = neighbors[i];
                const nbKey = getHexKey(nbCoord.q, nbCoord.r);
                const nbHex = grid[nbKey];
                
                // Determine neighbor visual height (Y offset)
                let nY = 0; // Default flat ground
                
                if (!nbHex) {
                    // Edge of map: treat as -infinite (draw full wall)
                    nY = Infinity; // Lower Y is higher up. Infinity is way down.
                } else if (nbHex.structureType === 'VOID') {
                    // Void neighbors are "deep", draw full wall down to some limit
                    nY = offsetY + (MAX_WALL_DEPTH * scale); 
                } else {
                    const nbLevel = nbHex.maxLevel;
                    // Calculate Y offset for neighbor
                    const nbRawOffsetY = getHeightOffset(nbLevel);
                    nY = y + (nbRawOffsetY * scale);
                }

                // If my top (topY) is visually "below" neighbor top (nY), I am taller.
                // Remember: Canvas Y increases downwards. Negative OffsetY means UP.
                // So if (topY < nY), I am higher up than neighbor.
                
                if (topY < nY) {
                    // Determine Wall Bottom Y
                    // We draw from TopY down to nY (neighbor's top) or my own visual bottom limit
                    const myBottomLimit = topY + (MAX_WALL_DEPTH * scale);
                    const wallBottomY = Math.min(nY, myBottomLimit);
                    
                    const c1 = corners[i];
                    const c2 = corners[next];
                    
                    const height = wallBottomY - topY;
                    if (height < 1) continue; // Skip negligible walls

                    ctx.beginPath();
                    ctx.moveTo(c1.x, c1.y);
                    ctx.lineTo(c2.x, c2.y);
                    
                    // We just shift Y down by 'height'
                    // Since isometric X is constant for vertical walls
                    ctx.lineTo(c2.x, c2.y + height);
                    ctx.lineTo(c1.x, c1.y + height);
                    ctx.closePath();

                    if (pat) {
                        ctx.save();
                        // Align pattern to top-left of this wall segment to reduce swimming
                        ctx.translate(c1.x, c1.y);
                        ctx.fillStyle = pat;
                        ctx.fill();
                        ctx.restore();
                    } else {
                        ctx.fillStyle = theme.dark;
                        ctx.fill();
                    }
                    
                    ctx.strokeStyle = theme.stroke;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        // --- 2. TOP FACE ---
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
        ctx.closePath();

        // Fill
        if (isVoid) {
            ctx.fillStyle = '#020617';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.stroke();
            // Void Inner Glow
            const grad = ctx.createRadialGradient(x, topY, 0, x, topY, size);
            grad.addColorStop(0, '#000');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fill();
        } else {
            const texture = textureService.getTexture(hex.maxLevel, hex.q, hex.r);
            if (texture) {
                const pat = ctx.createPattern(texture, 'repeat');
                if (pat) {
                    ctx.fillStyle = pat;
                    ctx.save();
                    // Align texture to hex center
                    ctx.translate(x, topY); 
                    // Scale texture
                    const texScale = (HEX_SIZE * scale) / 32; 
                    ctx.scale(texScale, texScale);
                    ctx.fill();
                    ctx.restore();
                } else {
                    ctx.fillStyle = theme.main;
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = theme.main;
                ctx.fill();
            }

            // Stroke
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isMonument ? 3 : (isSelected || isHovered ? 2 : 1);
            ctx.stroke();

            // Highlight/Glow
            if (isSelected) {
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            if (isHovered) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fill();
            }
        }
        
        // Progress Bar (if growing)
        if (hex.progress > 0 && !isVoid) {
            const barW = size;
            const barH = 4 * scale;
            const progressPct = Math.min(1, hex.progress / 30);
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x - barW/2, topY - 10 * scale, barW, barH);
            
            ctx.fillStyle = hex.maxLevel > 2 ? '#f59e0b' : '#10b981';
            ctx.fillRect(x - barW/2, topY - 10 * scale, barW * progressPct, barH);
        }
    }
}
