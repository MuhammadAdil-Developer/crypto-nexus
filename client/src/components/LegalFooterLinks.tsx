import React from "react";

export const LegalFooterLinks: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="mr-4 hover:underline">Terms & Conditions</a>
      <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="mr-4 hover:underline">Privacy Policy</a>
      <a href="/rules.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Rules</a>
    </div>
  );
};
