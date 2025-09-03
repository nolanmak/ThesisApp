import React, { useEffect, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";

// Simple 2D noise implementation
function createNoise2D() {
  const permutation = Array.from({ length: 256 }, (_, i) => i);

  // Fisher-Yates shuffle
  for (let i = permutation.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }

  const p = Array.from({ length: 512 }, (_, i) => permutation[i % 256]);

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }

  function grad(hash: number, x: number, y: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = fade(x);
    const v = fade(y);

    const a = p[X] + Y;
    const b = p[X + 1] + Y;

    return (
      lerp(
        v,
        lerp(u, grad(p[a], x, y), grad(p[b], x - 1, y)),
        lerp(u, grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1))
      ) *
        0.5 +
      0.5
    );
  };
}

const WaveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const noiseRef = useRef<((x: number, y: number) => number) | null>(null);
  const focalPointsRef = useRef<Array<{x: number, y: number, speed: number, radius: number, phase: number}>>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas reference is null");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get 2D context");
      return;
    }

    // Initialize noise function
    noiseRef.current = createNoise2D();

    // Create 3-5 focal points at random positions
    focalPointsRef.current = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 0.5, // Random speed between 0.5-1
        radius: 0.2 + Math.random() * 0.3, // Random radius factor between 0.2-0.5
        phase: Math.random() * Math.PI * 2 // Random starting phase
      };
    });

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Update focal points when canvas resizes
      focalPointsRef.current = focalPointsRef.current.map(point => {
        return {
          ...point,
          x: point.x % canvas.width,
          y: point.y % canvas.height
        };
      });
    };

    const drawWaves = (time: number) => {
      const noise = noiseRef.current;
      if (!noise) {
        console.error("Noise function is null during animation");
        return;
      }

      // Fill with theme-appropriate background
      ctx.fillStyle = theme === 'dark' ? "#111827" : "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dotBaseSize = 2; // Base size for dots
      const spacing = 18; // Spacing between dots
      const timeScale = 0.0003; // Animation speed
      const baseFocalPointRadius = Math.min(canvas.width, canvas.height) * 0.3; // Base influence radius

      // Calculate rows and columns based on spacing
      const cols = Math.ceil(canvas.width / spacing);
      const rows = Math.ceil(canvas.height / spacing);

      // Move focal points and update their properties
      const focalPoints = focalPointsRef.current.map(point => {
        // Move in a slightly random direction based on noise
        const angle = noise(point.x * 0.01, point.y * 0.01 + time * 0.0001) * Math.PI * 2;
        
        // Pulsate the radius over time
        const pulsatingRadius = baseFocalPointRadius * point.radius * 
          (0.8 + 0.2 * Math.sin(time * 0.001 + point.phase));
        
        return {
          ...point,
          x: (point.x + Math.cos(angle) * point.speed + canvas.width) % canvas.width,
          y: (point.y + Math.sin(angle) * point.speed + canvas.height) % canvas.height,
          currentRadius: pulsatingRadius
        };
      });
      focalPointsRef.current = focalPoints;

      // Theme-appropriate dots for better contrast
      const dotColor = theme === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.45)";
      ctx.fillStyle = dotColor;

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const posX = x * spacing;
          const posY = y * spacing;

          // Base noise and wave values
          const noiseVal = noise(x * 0.1, y * 0.1 + time * timeScale);
          const waveVal = Math.sin(y * 0.1 + x * 0.05 + time * timeScale) * 0.5 + 0.5;
          
          // Calculate distance to each focal point with pulsating radius
          const influences = focalPoints.map(point => {
            const dx = posX - point.x;
            const dy = posY - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Use the current (pulsating) radius for this calculation
            const normalizedDist = Math.min(distance / (point.currentRadius || baseFocalPointRadius), 1);
            
            // Inverse - closer to focal point means higher influence, with a more dramatic falloff
            // Use a cubic falloff for even more dramatic expansion effect
            return Math.pow(1 - normalizedDist, 3);
          });
          
          // Get the strongest influence from any focal point
          const maxInfluence = Math.max(...influences);
          
          // Sum of all influences for interaction effects (limited to avoid excessive values)
          const totalInfluence = Math.min(
            influences.reduce((sum, influence) => sum + influence, 0),
            1.5
          );
          
          // Combine noise, wave, and focal point influence
          // Higher influence means more likely to show a dot
          const combinedVal = (noiseVal * 0.2 + waveVal * 0.8) * (1 - maxInfluence * 0.6);

          // Create a pulsing effect by modulating dot size with time
          const pulseEffect = Math.sin(time * 0.001 + posX * 0.01 + posY * 0.01) * 0.2 + 0.8;

          // Draw dot if the value is above threshold
          // Dots are more likely to appear near focal points
          if (combinedVal > 0.45 - totalInfluence * 0.25) {
            // Dot size increases near focal points with pulsing effect
            const sizeFactor = (1 + totalInfluence * 1.2) * pulseEffect;
            
            // Color intensity based on influence
            const alpha = 0.3 + totalInfluence * 0.2;
            if (theme === 'dark') {
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
            } else {
              ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            }
            
            ctx.beginPath();
            ctx.arc(posX, posY, dotBaseSize * combinedVal * sizeFactor, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationRef.current = requestAnimationFrame(drawWaves);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    // Start the animation with an initial time value
    animationRef.current = requestAnimationFrame(drawWaves);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [theme]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10" 
      aria-hidden="true"
      style={{ position: 'fixed', pointerEvents: 'none' }}
    />
  );
};

export default WaveBackground;
