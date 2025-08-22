import { Menu, ExternalLink, Bell, Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  breadcrumbs: { label: string; href?: string }[];
}

export function Header({ breadcrumbs }: HeaderProps) {
  return (
    <header className="bg-surface border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden text-muted hover:text-text"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-4 h-4" />
          </Button>
          
          {/* Breadcrumbs */}
          <nav className="flex" data-testid="breadcrumbs">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="text-muted mx-2">/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href}>
                      <span className="text-muted hover:text-text cursor-pointer">{crumb.label}</span>
                    </Link>
                  ) : (
                    <span className="text-accent font-medium">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Marketplace Button */}
          <Link href="/">
            <span className="inline-flex items-center px-3 py-1.5 border border-border text-sm font-medium rounded-md text-muted hover:text-text hover:bg-surface-2 cursor-pointer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Marketplace
            </span>
          </Link>
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative text-muted hover:text-text"
            data-testid="notifications-button"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full"></span>
          </Button>
          
          {/* Settings */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted hover:text-text"
            data-testid="settings-button"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
