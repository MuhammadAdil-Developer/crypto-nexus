import { Search, User, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketplaceHeader() {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate('/sign-up');
  };

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-8">
        {/* Mobile Layout: Logo + Buttons on top row, Search below */}
        <div className="flex flex-col sm:flex-row justify-between items-center py-2 sm:py-3 gap-2 sm:gap-3 lg:gap-2">
          {/* Top Row: Logo + Auth Buttons (Mobile) / Logo only (Desktop) */}
          <div className="flex items-center justify-between w-full sm:w-auto order-1">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center cursor-pointer">
                <img 
                  src="/images/logo.png" 
                  alt="AccountzClub Logo" 
                  className="h-10 sm:h-12 lg:h-16 w-auto"
                  style={{ 
                    imageRendering: '-webkit-optimize-contrast',
                    transformOrigin: 'left center'
                  }}
                />
              </Link>
            </div>
            
            {/* Auth Actions - Mobile: Right side of top row */}
            <div className="flex items-center space-x-2 sm:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignUp}
                className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:border-pink-400 hover:text-pink-300 bg-transparent backdrop-blur-sm shadow-lg hover:shadow-pink-500/25 transition-all duration-300 hover:scale-105 font-medium text-xs px-3"
                data-testid="signup-button"
              >
                <User className="w-3 h-3 mr-1.5" />
                Sign Up
              </Button>
              <Button 
                size="sm" 
                onClick={handleSignIn}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 font-medium backdrop-blur-sm text-xs px-3"
                data-testid="signin-button"
              >
                <LogIn className="w-3 h-3 mr-1.5" />
                Sign In
              </Button>
            </div>
          </div>
          
          {/* Search Bar - Mobile: Full width below, Desktop: Middle */}
          <div className="w-full sm:flex-1 sm:min-w-0 order-2 sm:order-2 px-0 sm:px-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 flex-shrink-0 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search for accounts..."
                className="w-full pl-9 pr-3 h-9 bg-white/10 border border-gray-600 text-white text-sm placeholder-gray-400 focus:ring-pink-500 focus:border-pink-500 backdrop-blur-sm"
                data-testid="search-input"
              />
            </div>
          </div>
          
          {/* Auth Actions - Desktop: Right side */}
          <div className="hidden sm:flex items-center space-x-3 lg:space-x-4 order-3 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignUp}
              className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:border-pink-400 hover:text-pink-300 bg-transparent backdrop-blur-sm shadow-lg hover:shadow-pink-500/25 transition-all duration-300 hover:scale-105 font-medium text-sm"
              data-testid="signup-button"
            >
              <User className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
            <Button 
              size="sm" 
              onClick={handleSignIn}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 font-medium backdrop-blur-sm text-sm"
              data-testid="signin-button"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}