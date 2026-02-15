
import React, { useEffect, useRef } from 'react';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
    decay: number;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.color = color;
        this.decay = Math.random() * 0.015 + 0.01;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // Gravity
        this.vx *= 0.96; // Drag
        this.vy *= 0.96;
        this.alpha -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Firework {
    x: number;
    y: number;
    targetY: number;
    vy: number;
    color: string;
    exploded: boolean;
    particles: Particle[];

    constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = h;
        this.targetY = h * 0.1 + Math.random() * (h * 0.5);
        this.vy = - (Math.random() * 3 + 12);
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.exploded = false;
        this.particles = [];
    }

    update() {
        if (!this.exploded) {
            this.y += this.vy;
            this.vy *= 0.98; // Drag
            
            if (this.vy > -1 || this.y <= this.targetY) {
                this.explode();
            }
        } else {
            this.particles.forEach(p => p.update());
            this.particles = this.particles.filter(p => p.alpha > 0);
        }
    }

    explode() {
        this.exploded = true;
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(this.x, this.y, this.color));
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.exploded) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Trail
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y + 5, 1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            this.particles.forEach(p => p.draw(ctx));
        }
    }
}

const Fireworks: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const fireworks: Firework[] = [];
        let animationFrameId: number;

        const loop = () => {
            // Use destination-out to fade existing canvas content to transparent
            // This reveals the DOM background (Game Map) underneath instead of painting black
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; 
            ctx.fillRect(0, 0, width, height);
            
            // Reset to default for drawing new particles
            ctx.globalCompositeOperation = 'source-over';

            // Spawn
            if (Math.random() < 0.05) {
                fireworks.push(new Firework(width, height));
            }

            // Update & Draw
            for (let i = fireworks.length - 1; i >= 0; i--) {
                const fw = fireworks[i];
                fw.update();
                fw.draw(ctx);
                if (fw.exploded && fw.particles.length === 0) {
                    fireworks.splice(i, 1);
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Z-Index 20 places it above Map (z-10) but below HUD (z-30)
    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[20]" />;
};

export default Fireworks;
