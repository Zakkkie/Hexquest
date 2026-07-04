import { LevelConfig } from '../types';
import { wrapCampaignLevels } from './scaler';
import { series1Levels } from './series1';
import { series2Levels } from './series2';
import { series3Levels } from './series3';
import { series4Levels } from './series4';
import { series5Levels } from './series5';

// Return the original handcrafted campaign levels from series 1 to 5
const ALL_RAW_LEVELS: LevelConfig[] = [
  ...series1Levels,
  ...series2Levels,
  ...series3Levels,
  ...series4Levels,
  ...series5Levels
];

export const CAMPAIGN_LEVELS: LevelConfig[] = wrapCampaignLevels(ALL_RAW_LEVELS);
