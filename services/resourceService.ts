import { EntityType } from '../types.ts';

/**
 * ResourceService acts as a unified visual asset factory and resource/texture manager.
 * It combines pre-rendering of characters (Units) and arbitrary texture caching (getOrCreate / clear)
 * into a single unified service to optimize memory usage, GPU caching, and simplify file architecture.
 */
class ResourceService {
    private static instance: ResourceService;
    private cache = new Map<string, HTMLCanvasElement | HTMLImageElement>();
    private maxCacheSize: number;

    // Unit renderer dimensions
    private readonly WIDTH = 64;
    private readonly HEIGHT = 64;
    private readonly CENTER_X = 32;
    private readonly CENTER_Y = 48; // Pivot point near "feet"

    private constructor() {
        // Adaptive Cache Size: 100 for Mobile, 300 for Desktop
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        this.maxCacheSize = isMobile ? 100 : 300;
    }

    public static getInstance(): ResourceService {
        if (!ResourceService.instance) {
            ResourceService.instance = new ResourceService();
        }
        return ResourceService.instance;
    }

    // --- CACHE & RESOURCE MANAGERS ---
    public getOrCreate<T extends HTMLCanvasElement | HTMLImageElement>(key: string, generator: () => T): T {
        // If already in cache, return it
        if (this.cache.has(key)) {
            const item = this.cache.get(key)!;
            // LRU: Refresh key position by deleting and re-setting
            this.cache.delete(key);
            this.cache.set(key, item);
            return item as T;
        }

        // If cache is full, evict oldest
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        const texture = generator();
        (texture as any).__cacheKey = key;
        this.cache.set(key, texture);

        return texture;
    }

    public clear(): void {
        this.cache.clear();
    }

    // --- UNIT VECTOR RENDERERS & RASTERIZERS ---
    public getUnitImage(headIndex: number, bodyIndex: number, color: string, type: EntityType): HTMLCanvasElement {
        // Unique key for cache based on visual parameters. Version suffix updated to invalidate old cache.
        const key = `UNIT_${type}_${headIndex}_${bodyIndex}_${color}_v7_ultra`; 
        
        return this.getOrCreate(key, () => {
            const canvas = document.createElement('canvas');
            canvas.width = this.WIDTH;
            canvas.height = this.HEIGHT;
            const ctx = canvas.getContext('2d', { alpha: true })!;

            // Translate space to center pivot hover position
            ctx.translate(this.CENTER_X, this.CENTER_Y);

            const isPlayer = type === EntityType.PLAYER;
            this.drawBody(ctx, bodyIndex, color, isPlayer);
            this.drawHead(ctx, headIndex, color, isPlayer);
            return canvas;
        });
    }

    private drawBody(ctx: CanvasRenderingContext2D, index: number, color: string, isPlayer: boolean) {
        const idx = Math.abs(index) % 4;
        const hoverY = -12; // Base hovers above ground

        // Base ground shadows / levitation ring
        if (isPlayer) {
            // Player levitation ring (sleek glowing neon aura)
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.ellipse(0, 2, 16, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Outer dashed particle orbit ring
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.ellipse(0, 2, 22, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;

            // Soft core shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 1, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Bot aggressive contact shadow / red hazard lock indicator
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 2, 14, 5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Heavy dark ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.ellipse(0, 1, 12, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        switch(idx) {
            case 0: { // 0. THE CRAWLER (Modular Mech Chassis)
                if (isPlayer) {
                    // Cybernetic high-tech crawler chassis
                    ctx.fillStyle = '#0f172a'; // Core dark alloy
                    this.roundRect(ctx, -18, hoverY - 4, 8, 16, 4);
                    this.roundRect(ctx, 10, hoverY - 4, 8, 16, 4);
                    ctx.fill();

                    // Neon energy tread plates
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 6;
                    ctx.fillRect(-16, hoverY - 2, 4, 12);
                    ctx.fillRect(12, hoverY - 2, 4, 12);
                    ctx.shadowBlur = 0;

                    // Sleek central reactor block
                    const reactorGrad = ctx.createLinearGradient(-10, hoverY - 8, 10, hoverY + 6);
                    reactorGrad.addColorStop(0, '#1e293b');
                    reactorGrad.addColorStop(1, '#020617');
                    ctx.fillStyle = reactorGrad;
                    ctx.beginPath();
                    ctx.moveTo(-11, hoverY - 8);
                    ctx.lineTo(11, hoverY - 8);
                    ctx.lineTo(13, hoverY + 6);
                    ctx.lineTo(-13, hoverY + 6);
                    ctx.closePath();
                    ctx.fill();

                    // Glowing reactor core
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(0, hoverY - 1, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Mini booster exhaust flares
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
                    ctx.beginPath();
                    ctx.moveTo(-4, hoverY + 6); ctx.lineTo(0, hoverY + 12); ctx.lineTo(-8, hoverY + 12); ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(4, hoverY + 6); ctx.lineTo(0, hoverY + 12); ctx.lineTo(8, hoverY + 12); ctx.fill();
                } else {
                    // Robotic industrial scavenger crawler
                    ctx.fillStyle = '#27272a'; // Iron plate
                    this.roundRect(ctx, -19, hoverY - 3, 9, 17, 2);
                    this.roundRect(ctx, 10, hoverY - 3, 9, 17, 2);
                    ctx.fill();

                    // Industrial warning hazard marks (Yellow & Black stripes)
                    ctx.fillStyle = '#eab308';
                    ctx.fillRect(-17, hoverY - 1, 5, 13);
                    ctx.fillRect(12, hoverY - 1, 5, 13);
                    ctx.fillStyle = '#18181b';
                    // Draw tiny diagnostic stripes on treads
                    ctx.fillRect(-17, hoverY, 5, 2);
                    ctx.fillRect(-17, hoverY + 5, 5, 2);
                    ctx.fillRect(-17, hoverY + 10, 5, 2);
                    ctx.fillRect(12, hoverY, 5, 2);
                    ctx.fillRect(12, hoverY + 5, 5, 2);
                    ctx.fillRect(12, hoverY + 10, 5, 2);

                    // Exposed power conduits / rivets
                    ctx.fillStyle = '#3f3f46';
                    ctx.fillRect(-10, hoverY - 7, 20, 13);
                    // Central processing core red lens
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 8;
                    ctx.fillRect(-3, hoverY - 4, 6, 6);
                    ctx.shadowBlur = 0;
                }
                break;
            }

            case 1: { // 1. THE GLIDER (Sleek Propulsion Unit)
                if (isPlayer) {
                    // Futuristic sweeping fighter design
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.ellipse(0, hoverY + 12, 10, 3, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Aerodynamic wings with wingtip glow trails
                    const gliderGrad = ctx.createLinearGradient(0, hoverY - 18, 0, hoverY + 8);
                    gliderGrad.addColorStop(0, '#ffffff');
                    gliderGrad.addColorStop(0.4, color);
                    gliderGrad.addColorStop(1, '#0f172a');
                    ctx.fillStyle = gliderGrad;

                    ctx.beginPath();
                    ctx.moveTo(0, hoverY - 18);
                    ctx.lineTo(24, hoverY - 2);   // Wider sweeping wings
                    ctx.lineTo(12, hoverY + 8);
                    ctx.lineTo(0, hoverY + 3);
                    ctx.lineTo(-12, hoverY + 8);
                    ctx.lineTo(-24, hoverY - 2);
                    ctx.closePath();
                    ctx.fill();

                    // Translucent wing edge photon blades
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(-24, hoverY - 2); ctx.lineTo(0, hoverY - 18); ctx.lineTo(24, hoverY - 2);
                    ctx.stroke();

                    // Jet stream thruster core
                    ctx.fillStyle = '#38bdf8';
                    ctx.shadowColor = '#38bdf8';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.arc(0, hoverY + 5, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                } else {
                    // Aggressive hunting-seeker spy drone
                    ctx.fillStyle = '#1c1917';
                    ctx.beginPath();
                    ctx.moveTo(0, hoverY - 16);
                    ctx.lineTo(21, hoverY + 2);
                    ctx.lineTo(8, hoverY + 7);
                    ctx.lineTo(0, hoverY + 1);
                    ctx.lineTo(-8, hoverY + 7);
                    ctx.lineTo(-21, hoverY + 2);
                    ctx.closePath();
                    ctx.fill();

                    // Red warning optic strips on wing elements
                    ctx.fillStyle = '#f43f5e';
                    ctx.fillRect(-17, hoverY, 4, 2);
                    ctx.fillRect(13, hoverY, 4, 2);

                    // Underbody search light spotlight arc
                    const spotGrad = ctx.createLinearGradient(0, hoverY, 0, hoverY + 14);
                    spotGrad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
                    spotGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
                    ctx.fillStyle = spotGrad;
                    ctx.beginPath();
                    ctx.moveTo(0, hoverY + 1);
                    ctx.lineTo(-12, hoverY + 14);
                    ctx.lineTo(12, hoverY + 14);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            }

            case 2: { // 2. THE MONOLITH (Heavy Bulwark / Sentinel Fortress)
                if (isPlayer) {
                    // Highly stylized mech fortress with floating side shields
                    const monoGrad = ctx.createLinearGradient(-15, hoverY - 22, 15, hoverY + 10);
                    monoGrad.addColorStop(0, '#1e293b');
                    monoGrad.addColorStop(0.5, color);
                    monoGrad.addColorStop(1, '#020617');
                    ctx.fillStyle = monoGrad;
                    ctx.fillRect(-13, hoverY - 17, 26, 21);

                    // Holographic floating side shields (Aegis stabilizers)
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 6;
                    
                    // Left Floating Shield
                    this.roundRect(ctx, -21, hoverY - 15, 5, 17, 2);
                    ctx.fill(); ctx.stroke();
                    // Right Floating Shield
                    this.roundRect(ctx, 16, hoverY - 15, 5, 17, 2);
                    ctx.fill(); ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Central glowing power reactor core
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(-9, hoverY - 12, 18, 6);
                    ctx.fillStyle = color;
                    ctx.fillRect(-5, hoverY - 11, 10, 4);
                } else {
                    // Armored military defense block
                    ctx.fillStyle = '#2d2a29';
                    ctx.fillRect(-14, hoverY - 18, 28, 22);

                    // Steel rivets and heavy brace bars
                    ctx.fillStyle = '#44403c';
                    ctx.fillRect(-15, hoverY - 18, 30, 3);
                    ctx.fillRect(-15, hoverY + 1, 30, 3);

                    // Warning plates (Black/Orange diagonal pattern)
                    ctx.fillStyle = '#f97316';
                    ctx.fillRect(-11, hoverY - 11, 22, 8);
                    ctx.fillStyle = '#1c1917';
                    ctx.beginPath();
                    // Custom diagonal warning strips
                    ctx.moveTo(-11, hoverY - 3); ctx.lineTo(-7, hoverY - 11); ctx.lineTo(-4, hoverY - 11); ctx.lineTo(-8, hoverY - 3); ctx.closePath();
                    ctx.moveTo(-3, hoverY - 3); ctx.lineTo(1, hoverY - 11); ctx.lineTo(4, hoverY - 11); ctx.lineTo(0, hoverY - 3); ctx.closePath();
                    ctx.moveTo(5, hoverY - 3); ctx.lineTo(9, hoverY - 11); ctx.lineTo(11, hoverY - 11); ctx.lineTo(8, hoverY - 3); ctx.closePath();
                    ctx.fill();
                    
                    // Center surveillance camera dot
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath(); ctx.arc(0, hoverY - 7, 2, 0, Math.PI*2); ctx.fill();
                }
                break;
            }

            case 3: { // 3. THE PRISM (Crystalline Catalyst / Shard)
                if (isPlayer) {
                    // Radiant levitating high-tech crystal cluster
                    const prismGrad = ctx.createLinearGradient(0, hoverY - 24, 0, hoverY + 16);
                    prismGrad.addColorStop(0, '#ffffff');
                    prismGrad.addColorStop(0.3, color);
                    prismGrad.addColorStop(0.8, '#0f172a');
                    prismGrad.addColorStop(1, '#020617');
                    ctx.fillStyle = prismGrad;

                    // Central diamond
                    ctx.beginPath();
                    ctx.moveTo(0, hoverY - 24);
                    ctx.lineTo(13, hoverY - 2);
                    ctx.lineTo(0, hoverY + 16);
                    ctx.lineTo(-13, hoverY - 2);
                    ctx.closePath();
                    ctx.fill();

                    // Beautiful high-reflectivity neon facets
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                    ctx.beginPath();
                    ctx.moveTo(0, hoverY - 24);
                    ctx.lineTo(-13, hoverY - 2);
                    ctx.lineTo(0, hoverY + 16);
                    ctx.closePath();
                    ctx.fill();

                    // Orbiting satellite mini crystal shards
                    ctx.fillStyle = color;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
                    // Left floating orbital crystal
                    ctx.beginPath();
                    ctx.moveTo(-20, hoverY - 10); ctx.lineTo(-16, hoverY - 5); ctx.lineTo(-20, hoverY); ctx.lineTo(-24, hoverY - 5);
                    ctx.closePath(); ctx.fill();
                    // Right floating orbital crystal
                    ctx.beginPath();
                    ctx.moveTo(20, hoverY - 10); ctx.lineTo(24, hoverY - 5); ctx.lineTo(20, hoverY); ctx.lineTo(16, hoverY - 5);
                    ctx.closePath(); ctx.fill();
                    ctx.shadowBlur = 0;
                } else {
                    // Corrupted Unstable Dark Energy Shard
                    const shardGrad = ctx.createLinearGradient(0, hoverY - 22, 0, hoverY + 14);
                    shardGrad.addColorStop(0, '#450a0a');
                    shardGrad.addColorStop(0.5, '#ef4444');
                    shardGrad.addColorStop(1, '#000000');
                    ctx.fillStyle = shardGrad;

                    // Jagged asymmetric crystalline spikes
                    ctx.beginPath();
                    ctx.moveTo(0, hoverY - 25);
                    ctx.lineTo(14, hoverY - 6);
                    ctx.lineTo(3, hoverY + 15);
                    ctx.lineTo(-11, hoverY + 2);
                    ctx.closePath();
                    ctx.fill();

                    // Jagged hot magma energy cracks
                    ctx.strokeStyle = '#f97316';
                    ctx.lineWidth = 1.5;
                    ctx.shadowColor = '#f97316';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(-5, hoverY + 1);
                    ctx.lineTo(0, hoverY - 10);
                    ctx.lineTo(5, hoverY - 4);
                    ctx.lineTo(10, hoverY - 18);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
                break;
            }
        }
    }

    private drawHead(ctx: CanvasRenderingContext2D, index: number, color: string, isPlayer: boolean) {
        const idx = Math.abs(index) % 4;
        const eyeColor = isPlayer ? '#22d3ee' : '#f43f5e'; // Cyan for player, Rose/Red for bot
        
        const headY = -24; 

        switch(idx) {
            case 0: { // 0. RADAR DOME (Holo scanner vs Tactical dish)
                if (isPlayer) {
                    // Holographic scan dome
                    ctx.fillStyle = '#0f172a';
                    ctx.beginPath(); ctx.arc(0, headY, 10, Math.PI, 0); ctx.fill();
                    ctx.fillRect(-10, headY, 20, 5);

                    // Chrome rims and holographic communication gear
                    ctx.fillStyle = color;
                    ctx.fillRect(-10, headY + 3, 20, 2);

                    // Beautiful holographic scanning circle
                    ctx.strokeStyle = eyeColor;
                    ctx.lineWidth = 0.75;
                    ctx.shadowColor = eyeColor;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.ellipse(0, headY - 8, 12, 4, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Spinning scanning beam accent
                    ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
                    ctx.beginPath();
                    ctx.moveTo(0, headY - 8);
                    ctx.lineTo(8, headY - 9);
                    ctx.lineTo(10, headY - 7);
                    ctx.closePath();
                    ctx.fill();

                    // Glowing sensory horns
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(-6, headY - 6); ctx.lineTo(-12, headY - 14); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(6, headY - 6); ctx.lineTo(12, headY - 14); ctx.stroke();
                    ctx.fillStyle = eyeColor;
                    ctx.beginPath(); ctx.arc(-12, headY - 14, 2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(12, headY - 14, 2, 0, Math.PI * 2); ctx.fill();
                } else {
                    // Aggressive tactical surveillance system
                    ctx.fillStyle = '#3f3f46';
                    ctx.beginPath(); ctx.arc(0, headY, 9, Math.PI, 0); ctx.fill();
                    ctx.fillRect(-9, headY, 18, 5);

                    // Exposed raw wire connectors & metal bracket
                    ctx.strokeStyle = '#eab308';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(0, headY); ctx.lineTo(-5, headY + 6); ctx.stroke();

                    // Heavily armored antenna pointing backwards
                    ctx.strokeStyle = '#18181b';
                    ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.moveTo(-4, headY - 6); ctx.lineTo(-14, headY - 18); ctx.stroke();
                    
                    // Blinking alert nodes
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.arc(-14, headY - 18, 2.5, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(0, headY - 4, 3, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 0;
                }
                break;
            }
                
            case 1: { // 1. TACTICAL VISOR (Robocop / SciFi visor vs Predator Eye)
                if (isPlayer) {
                    // Sleek multi-panel cybernetic helmet
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.moveTo(-8, headY + 7); ctx.lineTo(8, headY + 7); ctx.lineTo(12, headY); ctx.lineTo(-12, headY); ctx.fill();
                    
                    // Dark matte-black protective frame
                    const tacGrad = ctx.createLinearGradient(0, headY - 14, 0, headY);
                    tacGrad.addColorStop(0, '#1e293b');
                    tacGrad.addColorStop(1, '#0f172a');
                    ctx.fillStyle = tacGrad;
                    ctx.beginPath(); ctx.moveTo(-11, headY); ctx.lineTo(11, headY); ctx.lineTo(7, headY - 13); ctx.lineTo(-7, headY - 13); ctx.fill();
                    
                    // Ultra glowing cyber visor with target lock ticks
                    ctx.fillStyle = eyeColor;
                    ctx.shadowColor = eyeColor;
                    ctx.shadowBlur = 12;
                    ctx.fillRect(-8, headY - 5, 16, 4);
                    ctx.shadowBlur = 0;

                    // Holographic visor UI tick marks
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(-10, headY - 6, 1.5, 6);
                    ctx.fillRect(8.5, headY - 6, 1.5, 6);
                } else {
                    // Armored metallic helmet with split optics
                    ctx.fillStyle = '#1c1917';
                    ctx.beginPath(); ctx.moveTo(-9, headY + 6); ctx.lineTo(9, headY + 6); ctx.lineTo(11, headY - 2); ctx.lineTo(-11, headY - 2); ctx.fill();
                    ctx.fillStyle = '#44403c';
                    ctx.beginPath(); ctx.moveTo(-11, headY - 2); ctx.lineTo(11, headY - 2); ctx.lineTo(6, headY - 14); ctx.lineTo(-6, headY - 14); ctx.fill();

                    // Threat-detection sinister V-shaped glowing tracking visor
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.moveTo(-7, headY - 7);
                    ctx.lineTo(0, headY - 2);
                    ctx.lineTo(7, headY - 7);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
                break;
            }

            case 2: { // 2. THE CORE TOWER (Neon Power core vs Toxic Steam chimney)
                if (isPlayer) {
                    // Cylindrical plasma container
                    const cylGrad = ctx.createLinearGradient(-9, 0, 9, 0);
                    cylGrad.addColorStop(0, '#0f172a');
                    cylGrad.addColorStop(0.5, color);
                    cylGrad.addColorStop(1, '#0f172a');
                    ctx.fillStyle = cylGrad;
                    this.roundRect(ctx, -8, headY - 15, 16, 21, 3);
                    ctx.fill();

                    // Beautiful glowing energy nodes and metal supports
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(-9, headY - 11, 18, 2);
                    ctx.fillRect(-9, headY - 2, 18, 2);

                    // Liquid power core bar in the middle
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = eyeColor;
                    ctx.shadowBlur = 10;
                    ctx.fillRect(-2, headY - 13, 4, 15);
                    ctx.shadowBlur = 0;

                    // Upper floating crown ring
                    ctx.strokeStyle = eyeColor;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(0, headY - 18, 7, 2, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    // Aggressive reinforced exhaust tower
                    ctx.fillStyle = '#27272a';
                    this.roundRect(ctx, -7, headY - 14, 14, 20, 1);
                    ctx.fill();

                    // Exposed cooling pipelines
                    ctx.strokeStyle = '#a1a1aa';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(-7, headY - 5); ctx.lineTo(-10, headY + 5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(7, headY - 5); ctx.lineTo(10, headY + 5); ctx.stroke();

                    // Vent slots showing hot lava reactor inside
                    ctx.fillStyle = '#f97316';
                    ctx.shadowColor = '#f97316';
                    ctx.shadowBlur = 8;
                    ctx.fillRect(-4, headY - 10, 8, 2);
                    ctx.fillRect(-4, headY - 5, 8, 2);
                    ctx.fillRect(-4, headY, 8, 2);
                    ctx.shadowBlur = 0;
                }
                break;
            }

            case 3: { // 3. OMNI-DRONE (Orbital companion vs Multi-faceted Spere-Eye)
                if (isPlayer) {
                    // Premium round spherical robot helm (with Saturn-style ring)
                    ctx.fillStyle = color;
                    ctx.beginPath(); ctx.ellipse(0, headY - 3, 14, 10, 0, 0, Math.PI*2); ctx.fill();

                    // Dark glassy circular camera socket
                    ctx.fillStyle = '#020617';
                    ctx.beginPath(); ctx.ellipse(0, headY - 3, 9, 6, 0, 0, Math.PI*2); ctx.fill();

                    // Bright neon lens
                    ctx.fillStyle = eyeColor;
                    ctx.shadowColor = eyeColor;
                    ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.arc(0, headY - 3, 3.5, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(-1, headY - 4, 1, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 0;

                    // Neon halo ring orbiting the dome horizontally
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(0, headY - 3, 20, 4, Math.PI/12, 0, Math.PI*2);
                    ctx.stroke();
                } else {
                    // Heavy spiked multi-camera seeker drone head
                    ctx.fillStyle = '#18181b';
                    ctx.beginPath(); ctx.ellipse(0, headY - 3, 13, 9, 0, 0, Math.PI*2); ctx.fill();

                    // Spiked side protective horns
                    ctx.fillStyle = '#3f3f46';
                    ctx.beginPath();
                    ctx.moveTo(-12, headY - 6); ctx.lineTo(-19, headY - 11); ctx.lineTo(-12, headY - 1); ctx.closePath(); ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(12, headY - 6); ctx.lineTo(19, headY - 11); ctx.lineTo(12, headY - 1); ctx.closePath(); ctx.fill();

                    // Sinister triple scanner eye elements
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 8;
                    ctx.beginPath(); ctx.arc(-5, headY - 5, 2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(5, headY - 5, 2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(0, headY - 1, 2.5, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 0;
                }
                break;
            }
        }
    }

    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

export const resourceService = ResourceService.getInstance();
