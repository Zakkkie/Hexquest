import { LevelConfig } from '../types';
import { series1Levels } from '../campaign/series1';
import { series2Levels } from '../campaign/series2';
import { series3Levels } from '../campaign/series3';
import { series4Levels } from '../campaign/series4';
import { wrapCampaignLevels } from './scaler';

const ALL_RAW_LEVELS: LevelConfig[] = [
  ...series1Levels,
  ...series2Levels,
  ...series3Levels,
  ...series4Levels,
];

export const CAMPAIGN_LEVELS: LevelConfig[] = wrapCampaignLevels(ALL_RAW_LEVELS);

