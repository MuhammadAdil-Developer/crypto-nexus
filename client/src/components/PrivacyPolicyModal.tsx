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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-lg">
      <div className="w-[95vw] h-[95vh] max-w-6xl max-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-600/50">
        {/* Header - Orange/Amber gradient matching project */}
        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-3xl font-bold text-white">Privacy Policy & Terms of Service</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X size={32} />
          </button>
        </div>

        {/* Content - scrollable with high contrast text */}
        <div className="flex-1 overflow-y-auto px-10 py-8 bg-slate-900">
          <iframe
            src="/privacy.html"
            className="w-full h-full border-0 rounded bg-slate-800"
            title="Privacy Policy"
          />
        </div>

        {/* Footer with checkbox and button */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-10 py-6 border-t border-slate-600/50 flex items-center justify-between gap-6 flex-shrink-0">
          <label className="flex items-center gap-4 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-6 h-6 rounded border-2 border-orange-500 accent-orange-500 cursor-pointer"
            />
            <span className="text-base font-medium text-white">
              I have read and agree to the Privacy Policy & Terms of Service
            </span>
          </label>
          <button
            onClick={handleConfirm}
            disabled={!confirmed}
            className={`px-8 py-3 rounded-lg font-bold transition-all duration-200 whitespace-nowrap text-lg ${
              confirmed
                ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/50 cursor-pointer"
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
