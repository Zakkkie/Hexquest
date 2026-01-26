
import { SessionState, Hex } from '../types';

export interface ScenarioHooks {
  // Check for victory condition (called every tick/action)
  // Returns true if victory achieved
  checkWinCondition?: (state: SessionState) => boolean;

  // NEW: Check for loss condition (called every tick/action)
  // Returns true if defeat condition met
  checkLossCondition?: (state: SessionState) => boolean;
  
  // Validate a move before it happens
  canMove?: (from: Hex, to: Hex, state: SessionState) => boolean;
  
  // Trigger events after an action
  onAfterAction?: (state: SessionState) => void;
}

export interface LevelConfig {
  id: string;
  title: string;
  description: string;
  
  mapConfig: {
    size: number;
    type: 'procedural' | 'fixed';
    generateWalls?: boolean; 
    wallStartRadius?: number; // Distance from center where walls begin
    wallStartLevel?: number;  // Level of the first wall ring (for classic walls)
    wallType?: 'classic' | 'void_shatter'; // Type of boundary generation
  };

  startState: {
    credits: number;
    moves: number;
    rank: number;
  };

  aiMode: 'none' | 'dummy' | 'basic';

  hooks: ScenarioHooks;
}
