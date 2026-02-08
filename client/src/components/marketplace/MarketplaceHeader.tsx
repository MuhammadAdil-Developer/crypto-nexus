import { Search, User, LogIn, ArrowRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { productService, Product } from '@/services/productService';

export function MarketplaceHeader() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (term?: string) => {
    const query = term || searchQuery;
    if (!query?.trim()) return;
    navigate(`/buyer/listings?search=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
  };

  const handleSignUp = () => {
    navigate('/sign-up');
  };

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  // Search Suggestions Logic
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsSearchLoading(true);
      try {
        // If query is empty, maybe fetch some trending or random items? 
        // For now, let's just fetch default/recent items if empty to show *something* on focus
        const params = searchQuery.trim() ? { search: searchQuery, page_size: 5 } : { page_size: 5 };
        const res = await productService.getProducts(params);
        const results = (res as any).data || (res as any).results || [];
        setSuggestions(results as Product[]);
      } catch (e) {
        console.error("Failed to fetch suggestions", e);
      } finally {
        setIsSearchLoading(false);
      }
    };

    // Debounce for typing, immediate for focus if we want that behavior
    const timer = setTimeout(() => {
      if (showSuggestions) fetchSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, showSuggestions]);

  return (
    <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
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
                  className="h-8 sm:h-10 lg:h-12 w-auto"
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
                className="font-medium text-xs px-3 bg-theme-cyan/10 text-[#a5f3fc] border-theme-cyan/10 hover:bg-theme-cyan/10 hover:text-[#a5f3fc] transition-all"
                data-testid="signup-button"
              >
                <User className="w-3 h-3 mr-1.5" />
                Sign Up
              </Button>
              <Button
                size="sm"
                onClick={handleSignIn}
                className="font-medium text-xs px-3 bg-theme-red hover:bg-theme-red-dark text-white border-transparent transition-all shadow-lg shadow-theme-red/20"
                data-testid="signin-button"
              >
                <LogIn className="w-3 h-3 mr-1.5" />
                Sign In
              </Button>
            </div>
          </div>

          {/* Search Bar - Mobile: Full width below, Desktop: Middle */}
          <div className="w-full sm:flex-1 sm:min-w-0 order-2 sm:order-2 px-0 sm:px-4 relative" ref={searchContainerRef}>
            <div className="relative w-full">
              <div
                className="absolute inset-y-0 left-0 pl-3 flex items-center cursor-pointer hover:text-pink-500 transition-colors z-10"
                onClick={() => handleSearch()}
              >
                {isSearchLoading ? <Loader2 className="w-4 h-4 flex-shrink-0 text-gray-400 animate-spin" /> : <Search className="w-4 h-4 flex-shrink-0 text-gray-400 hover:text-theme-cyan" />}
              </div>
              <Input
                type="text"
                placeholder="Search for accounts..."
                className="w-full pl-9 pr-3 h-9 bg-white/5 border border-gray-700 text-white text-sm placeholder-gray-500 focus:ring-theme-cyan focus:border-theme-cyan/50 backdrop-blur-sm transition-all duration-300"
                data-testid="search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 text-left max-h-80 overflow-y-auto">
                  {suggestions.length > 0 ? (
                    <>
                      {suggestions.map((product) => (
                        <div
                          key={product.id}
                          className="p-2 sm:p-3 hover:bg-white/10 cursor-pointer border-b border-gray-800 last:border-0 transition-colors flex items-center justify-between group"
                          onClick={() => {
                            setSearchQuery(product.listing_title || product.headline);
                            handleSearch(product.listing_title || product.headline);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {product.main_image ? (
                              <img src={product.main_image} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs text-gray-500">Img</div>
                            )}
                            <div className="flex flex-col min-w-0">
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-theme-cyan opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                        </div>
                      ))}
                      <div
                        className="p-2 text-center text-theme-cyan text-xs font-semibold cursor-pointer hover:bg-theme-cyan/10 border-t border-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSuggestions(false);
                          navigate('/buyer/listings');
                        }}
                      >
                        See all results
                      </div>
                    </>
                  ) : (
                    !isSearchLoading && (
                      <div className="p-4 text-gray-500 text-center text-sm">No results found</div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Auth Actions - Desktop: Right side */}
          <div className="hidden sm:flex items-center space-x-3 lg:space-x-4 order-3 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignUp}
              className="font-medium text-sm bg-theme-cyan/10 text-[#a5f3fc] border-theme-cyan/20 hover:bg-theme-cyan/20 hover:text-[#a5f3fc] transition-all px-4"
              data-testid="signup-button"
            >
              <User className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
            <Button
              size="sm"
              onClick={handleSignIn}
              className="font-medium text-sm bg-theme-red hover:bg-theme-red-dark text-white border-transparent transition-all shadow-lg shadow-theme-red/20 px-4"
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