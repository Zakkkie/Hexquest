import { HexCoord, SessionState } from '../types';
import { getHexKey } from './hexUtils';

export type ShapeType = 'LINE_3' | 'TRIANGLE_3' | 'DIAMOND_4' | 'RING_6';

export interface RequiredShape {
    type: ShapeType;
    level: number;
    hint: string;
}

// Relative configurations for shapes. We only need one starting point and relative offsets.
// We'll define all possible rotations manually or calculate them.
const SHAPE_DEFS: Record<ShapeType, HexCoord[][]> = {
    'LINE_3': [
        [{q:0, r:0}, {q:1, r:0}, {q:2, r:0}],
        [{q:0, r:0}, {q:0, r:1}, {q:0, r:2}],
        [{q:0, r:0}, {q:1, r:-1}, {q:2, r:-2}]
    ],
    'TRIANGLE_3': [
        [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}],
        [{q:0, r:0}, {q:1, r:0}, {q:1, r:-1}],
        [{q:0, r:0}, {q:0, r:1}, {q:-1, r:1}],
        [{q:0, r:0}, {q:0, r:-1}, {q:1, r:-1}],
        [{q:0, r:0}, {q:-1, r:0}, {q:-1, r:1}],
        [{q:0, r:0}, {q:-1, r:0}, {q:0, r:-1}]
    ],
    'DIAMOND_4': [
        [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}, {q:1, r:-1}],
        [{q:0, r:0}, {q:1, r:0}, {q:2, r:-1}, {q:1, r:1}],
        // simplified
    ],
    'RING_6': [
        [{q:1, r:-1}, {q:1, r:0}, {q:0, r:1}, {q:-1, r:1}, {q:-1, r:0}, {q:0, r:-1}]
    ]
};

export function checkShapeExists(state: SessionState, req: RequiredShape): boolean {
    const grid = state.grid;
    const defs = SHAPE_DEFS[req.type];
    
    for (const key in grid) {
        const hex = grid[key];
        if (hex.currentLevel < req.level) continue;
        if (hex.ownerId !== state.player.id) continue;

        // Try anchoring each definition at this hex
        for (const def of defs) {
            let match = true;
            for (const offset of def) {
                const targetQ = hex.q + offset.q;
                const targetR = hex.r + offset.r;
                const targetHex = grid[getHexKey(targetQ, targetR)];
                if (!targetHex || targetHex.currentLevel < req.level || targetHex.ownerId !== state.player.id) {
                    match = false;
                    break;
                }
            }
            if (match) return true;
        }
    }
    
    return false;
}
