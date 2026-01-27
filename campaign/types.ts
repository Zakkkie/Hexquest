
import { SessionState, Hex, GameAction, ValidationResult } from '../types';

export interface ScenarioHooks {
  // Check for victory condition (called every tick/action)
  // Returns true if victory achieved
  checkWinCondition?: (state: SessionState) => boolean;

  // Check for loss condition (called every tick/action)
  // Returns true if defeat condition met
  checkLossCondition?: (state: SessionState) => boolean;
  
  // Validate a move before it happens or provide custom feedback
  // Returns a ValidationResult. If ok=false, the action is blocked with the reason.
  onBeforeAction?: (state: SessionState, action: GameAction) => ValidationResult | null;
  
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
    wallStartRadius?: number; 
    wallStartLevel?: number;  
    wallType?: 'classic' | 'void_shatter'; 
    
    // NEW: Allow explicit hex definitions for puzzle levels
    customLayout?: Partial<Hex>[];
  };

  startState: {
    credits: number;
    moves: number;
    rank: number;
  };

  aiMode: 'none' | 'dummy' | 'basic';

  hooks: ScenarioHooks;
}
