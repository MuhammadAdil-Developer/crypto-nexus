import { Search, Heart, ShoppingCart, Shield } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketplaceHeader() {
  return (
    <header className="bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Shield className="text-bg w-4 h-4" />
              </div>
              <h1 className="ml-3 text-xl font-bold text-text">CryptoMarket</h1>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <a className="text-text hover:text-accent" data-testid="nav-browse">Browse</a>
              </Link>
              <Link href="/categories">
                <a className="text-muted hover:text-text" data-testid="nav-categories">Categories</a>
              </Link>
              <Link href="/vendors">
                <a className="text-muted hover:text-text" data-testid="nav-vendors">Vendors</a>
              </Link>
              <Link href="/support">
                <a className="text-muted hover:text-text" data-testid="nav-support">Support</a>
              </Link>
            </nav>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-muted w-4 h-4" />
              </div>
              <Input
                type="text"
                placeholder="Search for accounts..."
                className="pl-10 bg-surface-2 border-border text-text placeholder-muted focus:ring-accent focus:border-accent"
                data-testid="search-input"
              />
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-muted hover:text-text" data-testid="favorites-button">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted hover:text-text relative" data-testid="cart-button">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full text-xs text-bg flex items-center justify-center">2</span>
            </Button>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="text-muted hover:text-text hover:bg-surface-2" data-testid="signin-button">
                Sign In
              </Button>
              <Button size="sm" className="bg-accent text-bg hover:bg-accent-2" data-testid="join-button">
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
