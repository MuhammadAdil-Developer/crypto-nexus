import { useState } from "react";
import { VendorSidebar } from "./VendorSidebar";
import { VendorHeader } from "./VendorHeader";

interface VendorLayoutProps {
  children: React.ReactNode;
}

export function VendorLayout({ children }: VendorLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen vendor-main-background overflow-hidden flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden lg:block h-full">
          <VendorSidebar
            expanded={sidebarExpanded}
            onExpandedChange={setSidebarExpanded}
          />
        </div>

        {/* Mobile Sidebar - Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 bg-gray-950 shadow-2xl">
              <VendorSidebar
                expanded={true}
                onExpandedChange={() => { }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <VendorHeader onMenuClick={() => setMobileSidebarOpen(true)} />
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
