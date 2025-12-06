import { useState } from "react";
import { X } from "lucide-react";

interface TermsConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsConditionsModal({ isOpen, onClose }: TermsConditionsModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmed) {
      localStorage.setItem("legal_confirmed_terms", "true");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-lg">
      <div className="w-[95vw] h-[95vh] max-w-6xl max-h-screen bg-slate-900 via-slate-900 to-slate-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden border bg-slate-900">
        {/* Header - Cyan/Blue gradient matching project accent */}
        <div className="bg-slate-900 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <h2 className="text-3xl font-bold text-white">Terms & Conditions</h2>
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
            src="/terms.html"
            className="w-full h-full border-0 rounded bg-slate-800"
            title="Terms and Conditions"
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
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-10 py-6 border-t border-slate-600/50 flex items-center justify-between gap-6 flex-shrink-0">
          <label className="flex items-center gap-4 cursor-pointer flex-1">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-6 h-6 rounded border-2 border-cyan-500 accent-cyan-500 cursor-pointer"
            />
            <span className="text-base font-medium text-white">
              I have read and agree to the Terms & Conditions
            </span>
          </label>
          <button
            onClick={handleConfirm}
            disabled={!confirmed}
            className={`px-8 py-3 rounded-lg font-bold transition-all duration-200 whitespace-nowrap text-lg ${
              confirmed
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/50 cursor-pointer"
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
