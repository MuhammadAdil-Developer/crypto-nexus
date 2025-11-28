import { useState } from "react";
import { BuyerSidebar } from "./BuyerSidebar";
import { BuyerHeader } from "./BuyerHeader";
import { MessagingProvider } from "@/contexts/MessagingContext";

interface BuyerLayoutProps {
  children: React.ReactNode;
  hasBanner?: boolean;
}

export function BuyerLayout({ children, hasBanner = false }: BuyerLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <MessagingProvider>
      <div className="h-screen buyer-main-background overflow-hidden">
        <div className="flex h-full">
          <div className="hidden lg:block h-full">
            <BuyerSidebar 
              expanded={sidebarExpanded}
              onExpandedChange={setSidebarExpanded}
              hasBanner={hasBanner}
            />
          </div>

          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div 
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 w-64 bg-gray-950 shadow-2xl">
                <BuyerSidebar 
                  expanded={true}
                  onExpandedChange={() => {}}
                  hasBanner={hasBanner}
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <BuyerHeader 
              hasBanner={hasBanner} 
              onMenuClick={() => setMobileSidebarOpen(true)} 
            />
            <main className="flex-1 overflow-y-auto">
              <div className="p-6 relative z-10">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </MessagingProvider>
  );
}
