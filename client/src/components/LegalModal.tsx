import React, { useEffect, useState } from "react";

export type LegalModalProps = {
  open?: boolean;
  onClose?: () => void;
  contentUrl?: string;
  title?: string;
  requiredConfirmationPhrase?: string;
  onConfirmed?: () => void;
};

export const LegalModal: React.FC<LegalModalProps> = ({
  open = false,
  onClose,
  contentUrl = "/rules.html",
  title = "Rules",
  requiredConfirmationPhrase = "I have carefully read, understood, and agree to the rules",
  onConfirmed,
}) => {
  const [answer, setAnswer] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    setIsConfirmed(answer.trim() === requiredConfirmationPhrase);
  }, [answer, requiredConfirmationPhrase]);

  const handleConfirm = () => {
    if (!isConfirmed) return;
    setAnswer("");
    if (onConfirmed) onConfirmed();
  };

  const handleClose = () => {
    setAnswer("");
    if (onClose) onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-blue-800 rounded p-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 bg-gray-50">
          <iframe
            src={contentUrl}
            title={title}
            className="w-full h-full border-0"
            style={{ minHeight: "400px" }}
          />
        </div>

        {/* Confirmation Section */}
        <div className="border-t px-6 py-4 bg-white">
          <p className="text-sm text-gray-700 mb-3">
            Please type the exact confirmation phrase to proceed:
          </p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={requiredConfirmationPhrase}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 mb-4"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmed}
              className={`px-6 py-2 font-medium rounded-lg transition ${
                isConfirmed
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              I have carefully read, understood, and agree to the rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
