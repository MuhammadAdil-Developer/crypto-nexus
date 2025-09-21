import { Search, Heart, ShoppingCart, Shield } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketplaceHeader() {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Shield className="text-bg w-4 h-4" />
              </div>
              <h1 className="ml-3 text-xl font-bold text-white">ACCOUNTZ CLUB</h1>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <Link href="/">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium" data-testid="nav-browse">BROWSE</span>
              </Link>
              <Link href="/categories">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium" data-testid="nav-categories">CATEGORIES</span>
              </Link>
              <Link href="/vendors">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium" data-testid="nav-vendors">VENDORS</span>
              </Link>
              <Link href="/support">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium" data-testid="nav-support">SUPPORT</span>
              </Link>
            </nav>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <Input
                type="text"
                placeholder="Search for accounts..."
                className="pl-10 bg-white/10 border-gray-600 text-white placeholder-gray-400 focus:ring-pink-500 focus:border-pink-500 backdrop-blur-sm"
                data-testid="search-input"
              />
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="hover:text-white text-gray-300" data-testid="favorites-button">
              <Heart className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="hover:text-white text-gray-300 relative" data-testid="cart-button">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">2</span>
            </Button>
            <Button variant="ghost" size="sm" className="hover:text-white text-gray-300 relative" data-testid="notifications-button">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
            </Button>
            <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">CS</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
