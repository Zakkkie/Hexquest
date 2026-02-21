import { LevelConfig } from './types';
import { series1Levels } from './levels/series1';
import { series2Levels } from './levels/series2';
import { series3Levels } from './levels/series3';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  ...series1Levels,
  ...series2Levels,
  ...series3Levels
];