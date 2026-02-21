import { LevelConfig } from '../campaign/types';
import { series1Levels } from '../campaign/series1';
import { series2Levels } from '../campaign/series2';
import { series3Levels } from '../campaign/series3';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  ...series1Levels,
  ...series2Levels,
  ...series3Levels
];