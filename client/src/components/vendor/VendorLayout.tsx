import { useState } from "react";
import { VendorSidebar } from "./VendorSidebar";
import { VendorHeader } from "./VendorHeader";

interface VendorLayoutProps {
  children: React.ReactNode;
}

export function VendorLayout({ children }: VendorLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="h-screen vendor-main-background overflow-hidden">
      <div className="flex h-full">
        <VendorSidebar 
          expanded={sidebarExpanded}
          onExpandedChange={setSidebarExpanded}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <VendorHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}