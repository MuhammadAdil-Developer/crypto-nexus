import { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";

interface DashboardLegalModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  userType: "buyer" | "vendor";
}

export function DashboardLegalModal({
  isOpen,
  onConfirm,
  userType,
}: DashboardLegalModalProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "privacy" | "terms">(
    "rules"
  );
  const [confirmations, setConfirmations] = useState({
    rules: false,
    privacy: false,
    terms: false,
  });
  const [scrolledToBottom, setScrolledToBottom] = useState({
    rules: false,
    privacy: false,
    terms: false,
  });

  if (!isOpen) return null;

  const handleTabChange = (tab: "rules" | "privacy" | "terms") => {
    setActiveTab(tab);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      Math.abs(
        element.scrollHeight - element.scrollTop - element.clientHeight
      ) < 50;
    setScrolledToBottom({ ...scrolledToBottom, [activeTab]: isAtBottom });
  };

  const toggleConfirmation = (doc: "rules" | "privacy" | "terms") => {
    setConfirmations({
      ...confirmations,
      [doc]: !confirmations[doc],
    });
  };

  const allConfirmed =
    confirmations.rules && confirmations.privacy && confirmations.terms;

  const handleConfirm = () => {
    if (allConfirmed) {
      localStorage.setItem(
        `legal_confirmed_${userType}`,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          confirmed: true,
        })
      );
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Important Legal Documents
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Please read and confirm all documents before continuing
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span
              className={`px-2 py-1 rounded ${confirmations.rules
                ? "bg-green-900/30 text-green-400"
                : "bg-slate-700 text-slate-300"
                }`}
            >
              {confirmations.rules ? "✓" : "•"} Rules
            </span>
            <span
              className={`px-2 py-1 rounded ${confirmations.privacy
                ? "bg-green-900/30 text-green-400"
                : "bg-slate-700 text-slate-300"
                }`}
            >
              {confirmations.privacy ? "✓" : "•"} Privacy
            </span>
            <span
              className={`px-2 py-1 rounded ${confirmations.terms
                ? "bg-green-900/30 text-green-400"
                : "bg-slate-700 text-slate-300"
                }`}
            >
              {confirmations.terms ? "✓" : "•"} Terms
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/50">
          {["rules", "privacy", "terms"].map((tab) => (
            <button
              key={tab}
              onClick={() =>
                handleTabChange(tab as "rules" | "privacy" | "terms")
              }
              className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-400 bg-slate-700/50"
                : "text-slate-400 hover:text-slate-300"
                }`}
            >
              {tab === "rules"
                ? "Platform Rules"
                : tab === "privacy"
                  ? "Privacy Policy"
                  : "Terms & Conditions"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 bg-[#0F172A] custom-scrollbar"
          onScroll={handleScroll}
        >
          <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
            {activeTab === "rules" && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Platform Rules & Guidelines
                </h3>
                <iframe
                  src="/rules.html"
                  className="w-full h-96 bg-[#0F172A] rounded border border-slate-700"
                  title="Rules"
                />
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Privacy Policy
                </h3>
                <iframe
                  src="/privacy.html"
                  className="w-full h-96 bg-[#0F172A] rounded border border-slate-700"
                  title="Privacy Policy"
                />
              </div>
            )}

            {activeTab === "terms" && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Terms & Conditions
                </h3>
                <iframe
                  src="/terms.html"
                  className="w-full h-96 bg-[#0F172A] rounded border border-slate-700"
                  title="Terms & Conditions"
                />
              </div>
            )}
          </div>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #0f172a;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #334155;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #475569;
            }
          `}</style>
        </div>

        {/* Confirmation Section */}
        <div className="border-t border-slate-700 bg-slate-800/50 px-6 py-4 space-y-4">
          {/* Confirmation Checkboxes */}
          <div className="space-y-2">
            {[
              {
                key: "rules",
                label: "I have read and agree to the Platform Rules",
              },
              {
                key: "privacy",
                label: "I have read and agree to the Privacy Policy",
              },
              {
                key: "terms",
                label: "I have read and agree to the Terms & Conditions",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/30 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={confirmations[item.key as keyof typeof confirmations]}
                  onChange={() =>
                    toggleConfirmation(item.key as "rules" | "privacy" | "terms")
                  }
                  className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                />
                <span className="text-sm text-slate-300">{item.label}</span>
              </label>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleConfirm}
              disabled={!allConfirmed}
              className={`flex-1 px-4 py-2 rounded font-medium transition-all flex items-center justify-center gap-2 ${allConfirmed
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
                }`}
            >
              <CheckCircle2 size={18} />
              {allConfirmed ? "Confirm & Continue" : "Confirm All to Continue"}
            </button>
          </div>

          {!allConfirmed && (
            <p className="text-xs text-slate-400 text-center">
              Please read and confirm all documents to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
