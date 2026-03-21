import { generateOverworld } from './services/OverworldGenerator.ts';
const grid = generateOverworld(3, 12345, false);
console.log(Object.keys(grid).length);
