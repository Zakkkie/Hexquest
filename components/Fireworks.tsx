import React, { useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';
import { useGameStore } from '../store';

// Helper: draw hexagon wireframe on canvas
const drawHexagonShell = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const hX = x + size * Math.cos(angle);
        const hY = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hX, hY);
        else ctx.lineTo(hX, hY);
    }
    ctx.closePath();
};

interface StreamParticle {
    x: number;
    y: number;
    size: number;
    speed: number;
    angle: number;
    rotationSpeed: number;
    char: string;
    opacity: number;
    color: string;
}

interface PulseWave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    speed: number;
    opacity: number;
    color: string;
}

const CONSOLE_LOGS_RU = [
    "[СИСТЕМА] Инициализация протокола извлечения...",
    "[ЯДРО] Вектор стабильности зафиксирован на 100%",
    "[СЕТЬ] Подключение к симуляции Nebula-Sector...",
    "[ДАННЫЕ] Расшифровка структуры гексагонального слоя...",
    "[ГЕОЛОГИЯ] Стабилизация высотных аномалий: завершено",
    "[БЮДЖЕТ] Сведение экономических балансов сектора...",
    "[КОД] Сборка нанитов архитектора: СТАТУС_ОК",
    "[СВЯЗЬ] Передача матрицы ресурсов завершена успешно!",
    "[БЕЗОПАСНОСТЬ] Вектор перемещения возвращен в гипер-ядро."
];

const CONSOLE_LOGS_EN = [
    "[SYSTEM] Initializing extraction protocol...",
    "[CORE] Stability vector locked at 100%",
    "[NEBULA] Linking to Nebula-Sector simulation...",
    "[DATA] Decrypting hex-layer spatial array...",
    "[GEOLOGY] Stabilizing elevation anomalies: COMPLETE",
    "[BUDGET] Aggregating economic sector ledger...",
    "[CODE] Architect nanites compilation: STATUS_OK",
    "[COMM] Resource matrix data stream finalized!",
    "[SECURITY] Transferring energetic vector to hyper-core."
];

interface FireworksProps {
    onComplete?: () => void;
}

const Fireworks: React.FC<FireworksProps> = ({ onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const language = useGameStore(state => state.language);
    const logs = language === 'RU' ? CONSOLE_LOGS_RU : CONSOLE_LOGS_EN;
    
    // We use a ref to make sure we don't trigger onComplete multiple times
    const isCompleteFired = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Sound cues to celebrate victory
        audioService.play('SUCCESS');
        const synthTimer = setTimeout(() => {
            audioService.play('LEVEL_UP');
        }, 800);

        // Cyber Simulation State
        const particles: StreamParticle[] = [];
        const pulses: PulseWave[] = [];
        let scannerY = 0;
        const scannerSpeed = 4;

        // Ticker variables
        const activeLogs: string[] = [];
        let lastLogTime = 0;
        let currentLogIndex = 0;

        // Init some immediate particles
        for (let i = 0; i < 40; i++) {
            particles.push(spawnParticle(width, height, true));
        }

        function spawnParticle(w: number, h: number, randomY = false): StreamParticle {
            const size = Math.random() * 25 + 10;
            const isHex = Math.random() < 0.45;
            const hexSymbol = isHex ? "" : (Math.random() < 0.5 ? "0x" + Math.floor(Math.random() * 256).toString(16).toUpperCase() : (Math.random() < 0.5 ? "1" : "0"));
            return {
                x: Math.random() * w,
                y: randomY ? Math.random() * h : h + 30,
                size,
                speed: Math.random() * 2.5 + 1.2,
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.04,
                char: hexSymbol,
                opacity: Math.random() * 0.6 + 0.3,
                color: Math.random() < 0.7 ? '#10b981' : '#06b6d4' // Emerald or Cyan
            };
        }

        // Loop execution
        let animationFrameId: number;
        let frameCount = 0;

        const loop = () => {
            const isLiteMode = useGameStore.getState().isLiteMode;
            if (isLiteMode) {
                if (lastLogTime === 0) {
                     lastLogTime = Date.now();
                }
                const now = Date.now();
                if (now - lastLogTime > 4000) {
                    if (onComplete && !isCompleteFired.current) {
                        isCompleteFired.current = true;
                        onComplete();
                    }
                }
                
                ctx.fillStyle = 'rgba(2, 6, 23, 0.9)'; 
                ctx.fillRect(0, 0, width, height);
                
                ctx.save();
                ctx.font = 'bold 18px JetBrains Mono, Courier New, monospace';
                ctx.fillStyle = '#10b981';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
                ctx.shadowBlur = 8;
                ctx.fillText(
                    language === 'RU' 
                        ? 'ПРОЦЕСС УСПЕШНО ЗАВЕРШЕН // 100%' 
                        : 'DEC-LINK SYNCHRONIZATION COMPLETE // 100%', 
                    width / 2, 
                    height / 2
                );
                ctx.restore();
                
                animationFrameId = requestAnimationFrame(loop);
                return;
            }

            frameCount++;
            // Clear the canvas to keep it fully transparent, preventing the underlying game from darkening
            ctx.clearRect(0, 0, width, height);

            // Laser Scanner Sweep
            scannerY += scannerSpeed;
            if (scannerY > height + 100) {
                scannerY = -50;
                // Add center explosion pulse on turnaround
                pulses.push({
                    x: width / 2,
                    y: height / 2,
                    radius: 0,
                    maxRadius: Math.max(width, height) * 0.7,
                    speed: 12,
                    opacity: 0.8,
                    color: '#06b6d4'
                });
            }

            // Radar Scan background grids
            ctx.save();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)';
            ctx.lineWidth = 1;
            const sizeGrid = 80;
            for (let x = 0; x < width; x += sizeGrid) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += sizeGrid) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.restore();

            // Spawn waves periodic
            if (frameCount % 60 === 0) {
                pulses.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: 0,
                    maxRadius: Math.random() * 200 + 150,
                    speed: 3.5,
                    opacity: 0.8,
                    color: Math.random() < 0.5 ? '#10b981' : '#ef4444'
                });
            }

            // Update & Draw pulses
            for (let i = pulses.length - 1; i >= 0; i--) {
                const pulse = pulses[i];
                pulse.radius += pulse.speed;
                pulse.opacity -= 0.015;

                if (pulse.opacity <= 0 || pulse.radius >= pulse.maxRadius) {
                    pulses.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.strokeStyle = pulse.color;
                ctx.globalAlpha = pulse.opacity;
                ctx.lineWidth = 1.5;
                drawHexagonShell(ctx, pulse.x, pulse.y, pulse.radius);
                ctx.stroke();

                // Dotted inner wireframe ring
                ctx.beginPath();
                ctx.setLineDash([5, 10]);
                ctx.arc(pulse.x, pulse.y, pulse.radius * 0.75, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // Update & Draw Particles
            if (particles.length < 55) {
                particles.push(spawnParticle(width, height, false));
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.y -= p.speed;
                p.angle += p.rotationSpeed;

                if (p.y < -50) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.strokeStyle = p.color;
                ctx.fillStyle = p.color;

                // Draw hexagon outline vs code data stream
                if (p.char === "") {
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    for (let j = 0; j < 6; j++) {
                        const a = p.angle + (Math.PI / 3) * j;
                        const hX = p.x + p.size * Math.cos(a);
                        const hY = p.y + p.size * Math.sin(a);
                        if (j === 0) ctx.moveTo(hX, hY);
                        else ctx.lineTo(hX, hY);
                    }
                    ctx.closePath();
                    ctx.stroke();

                    // Tiny dot inside hex
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.font = `bold ${Math.floor(p.size * 0.8)}px Courier, monospace`;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = 10;
                    ctx.fillText(p.char, p.x, p.y);
                }
                ctx.restore();
            }

            // Draw horizontal high-frequency scanning beam
            ctx.save();
            const sweepGlow = ctx.createLinearGradient(0, scannerY - 30, 0, scannerY + 10);
            sweepGlow.addColorStop(0, 'rgba(6, 182, 212, 0)');
            sweepGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.45)');
            sweepGlow.addColorStop(0.9, 'rgba(6, 182, 212, 0.9)');
            sweepGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');

            ctx.fillStyle = sweepGlow;
            ctx.fillRect(0, scannerY - 30, width, 40);

            // Laser thin core sweep line
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(0, scannerY);
            ctx.lineTo(width, scannerY);
            ctx.stroke();
            ctx.restore();

            // Holographic Ticker logic
            const now = Date.now();
            if (now - lastLogTime > 550 && currentLogIndex < logs.length) {
                activeLogs.push(logs[currentLogIndex]);
                currentLogIndex++;
                lastLogTime = now;
                // Periodic blip audio feedback
                if (currentLogIndex % 2 === 0) {
                    audioService.play('UI_HOVER');
                }
                if (activeLogs.length > 8) {
                    activeLogs.shift();
                }
            }
            
            // Check for animation completion
            if (currentLogIndex >= logs.length && now - lastLogTime > 1200) {
                if (onComplete && !isCompleteFired.current) {
                    isCompleteFired.current = true;
                    onComplete();
                }
            }

            // Draw Holographic Logs on Canvas
            ctx.save();
            ctx.font = 'bold 11px JetBrains Mono, Courier New, monospace';
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
            ctx.shadowBlur = 10;
            
            // Console Header box (Responsive for Mobile)
            const boxMargin = 20;
            const boxWidth = Math.min(width - (boxMargin * 2), 380);
            // Center the box instead of hardcoding 20 if it's smaller, though 20 is fine since we do width-40
            const boxX = boxMargin; 
            const boxY = height - 190;
            
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, 160, 4);
            ctx.fill();
            ctx.stroke();

            // Terminal brackets
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            // Top left corner
            ctx.beginPath(); ctx.moveTo(boxX, boxY + 12); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + 12, boxY); ctx.stroke();
            // Bottom right corner
            ctx.beginPath(); ctx.moveTo(boxX + boxWidth, boxY + 160 - 12); ctx.lineTo(boxX + boxWidth, boxY + 160); ctx.lineTo(boxX + boxWidth - 12, boxY + 160); ctx.stroke();

            // Display title
            ctx.fillStyle = '#34d399';
            // Adjust title for very small screens
            const titleText = boxWidth < 280 ? "NEBULA STABLE" : "NEBULA DEC-LINK PROCESSED // STABLE";
            ctx.fillText(titleText, boxX + 15, boxY + 22);
            
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.beginPath();
            ctx.moveTo(boxX + 15, boxY + 30);
            ctx.lineTo(boxX + boxWidth - 15, boxY + 30);
            ctx.stroke();

            // Scrolling text
            ctx.fillStyle = '#a7f3d0';
            activeLogs.forEach((log, index) => {
                // Truncate logs if they don't fit
                const maxChars = Math.floor((boxWidth - 30) / 6.6); // roughly 6.6px per char
                const displayLog = log.length > maxChars ? log.substring(0, maxChars - 3) + '...' : log;
                ctx.fillText(displayLog, boxX + 15, boxY + 48 + index * 14);
            });

            // Caret blink
            if (Math.floor(Date.now() / 400) % 2 === 0) {
                const lastLog = activeLogs[activeLogs.length - 1] || '';
                const maxChars = Math.floor((boxWidth - 30) / 6.6);
                const displayLogCount = lastLog.length > maxChars ? maxChars : lastLog.length;
                
                const caretX = boxX + 15 + displayLogCount * 6.6;
                const caretY = boxY + 48 + (Math.max(0, activeLogs.length - 1)) * 14 - 9;
                ctx.fillStyle = '#10b981';
                ctx.fillRect(caretX, caretY, 6, 11);
            }
            ctx.restore();

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
            clearTimeout(synthTimer);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [language, logs, onComplete]);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[130]" />;
};

export default Fireworks;
