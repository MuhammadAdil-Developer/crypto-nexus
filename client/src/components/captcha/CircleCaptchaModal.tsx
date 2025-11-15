import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Shield } from 'lucide-react';

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
  title = 'Security Verification',
  instruction = 'Click on the open circle to verify you are human. Look for a circle with a gap or opening and click inside it.'
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
  const [videoError, setVideoError] = useState(false);

  const generateCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 350;
    const height = 200;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const circles: Circle[] = [];
    const numCircles = 14 + Math.floor(Math.random() * 6);

    for (let i = 0; i < numCircles; i++) {
      const radius = 14 + Math.random() * 20;
      const x = radius + Math.random() * (width - 2 * radius);
      const y = radius + Math.random() * (height - 2 * radius);
      
      circles.push({
        id: `circle-${i}`,
        x,
        y,
        radius,
        isOpen: Math.random() > 0.75,
        isTarget: false
      });
    }

    const openCircles = circles.filter(c => c.isOpen);
    if (openCircles.length === 0) {
      circles[0].isOpen = true;
      circles[0].isTarget = true;
    } else {
      const targetIndex = Math.floor(Math.random() * openCircles.length);
      openCircles[targetIndex].isTarget = true;
    }

    drawBackgroundPattern(ctx, width, height);
    circles.forEach(circle => drawCircle(ctx, circle));
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
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#b91c72');
    gradient.addColorStop(0.5, '#8b1656');
    gradient.addColorStop(1, '#5d0e39');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawCircle = (ctx: CanvasRenderingContext2D, circle: Circle) => {
    ctx.save();
    
    if (circle.isOpen) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = circle.isTarget ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      if (circle.isTarget) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else {
      const gradient = ctx.createRadialGradient(
        circle.x - circle.radius * 0.3, 
        circle.y - circle.radius * 0.3, 
        0,
        circle.x, 
        circle.y, 
        circle.radius
      );
      gradient.addColorStop(0, '#d11372c2');
      gradient.addColorStop(1, '#aa0a57c5');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    ctx.restore();
  };

  const drawDecorativeElements = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    
    const linePoints = [
      { x1: 60, y1: 40, x2: 140, y2: 90 },
      { x1: 140, y1: 90, x2: 230, y2: 60 },
      { x1: 230, y1: 60, x2: 320, y2: 110 },
      { x1: 320, y1: 110, x2: 390, y2: 70 },
      { x1: 90, y1: 140, x2: 170, y2: 170 },
      { x1: 170, y1: 170, x2: 250, y2: 200 },
      { x1: 250, y1: 200, x2: 340, y2: 160 },
      { x1: 110, y1: 220, x2: 200, y2: 240 }
    ];
    
    linePoints.forEach(point => {
      ctx.beginPath();
      ctx.moveTo(point.x1, point.y1);
      ctx.lineTo(point.x2, point.y2);
      ctx.stroke();
    });
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '9px monospace';
    
    const textElements = [
      { text: 'secure', x: 70, y: 50, angle: -0.15 },
      { text: 'verify', x: 160, y: 100, angle: 0.1 },
      { text: 'captcha', x: 250, y: 70, angle: -0.1 },
      { text: 'auth', x: 340, y: 120, angle: 0.15 },
      { text: 'protect', x: 100, y: 150, angle: 0.12 },
      { text: 'secure', x: 190, y: 180, angle: -0.08 },
      { text: 'verify', x: 270, y: 210, angle: 0.1 }
    ];
    
    textElements.forEach(element => {
      ctx.save();
      ctx.translate(element.x, element.y);
      ctx.rotate(element.angle);
      ctx.fillText(element.text, 0, 0);
      ctx.restore();
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (state.isVerified || state.attempts >= state.maxAttempts) return;

    const canvas = canvasRef.current;
    if (!canvas || !state.targetCircle) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const adjustedX = x * scaleX;
    const adjustedY = y * scaleY;

    const distance = Math.sqrt(
      Math.pow(adjustedX - state.targetCircle.x, 2) + Math.pow(adjustedY - state.targetCircle.y, 2)
    );

    if (distance <= state.targetCircle.radius) {
      setIsLoading(true);
      const token = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setTimeout(() => {
        setState(prev => ({ ...prev, isVerified: true }));
        onVerify(token);
        setIsLoading(false);
        setTimeout(() => onClose(), 800);
      }, 500);
    } else {
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
      setVideoError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center backdrop-blur-sm overflow-y-auto py-4 px-4" style={{ alignItems: 'center', minHeight: '100vh' }}>
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ec4899' fill-opacity='0.15'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: 'drift 20s ease-in-out infinite'
        }} />
      </div>

      {/* Geometric Accents */}
      <div className="absolute top-8 left-8 w-24 h-24 border-2 border-pink-500/20 rounded-lg rotate-12 animate-pulse"></div>
      <div className="absolute bottom-12 right-12 w-32 h-32 border-2 border-purple-500/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/4 right-16 w-16 h-16 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rotate-45 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Devil Video/GIF - Positioned at Top, Centered */}
      <div className="relative z-40 mb-4 flex-shrink-0" style={{ order: 1 }}>
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden" style={{
            border: 'none'
          }}>
            {!videoError ? (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
                className="w-full h-full object-cover"
                style={{ filter: 'brightness(1.3) contrast(1.4) saturate(1.5)' }}
                onError={() => {
                  console.log('Video failed to load, trying GIF fallback');
                  setVideoError(true);
                }}
              >
                <source src="/assets/captcha/devil-video.mp4" type="video/mp4" />
                <source src="/assets/captcha/devil-video.webm" type="video/webm" />
              </video>
            ) : (
              <img 
                src="/assets/captcha/devil-video.gif"
                alt="Security Animation"
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(1.3) contrast(1.4) saturate(1.5)' }}
              onError={(e) => {
                  console.log('GIF also failed to load, showing fallback emoji');
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
              />
            )}
            <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold" style={{ display: 'none', background: 'transparent' }}>
              👹
            </div>
          </div>
          {/* Pulsing Ring Animation - Removed */}
        </div>
      </div>

      {/* Main Captcha Modal - Below Video */}
      <div className="relative border-2 border-pink-500/30 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-y-auto flex-shrink-0" style={{
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.7) 0%, rgba(20, 20, 20, 0.7) 50%, rgba(236, 72, 153, 0.3) 100%)',
        boxShadow: '0 0 50px rgba(236, 72, 153, 0.3), 0 20px 50px rgba(0, 0, 0, 0.5)',
        maxHeight: 'calc(100vh - 200px)',
        order: 2
      }}>
        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-600 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        >
          <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </button>

        {/* Instruction Header */}
        <div className="p-4 pb-3 text-center relative">
          <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
          <p className="text-xs text-gray-300 leading-relaxed px-2">{instruction}</p>
        </div>
        
        {/* Captcha Canvas */}
        <div className="px-4 pb-6">
          <div className="relative rounded-xl overflow-hidden border-2 border-pink-500/40 shadow-lg">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="cursor-pointer w-full"
              style={{ 
                background: 'linear-gradient(135deg, #8b1656 0%, #5d0e39 50%, #3d0926 100%)',
              }}
            />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-white text-sm font-medium">Verifying...</p>
                </div>
              </div>
            )}
            
            {state.isVerified && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-900/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3 animate-bounce">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white text-lg font-bold">Verified Successfully!</p>
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
              className="border-2 border-pink-500/40 bg-gray-800/50 text-white hover:bg-pink-500/20 hover:border-pink-500/60 transition-all duration-300 group flex items-center gap-2 px-4 py-2"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            </Button>
            
            <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700">
              <div className="flex gap-1">
                {[...Array(state.maxAttempts)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i < state.attempts ? 'bg-red-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-400 text-xs font-medium ml-1">
                {state.attempts}/{state.maxAttempts}
              </span>
            </div>
          </div>
          
          {state.attempts >= state.maxAttempts && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
              <p className="text-red-400 text-xs font-medium">Maximum attempts exceeded. Please refresh and try again.</p>
            </div>
          )}

          {/* AccountzClub Branding */}
          <div className="mt-4 mb-2 text-center">
            <p className="text-gray-500 text-xs">Protected by <span className="text-pink-500 font-semibold">AccountzClub Security</span></p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(10px, 10px) rotate(5deg); }
          50% { transform: translate(0, 20px) rotate(0deg); }
          75% { transform: translate(-10px, 10px) rotate(-5deg); }
        }
      `}</style>

      {/* Logo Below Modal - Always Below, Never Above, Centered */}
      <div className="relative z-40 mt-4 flex-shrink-0" style={{ order: 3 }}>
        <img 
          src="/images/logo.png" 
          alt="AccountzClub Logo" 
          className="h-12 w-auto"
          style={{ 
            opacity: 0.8
          }}
        />
      </div>
    </div>
  );
};

export default CircleCaptchaModal;