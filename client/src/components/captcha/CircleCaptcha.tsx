import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface CircleCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  siteKey?: string;
  theme?: 'dark' | 'light';
  size?: 'normal' | 'compact';
  className?: string;
}

interface Circle {
  id: string;
  x: number;
  y: number;
  radius: number;
  isOpen: boolean;
  isTarget: boolean;
}

interface CaptchaState {
  circles: Circle[];
  targetCircle: Circle | null;
  isVerified: boolean;
  attempts: number;
  maxAttempts: number;
}

export const CircleCaptcha: React.FC<CircleCaptchaProps> = ({
  onVerify,
  onError,
  siteKey = 'default',
  theme = 'dark',
  size = 'normal',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<CaptchaState>({
    circles: [],
    targetCircle: null,
    isVerified: false,
    attempts: 0,
    maxAttempts: 3
  });
  const [isLoading, setIsLoading] = useState(false);

  const generateCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = size === 'compact' ? 300 : 400;
    const height = size === 'compact' ? 200 : 250;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate circles
    const circles: Circle[] = [];
    const numCircles = 8 + Math.floor(Math.random() * 5); // 8-12 circles

    for (let i = 0; i < numCircles; i++) {
      const radius = 15 + Math.random() * 20; // 15-35 radius
      const x = radius + Math.random() * (width - 2 * radius);
      const y = radius + Math.random() * (height - 2 * radius);
      
      circles.push({
        id: `circle-${i}`,
        x,
        y,
        radius,
        isOpen: Math.random() > 0.7, // 30% chance to be open
        isTarget: false
      });
    }

    // Select one open circle as target
    const openCircles = circles.filter(c => c.isOpen);
    if (openCircles.length === 0) {
      // If no open circles, make one open
      circles[0].isOpen = true;
      circles[0].isTarget = true;
    } else {
      const targetIndex = Math.floor(Math.random() * openCircles.length);
      openCircles[targetIndex].isTarget = true;
    }

    // Draw background pattern
    drawBackgroundPattern(ctx, width, height);

    // Draw circles
    circles.forEach(circle => {
      drawCircle(ctx, circle);
    });

    // Draw decorative elements
    drawDecorativeElements(ctx, width, height);

    setState(prev => ({
      ...prev,
      circles,
      targetCircle: circles.find(c => c.isTarget) || null,
      isVerified: false,
      attempts: 0
    }));
  };

  const drawBackgroundPattern = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, circle: Circle) => {
    ctx.save();
    
    if (circle.isOpen) {
      // Open circle - just outline
      ctx.strokeStyle = circle.isTarget ? '#ff0080' : '#00ffff';
      ctx.lineWidth = circle.isTarget ? 3 : 2;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Add glow effect for target
      if (circle.isTarget) {
        ctx.shadowColor = '#ff0080';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else {
      // Closed circle - filled
      const gradient = ctx.createRadialGradient(
        circle.x - circle.radius * 0.3, 
        circle.y - circle.radius * 0.3, 
        0,
        circle.x, 
        circle.y, 
        circle.radius
      );
      gradient.addColorStop(0, '#ff0080');
      gradient.addColorStop(1, '#cc0066');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    ctx.restore();
  };

  const drawDecorativeElements = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add some tech-style decorative elements
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    
    // Draw some connecting lines
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }
    
    // Add some text elements
    ctx.fillStyle = '#00ffff';
    ctx.font = '12px monospace';
    ctx.fillText('filecrypt', 10, 20);
    ctx.fillText('secure', width - 60, height - 10);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.isVerified || state.attempts >= state.maxAttempts) return;

    const canvas = canvasRef.current;
    if (!canvas || !state.targetCircle) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if click is within target circle
    const distance = Math.sqrt(
      Math.pow(x - state.targetCircle.x, 2) + Math.pow(y - state.targetCircle.y, 2)
    );

    if (distance <= state.targetCircle.radius) {
      // Success!
      setIsLoading(true);
      setTimeout(() => {
        const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setState(prev => ({ ...prev, isVerified: true }));
        onVerify(token);
        setIsLoading(false);
      }, 500);
    } else {
      // Failed attempt
      setState(prev => ({ ...prev, attempts: prev.attempts + 1 }));
      if (state.attempts + 1 >= state.maxAttempts) {
        onError?.('Maximum attempts exceeded. Please refresh and try again.');
      }
    }
  };

  const handleRefresh = () => {
    generateCaptcha();
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  return (
    <div className={`captcha-container ${className}`}>
      
      <div className="captcha-canvas-container relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-pointer border border-gray-700 rounded-lg bg-gray-900"
          style={{ 
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.1)'
          }}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-cyan-400 animate-spin">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        )}
        
        {state.isVerified && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-900 bg-opacity-50 rounded-lg">
            <div className="text-green-400 text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium">Verified!</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="captcha-controls mt-4 flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black"
        >
          Refresh
        </Button>
        
        <div className="text-sm text-gray-400">
          Attempts: {state.attempts}/{state.maxAttempts}
        </div>
      </div>
      
      {state.attempts >= state.maxAttempts && (
        <div className="mt-2 text-red-400 text-sm text-center">
          Maximum attempts exceeded. Please refresh and try again.
        </div>
      )}
    </div>
  );
};

export default CircleCaptcha;

