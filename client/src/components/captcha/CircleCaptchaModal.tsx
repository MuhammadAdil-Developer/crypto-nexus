import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Shield, Rocket, RefreshCw } from 'lucide-react';
import authService from '@/services/authService';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [targetX, setTargetX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const maxAttempts = 3;
  const tolerance = 7; // Matching backend tolerance

  // Fetch challenge from backend
  useEffect(() => {
    if (isOpen) {
      resetCaptcha();
    }
  }, [isOpen]);

  const resetCaptcha = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSliderPosition(0);
    setIsVerified(false);
    setIsLoading(false);
    setIsDragging(false);

    try {
      const response = await authService.getCaptchaChallenge();
      if (response.success) {
        setChallengeId(response.data.challenge_id);
        setTargetX(response.data.target_x);
      } else {
        setErrorMsg('Failed to load verification challenge');
      }
    } catch (err) {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isVerified || isLoading || isGenerating || !challengeId) return;
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

  const handleMouseUp = async () => {
    if (!isDragging || !challengeId) return;
    setIsDragging(false);

    setIsLoading(true);
    try {
      const response = await authService.verifyCaptchaChallenge(challengeId, sliderPosition);

      if (response.success) {
        setIsVerified(true);
        onVerify(response.captcha_token);
        setTimeout(onClose, 1500);
      } else {
        // Failed verification
        setSliderPosition(0);
        setAttempts(prev => prev + 1);
        setErrorMsg(response.message || 'Incorrect position');

        if (attempts + 1 >= maxAttempts) {
          onError?.('Verification failed. Maximum attempts reached.');
          setTimeout(onClose, 1000);
        } else {
          // Get a new challenge after failure to prevent brute forcing one challenge
          resetCaptcha();
        }
      }
    } catch (err) {
      setErrorMsg('Verification error. Please retry.');
      setSliderPosition(0);
    } finally {
      setIsLoading(false);
    }
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
                <p className="text-gray-300 text-sm font-medium">
                  {isGenerating ? 'Prepping launch pad...' : errorMsg || instruction}
                </p>
              </div>

              {/* Slider Track Container */}
              <div className="relative py-4 select-none touch-none">
                <div
                  ref={trackRef}
                  className={`h-12 bg-gray-900 rounded-full border border-gray-700 relative overflow-hidden ${isGenerating ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  {/* Grid Pattern/Texture in Track */}
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.1)_50%)] bg-[size:10px_100%]"></div>

                  {/* Target Zone - Visible but verification happens backend */}
                  <div
                    className="absolute top-1 bottom-1 rounded-full bg-blue-500/10 border border-blue-500/40 flex items-center justify-center animate-pulse"
                    style={{
                      left: `${targetX}%`,
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
                    {isLoading || isGenerating ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Rocket className={`w-5 h-5 text-white ${isDragging ? 'rotate-45' : ''} transition-transform duration-300 drop-shadow-md`} />
                    )}
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="text-center mt-3 h-4 flex items-center justify-center gap-2">
                  {isDragging ? (
                    <span className="text-[10px] text-blue-400 animate-pulse font-medium tracking-widest uppercase">
                      Targeting...
                    </span>
                  ) : (
                    <>
                      <span className={`text-[10px] font-medium tracking-wide ${errorMsg ? 'text-red-400' : 'text-gray-600'}`}>
                        {errorMsg ? errorMsg : (attempts > 0 ? `${maxAttempts - attempts} attempts remaining` : 'Slide to verify')}
                      </span>
                      {!isVerified && !isLoading && !isDragging && (
                        <button
                          onClick={resetCaptcha}
                          className="text-gray-500 hover:text-blue-400 transition-colors"
                          title="Refresh Challenge"
                        >
                          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </>
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