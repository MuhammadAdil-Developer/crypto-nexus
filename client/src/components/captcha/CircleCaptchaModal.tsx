import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CircleCaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  siteKey?: string;
  title?: string;
  instruction?: string;
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

export const CircleCaptchaModal: React.FC<CircleCaptchaModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  onError,
  siteKey = 'default',
  title = 'Security prompt',
  instruction = 'Please click into the open circle to continue.'
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

    // Set canvas size to match reference
    const width = 400;
    const height = 250;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate circles
    const circles: Circle[] = [];
    const numCircles = 12 + Math.floor(Math.random() * 6); // 12-17 circles

    for (let i = 0; i < numCircles; i++) {
      const radius = 12 + Math.random() * 18; // 12-30 radius
      const x = radius + Math.random() * (width - 2 * radius);
      const y = radius + Math.random() * (height - 2 * radius);
      
      circles.push({
        id: `circle-${i}`,
        x,
        y,
        radius,
        isOpen: Math.random() > 0.75, // 25% chance to be open
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
    // Dark pink/red gradient background matching reference
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#cc0066');
    gradient.addColorStop(0.5, '#990044');
    gradient.addColorStop(1, '#660022');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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
      // Open circle - just outline in white
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = circle.isTarget ? 3 : 2;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Add glow effect for target
      if (circle.isTarget) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else {
      // Closed circle - filled with pink/red
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
    // Add connecting lines - circuit board pattern
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    // Draw circuit-like connecting lines
    const linePoints = [
      { x1: 50, y1: 30, x2: 120, y2: 80 },
      { x1: 120, y1: 80, x2: 200, y2: 50 },
      { x1: 200, y1: 50, x2: 280, y2: 100 },
      { x1: 280, y1: 100, x2: 350, y2: 60 },
      { x1: 80, y1: 120, x2: 150, y2: 150 },
      { x1: 150, y1: 150, x2: 220, y2: 180 },
      { x1: 220, y1: 180, x2: 300, y2: 140 },
      { x1: 100, y1: 200, x2: 180, y2: 220 },
      { x1: 180, y1: 220, x2: 260, y2: 200 }
    ];
    
    linePoints.forEach(point => {
      ctx.beginPath();
      ctx.moveTo(point.x1, point.y1);
      ctx.lineTo(point.x2, point.y2);
      ctx.stroke();
    });
    
    // Add text elements matching reference exactly
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    
    const textElements = [
      { text: 'filecrypt', x: 60, y: 40, angle: -0.2 },
      { text: 'filecry', x: 140, y: 90, angle: 0.1 },
      { text: 'thecryp', x: 220, y: 60, angle: -0.1 },
      { text: 'Hecr', x: 300, y: 110, angle: 0.2 },
      { text: 'filecrypt', x: 90, y: 130, angle: 0.15 },
      { text: 'filecry', x: 170, y: 160, angle: -0.1 },
      { text: 'thecryp', x: 250, y: 190, angle: 0.1 },
      { text: 'Hecr', x: 110, y: 210, angle: -0.2 }
    ];
    
    textElements.forEach(element => {
      ctx.save();
      ctx.translate(element.x, element.y);
      ctx.rotate(element.angle);
      ctx.fillText(element.text, 0, 0);
      ctx.restore();
    });
    
    // Add some stars scattered around
    ctx.fillStyle = '#ffffff';
    const starPositions = [
      { x: 80, y: 60 }, { x: 160, y: 110 }, { x: 240, y: 80 },
      { x: 320, y: 130 }, { x: 100, y: 160 }, { x: 200, y: 200 }
    ];
    
    starPositions.forEach(pos => {
      drawStar(ctx, pos.x, pos.y, 3, 6, 4);
    });
  };

  const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, innerRadius: number, outerRadius: number, points: number) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
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
      const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('✅ Captcha solved! Generated token:', token);
      console.log('✅ Token length:', token.length);
      console.log('✅ Token type:', typeof token);
      
      setTimeout(() => {
        setState(prev => ({ ...prev, isVerified: true }));
        console.log('✅ Calling onVerify with token:', token);
        onVerify(token);
        setIsLoading(false);
        onClose(); // Close modal after verification
      }, 500);
    } else {
      // Failed attempt
      console.log('❌ Captcha click missed. Distance:', distance, 'Radius:', state.targetCircle.radius);
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
    if (isOpen) {
      generateCaptcha();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Background Video Player Interface */}
      <div className="absolute inset-0">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/assets/captcha/background.jpg')`
          }}
        ></div>
        
        {/* Dark overlay to make video more visible */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Dark Red/Pink Geometric Shapes in Corners */}
        <div className="absolute top-0 left-0 w-32 h-32">
          <div className="absolute top-4 left-4 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[35px] border-l-transparent border-r-transparent border-b-red-600/30"></div>
          <div className="absolute top-8 left-8 w-0 h-0 border-l-[15px] border-r-[15px] border-b-[25px] border-l-transparent border-r-transparent border-b-red-500/40"></div>
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32">
          <div className="absolute top-4 right-4 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[35px] border-l-transparent border-r-transparent border-b-red-600/30"></div>
          <div className="absolute top-8 right-8 w-0 h-0 border-l-[15px] border-r-[15px] border-b-[25px] border-l-transparent border-r-transparent border-b-red-500/40"></div>
        </div>
        
        <div className="absolute bottom-0 left-0 w-32 h-32">
          <div className="absolute bottom-4 left-4 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent border-t-red-600/30"></div>
          <div className="absolute bottom-8 left-8 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-red-500/40"></div>
        </div>
        
        <div className="absolute bottom-0 right-0 w-32 h-32">
          <div className="absolute bottom-4 right-4 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[35px] border-l-transparent border-r-transparent border-t-red-600/30"></div>
          <div className="absolute bottom-8 right-8 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-red-500/40"></div>
        </div>
        
        {/* Video Player Controls */}
        {/* Top Left - Fullscreen Icon */}
        <div className="absolute top-4 left-4 w-8 h-8 border border-white/50 flex items-center justify-center">
          <div className="w-4 h-4 border-t-2 border-r-2 border-white transform rotate-45"></div>
        </div>
        
        {/* Top Right - Exit Fullscreen Icon */}
        <div className="absolute top-4 right-4 w-8 h-8 border border-white/50 flex items-center justify-center">
          <div className="w-3 h-3 border border-white"></div>
        </div>
        
        {/* Bottom Video Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          {/* Play Button */}
          <div className="absolute bottom-0 left-0 w-8 h-8 flex items-center justify-center">
            <div className="w-0 h-0 border-l-[12px] border-t-[8px] border-b-[8px] border-l-white border-t-transparent border-b-transparent"></div>
          </div>
          
          {/* Progress Bar */}
          <div className="absolute bottom-2 left-12 right-12 h-1 bg-white/30">
            <div className="h-full bg-white/60 w-0"></div>
          </div>
          
          {/* Volume Icon */}
          <div className="absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center">
            <div className="relative">
              <div className="w-4 h-3 border-l-2 border-white"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 border-r-2 border-t-2 border-white"></div>
              <div className="absolute -top-2 -right-2 w-1 h-1 border-r border-t border-white"></div>
            </div>
          </div>
        </div>
        
        {/* ACCOUNTZ CLUB Logo at Bottom Center */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <img 
            src="/assets/captcha/logo.png" 
            alt="ACCOUNTZ CLUB" 
            className="h-8 w-auto"
            onError={(e) => {
              // Fallback to text if image not found
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'block';
            }}
          />
          <div className="text-white text-lg font-bold tracking-wider hidden">ACCOUNTZ CLUB</div>
        </div>
      </div>

      {/* Devil Video in Center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full overflow-hidden border-2 border-cyan-400/50 shadow-lg shadow-cyan-400/20 z-10" style={{
        boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)'
      }}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(1.2) contrast(1.3) saturate(1.4)' }}
          onError={(e) => {
            console.error('Video failed to load:', e);
            // Show fallback content
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        >
          <source src="/assets/captcha/devil-video.mp4" type="video/mp4" />
          <source src="/assets/captcha/devil-video.webm" type="video/webm" />
        </video>
        {/* Fallback content if video fails */}
        <div className="w-full h-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold" style={{ display: 'none' }}>
          👹
        </div>
      </div>

      {/* Captcha Modal */}
      <div className="relative bg-red-900/80 backdrop-blur-sm border border-red-700/50 rounded-lg shadow-2xl max-w-md w-full mx-4" style={{
        background: 'linear-gradient(135deg, rgba(153, 0, 68, 0.8) 0%, rgba(102, 0, 34, 0.9) 100%)',
        boxShadow: '0 0 30px rgba(255, 0, 128, 0.3)'
      }}>
        {/* Header */}
        <div className="p-6 text-center">
          <h3 className="text-white text-lg font-semibold mb-2">{title}</h3>
          <p className="text-white/90 text-sm">{instruction}</p>
        </div>
        
        {/* Captcha Canvas */}
        <div className="px-6 pb-6">
          <div className="relative">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer border border-red-600/50 rounded-lg w-full"
              style={{ 
                background: 'linear-gradient(135deg, #990044 0%, #660022 50%, #440011 100%)',
                boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.3)'
              }}
            />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                <div className="text-white animate-spin">
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
          
          {/* Controls */}
          <div className="mt-4 flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-red-600/50 text-white hover:bg-red-600/20"
            >
              Refresh
            </Button>
            
            <div className="text-sm text-white/70">
              Attempts: {state.attempts}/{state.maxAttempts}
            </div>
          </div>
          
          {state.attempts >= state.maxAttempts && (
            <div className="mt-2 text-red-300 text-sm text-center">
              Maximum attempts exceeded. Please refresh and try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircleCaptchaModal;
