import { useState } from "react";
import { BuyerSidebar } from "./BuyerSidebar";
import { BuyerHeader } from "./BuyerHeader";

interface BuyerLayoutProps {
  children: React.ReactNode;
}

export function BuyerLayout({ children }: BuyerLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="h-screen bg-gray-950 overflow-hidden">
      <div className="flex h-full">
        <BuyerSidebar 
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <BuyerHeader />
          <main className="flex-1 overflow-y-auto bg-gray-900">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}