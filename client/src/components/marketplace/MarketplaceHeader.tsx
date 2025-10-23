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
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-center py-3 gap-4 lg:gap-2 lg:overflow-hidden">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8 flex-shrink-0 hidden lg:flex">
            <Link href="/" className="flex items-center flex-shrink-0 pr-8">
              <img 
                src="/images/logo.png" 
                alt="AccountzClub Logo" 
                className="h-16 w-auto"
                style={{ 
                  imageRendering: '-webkit-optimize-contrast',
                  transformOrigin: 'left center'
                }}
              />
            </Link>
            
            <nav className="hidden lg:flex items-center space-x-6">
              <Link href="/">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium text-sm leading-none whitespace-nowrap" data-testid="nav-browse">BROWSE</span>
              </Link>
              <Link href="/categories">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium text-sm leading-none whitespace-nowrap" data-testid="nav-categories">CATEGORIES</span>
              </Link>
              <Link href="/vendors">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium text-sm leading-none whitespace-nowrap" data-testid="nav-vendors">VENDORS</span>
              </Link>
              <Link href="/support">
                <span className="text-pink-600 hover:text-pink-500 cursor-pointer font-medium text-sm leading-none whitespace-nowrap" data-testid="nav-support">SUPPORT</span>
              </Link>
            </nav>
          </div>
          
          {/* Search Bar */}
          <div className="w-full lg:flex-1 lg:min-w-0 mx-2 lg:mx-2 order-3 lg:order-2 px-2">
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
          
          {/* Auth Actions */}
          <div className="flex items-center space-x-4 order-2 lg:order-3 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignUp}
              className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 hover:border-pink-400 hover:text-pink-300 bg-transparent backdrop-blur-sm shadow-lg hover:shadow-pink-500/25 transition-all duration-300 hover:scale-105 font-medium"
              data-testid="signup-button"
            >
              <User className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
            <Button 
              size="sm" 
              onClick={handleSignIn}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 font-medium backdrop-blur-sm"
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