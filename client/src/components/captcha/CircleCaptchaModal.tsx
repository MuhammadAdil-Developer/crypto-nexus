import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Shield, Rocket } from 'lucide-react';

interface CircleCaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  siteKey?: string;
  title?: string;
  instruction?: string;
}

export const CircleCaptchaModal: React.FC<CircleCaptchaModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  onError,
  title = 'Launch Verification',
  instruction = 'Drag the rocket to the target zone to complete verification.'
}) => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const trackRef = useRef<HTMLDivElement>(null);
  // Remove unused sliderRef if not needed for logic, but helpful for debugging/extensions
  // const sliderRef = useRef<HTMLDivElement>(null); 
  const maxAttempts = 3;
  const tolerance = 5; // Percentage tolerance

  // Generate random target position
  useEffect(() => {
    if (isOpen) {
      resetCaptcha();
    }
  }, [isOpen]);

  const resetCaptcha = () => {
    // Target position between 60% and 90%
    const newTarget = 60 + Math.random() * 30;
    setTargetPosition(newTarget);
    setSliderPosition(0);
    setIsVerified(false);
    setIsLoading(false);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isVerified || isLoading) return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

    // Calculate percentage
    let newPosition = ((clientX - trackRect.left) / trackRect.width) * 100;

    // Clamp between 0 and 100
    newPosition = Math.max(0, Math.min(100, newPosition));

    setSliderPosition(newPosition);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Verify position
    if (Math.abs(sliderPosition - targetPosition) <= tolerance) {
      handleSuccess();
    } else {
      // Snap back if failed
      setSliderPosition(0);
      setAttempts(prev => prev + 1);

      if (attempts + 1 >= maxAttempts) {
        onError?.('Verification failed. Maximum attempts reached.');
        setTimeout(onClose, 1000);
      }
    }
  };

  const handleSuccess = () => {
    setIsLoading(true);
    setSliderPosition(targetPosition); // Snap to target

    setTimeout(() => {
      setIsVerified(true);
      const token = `rocket_captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onVerify(token);

      setTimeout(() => {
        onClose();
      }, 1500);
    }, 600);
  };

  // Global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, sliderPosition, targetPosition]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center backdrop-blur-md p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative w-full max-w-sm bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-950 p-4 border-b border-gray-800 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <div className="flex items-center gap-2 relative z-10">
            <Shield className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-100">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800 relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isVerified ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 relative">
                <div className="absolute inset-0 border-2 border-green-500 rounded-full animate-ping opacity-20"></div>
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Verification Complete</h3>
              <p className="text-gray-400 text-sm">You may proceed securely.</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 ring-1 ring-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <Rocket className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-gray-300 text-sm font-medium">{instruction}</p>
              </div>

              {/* Slider Track Container */}
              <div className="relative py-4 select-none touch-none">
                <div
                  ref={trackRef}
                  className="h-12 bg-gray-900 rounded-full border border-gray-700 relative overflow-hidden shadow-inner cursor-pointer"
                >
                  {/* Grid Pattern/Texture in Track */}
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.1)_50%)] bg-[size:10px_100%]"></div>

                  {/* Target Zone */}
                  <div
                    className="absolute top-1 bottom-1 rounded-full bg-blue-500/10 border border-blue-500/40 flex items-center justify-center animate-pulse"
                    style={{
                      left: `${targetPosition}%`,
                      width: '44px',
                      transform: 'translateX(-50%)',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                  </div>

                  {/* Progress Trail */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30 transition-all duration-75 ease-linear"
                    style={{ width: `${sliderPosition}%` }}
                  ></div>

                  {/* Draggable Slider Thumb */}
                  <div
                    className="absolute top-1 bottom-1 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center z-10 transition-transform active:scale-95 hover:brightness-110"
                    style={{
                      left: `${sliderPosition}%`,
                      transform: 'translateX(-50%)'
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Rocket className={`w-5 h-5 text-white ${isDragging ? 'rotate-45' : ''} transition-transform duration-300 drop-shadow-md`} />
                    )}
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="text-center mt-3 h-4">
                  {isDragging ? (
                    <span className="text-[10px] text-blue-400 animate-pulse font-medium tracking-widest uppercase">
                      Targeting...
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-medium tracking-wide">
                      {attempts > 0 ? `${maxAttempts - attempts} attempts remaining` : 'Slide to verify'}
                    </span>
                  )}
                </div>
              </div>

              {/* Security Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-800/50 mt-2">
                <div className="flex gap-1">
                  {[...Array(maxAttempts)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i < attempts ? 'bg-red-500' : 'bg-gray-800'
                        }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                  <Shield className="w-3 h-3" />
                  <span>Secure Enclave</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

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