import { MarketplaceHeader } from "./MarketplaceHeader";

interface MarketplaceLayoutProps {
  children: React.ReactNode;
}

export function MarketplaceLayout({ children }: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-bg dark">
      <MarketplaceHeader />
      {children}
    </div>
  );
}
