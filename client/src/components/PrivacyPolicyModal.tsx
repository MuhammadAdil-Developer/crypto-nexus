import { useState } from "react";
import { X } from "lucide-react";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmed) {
      localStorage.setItem("legal_confirmed_privacy", "true");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-lg p-0 sm:p-4">
      <div className="w-full h-full sm:w-[95vw] sm:h-[95vh] max-w-6xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-slate-600/50">
        {/* Header - Orange/Amber gradient matching project */}
        <div className="bg-slate-900 px-4 py-4 sm:px-8 sm:py-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl sm:text-3xl font-bold text-white truncate pr-4">Privacy Policy & Terms of Service</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Content - scrollable with high contrast text */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-10 sm:py-8 bg-slate-900">
          <iframe
            src="/privacy.html"
            className="w-full h-full border-0 rounded bg-slate-800"
            title="Privacy Policy"
            style={{
              filter: 'brightness(1.2) contrast(1.1)'
            }}
          />
          <style>{`
            iframe {
              color: #ffffff !important;
            }
            iframe body {
              color: #e5e7eb !important;
              background-color: #1e293b !important;
            }
            iframe p, iframe li, iframe span, iframe div {
              color: #e5e7eb !important;
            }
            iframe h1, iframe h2, iframe h3, iframe h4, iframe h5, iframe h6 {
              color: #ffffff !important;
            }
          `}</style>
        </div>

        {/* Footer with checkbox and button */}
        <div className="bg-gradient-to-r px-4 py-4 sm:px-10 sm:py-6 border-t border-slate-600/50 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 flex-shrink-0">
          <label className="flex items-start sm:items-center gap-3 sm:gap-4 cursor-pointer w-full sm:w-auto">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 sm:mt-0 w-5 h-5 sm:w-6 sm:h-6 rounded border-2 border-pink-700 accent-pink-500 cursor-pointer flex-shrink-0"
            />
            <span className="text-sm sm:text-base font-medium text-white leading-tight">
              I have read and agree to the Privacy Policy & Terms of Service
            </span>
          </label>
          <button
            onClick={handleConfirm}
            disabled={!confirmed}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold transition-all duration-200 whitespace-nowrap text-base sm:text-lg ${confirmed
                ? "bg-gradient-to-r from-pink-700 to-pink-800 text-white hover:shadow-lg hover:shadow-pink-500/50 cursor-pointer"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
              }`}
          >
            I Agree
          </button>
        </div>
      </div>
    </div>
  );
}
