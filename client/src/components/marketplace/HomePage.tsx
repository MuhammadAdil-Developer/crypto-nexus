import { Bitcoin, Shield, UserX, ArrowRight, Star, Heart, Search, Loader2, User, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { productService, Product } from '@/services/productService';

import placeholderImage from "@/assets/placeholder.png";

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredListings, setFeaturedListings] = useState<Product[]>([]);
  const [displayListings, setDisplayListings] = useState<Product[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const { scrollLeft, clientWidth } = categoriesScrollRef.current;
      const scrollAmount = clientWidth * 0.8;
      categoriesScrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const rotateListings = () => {
    if (featuredListings.length === 0) return;
    const shuffled = [...featuredListings].sort(() => 0.5 - Math.random());
    setDisplayListings(shuffled.slice(0, 3));
  };

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
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      // Try to load from cache first for "immediate" display
      const cachedProducts = localStorage.getItem('hp_featured_listings');
      const cachedCategories = localStorage.getItem('hp_featured_categories');

      let hasCache = false;
      if (cachedProducts) {
        try {
          const products = JSON.parse(cachedProducts);
          setFeaturedListings(products);
          hasCache = true;
        } catch (e) {
          console.error("Failed to parse cached products", e);
        }
      }

      if (cachedCategories) {
        try {
          setFeaturedCategories(JSON.parse(cachedCategories));
          hasCache = true;
        } catch (e) {
          console.error("Failed to parse cached categories", e);
        }
      }

      // If no cache, show loaders. If cache exists, we'll refresh in background quietly.
      if (!hasCache) {
        setIsLoading(true);
      }

      try {
        const [productsRes, categoriesRes] = await Promise.all([
          productService.getProducts({ page_size: 50 }).catch(err => { console.error("Prod fetch err", err); return { data: [] }; }),
          productService.getCategories().catch(err => { console.error("Cat fetch err", err); return { data: [] }; })
        ]);

        const products = (productsRes as any).data || (productsRes as any).results || [];
        console.log("Fetched products for homepage:", products.length);

        // Only show active products with stock. Be lenient if fields are missing.
        const activeProducts = products.filter((p: any) => {
          const isActive = p.is_active !== false; // Only filter out if explicitly false
          const hasStock = p.quantity_available === undefined || p.quantity_available === null || p.quantity_available > 0;
          return isActive && hasStock;
        });

        console.log("Active products after filter:", activeProducts.length);
        setFeaturedListings(activeProducts as Product[]);
        localStorage.setItem('hp_featured_listings', JSON.stringify(activeProducts));

        const categoriesData = (categoriesRes as any).data || [];
        let processedCats: any[] = [];

        if (categoriesData.length > 0) {
          processedCats = categoriesData.slice(0, 12).map((cat: any) => ({
            id: cat.slug || cat.id,
            title: cat.name,
            listings: cat.product_count || cat.products_count || '10+',
            description: cat.description || `Browse premium ${cat.name} accounts`,
            image: cat.icon || "/images/ac-logo-light.png"
          }));
        } else if (products.length > 0) {
          const catMap = new Map();
          products.forEach((p: Product) => {
            const name = p.category?.name || 'Uncategorized';
            catMap.set(name, (catMap.get(name) || 0) + 1);
          });
          processedCats = Array.from(catMap.entries())
            .slice(0, 12)
            .map(([title, count], index) => ({
              id: title.toLowerCase().replace(/\s+/g, '-'),
              title,
              listings: count,
              description: `Browse premium ${title} accounts`,
              image: "/images/ac-logo-light.png"
            }));
        }

        setFeaturedCategories(processedCats);
        localStorage.setItem('hp_featured_categories', JSON.stringify(processedCats));
      } catch (error) {
        console.error("Failed to fetch homepage data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Carousel Logic - Updates displayListings when featuredListings changes
  useEffect(() => {
    if (featuredListings.length === 0) {
      if (!isLoading) setDisplayListings([]);
      return;
    }

    const rotate = () => {
      const shuffled = [...featuredListings].sort(() => 0.5 - Math.random());
      setDisplayListings(shuffled.slice(0, 3));
    };

    rotate();
    const interval = setInterval(rotate, 3600000); // Change every 1 hour
    return () => clearInterval(interval);
  }, [featuredListings, isLoading]);

  // Search Suggestions Logic
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsSearchLoading(true);
      try {
        const res = await productService.getProducts({ search: searchQuery, page_size: 5 });
        const results = (res as any).data || (res as any).results || [];
        setSuggestions(results as Product[]);
      } catch (e) {
        console.error("Failed to fetch suggestions", e);
      } finally {
        setIsSearchLoading(false);
      }
    };

    const timer = setTimeout(() => {
      if (searchQuery) fetchSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseSlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in-up-delay { animation: fadeInUp 0.8s ease-out 0.2s both; }
        .animate-fade-in-up-delay-2 { animation: fadeInUp 0.8s ease-out 0.4s both; }
        .animate-pulse-slow { animation: pulseSlow 3s ease-in-out infinite; }
        .shimmer { animation: shimmer 2s infinite; }
        .homepage-font { font-family: 'Orbitron', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>

      <div className="min-h-screen relative bg-[#0a0a0f] homepage-font">
        <div className="fixed inset-0 z-0 vendor-main-background" />
        <div className="fixed inset-0 opacity-15 z-0 pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23A6033E' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        </div>

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-transparent via-surface/30 to-surface relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
            <div className="text-center">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
                <div className="flex flex-col items-center justify-center py-4 sm:py-6">
                  <div className="mb-3 sm:mb-4">
                    <img
                      src="/images/ac-logo-monogram.png"
                      alt="AC Logo Monogram"
                      className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain"
                      style={{ filter: 'brightness(1) contrast(1.1) saturate(0.9)' }}
                      loading="eager"
                      fetchPriority="high"
                    />
                  </div>
                  <div className="mb-0">
                    <img
                      src="/images/the-one-and-only.png"
                      alt="THE ONE AND ONLY"
                      className="h-5 sm:h-6 lg:h-7 object-contain"
                      style={{ filter: 'brightness(0.75) contrast(1.2) saturate(0.85)' }}
                      loading="eager"
                      fetchPriority="high"
                    />
                  </div>
                </div>

                <div className="max-w-3xl mx-auto mb-6 sm:mb-8 lg:mb-12 animate-fade-in-up-delay px-2 relative z-50" ref={searchContainerRef}>
                  <div className="relative group">
                    <Input
                      type="text"
                      placeholder="Search..."
                      className="pl-4 sm:pl-6 pr-16 sm:pr-20 py-4 sm:py-5 lg:py-6 rounded-2xl sm:rounded-3xl bg-white/5 backdrop-blur-md border-2 border-theme-cyan/30 text-text placeholder-muted focus:ring-4 focus:ring-theme-cyan/10 focus:border-theme-cyan text-sm sm:text-base lg:text-xl shadow-2xl transition-all duration-300 group-hover:border-theme-cyan/50"
                      data-testid="hero-search-input"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button
                      className="absolute inset-y-0 right-0 mr-2 sm:mr-3 my-2 sm:my-3 bg-theme-red hover:bg-theme-red-dark text-white w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl p-0 shadow-xl transform hover:scale-105 transition-all duration-300"
                      data-testid="hero-search-button"
                      onClick={() => handleSearch()}
                    >
                      {isSearchLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />}
                    </Button>

                    {/* Search Suggestions Dropdown */}
                    {showSuggestions && searchQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#0E1A26] border border-theme-cyan/30 rounded-2xl shadow-2xl overflow-hidden z-[9999] text-left max-h-80 overflow-y-auto backdrop-blur-xl">
                        {isSearchLoading ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-theme-cyan" />
                          </div>
                        ) : suggestions.length > 0 ? (
                          <>
                            {suggestions.map((product) => (
                              <div
                                key={product.id}
                                className="p-3 sm:p-4 hover:bg-white/5 cursor-pointer border-b border-theme-cyan/10 last:border-0 transition-colors flex items-center justify-between group"
                                onClick={() => {
                                  setSearchQuery(product.listing_title || product.headline);
                                  handleSearch(product.listing_title || product.headline);
                                  setShowSuggestions(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {product.main_image ? (
                                    <img src={product.main_image} alt="" className="w-8 h-8 rounded object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-xs text-gray-500">Img</div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-white font-medium text-sm sm:text-base group-hover:text-theme-cyan transition-colors">{product.listing_title || product.headline}</span>
                                    <span className="text-gray-400 text-xs">{product.category?.name} • {product.vendor?.username}</span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-theme-cyan opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                              </div>
                            ))}
                            <div
                              className="p-3 bg-[#0E1A26]/80 text-center text-theme-cyan text-sm font-semibold cursor-pointer hover:bg-theme-cyan/10 transition-colors sticky bottom-0 border-t border-theme-cyan/20 z-[10000]"
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
                          <div className="p-4 text-gray-500 text-center">No results found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 lg:gap-6 xl:gap-12 text-xs sm:text-sm animate-fade-in-up-delay-2 px-4 uppercase tracking-widest font-bold">
                  <div className="flex items-center bg-white/5 backdrop-blur-md px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full border border-theme-cyan/10 hover:border-theme-cyan/40 transition-all duration-300 w-full sm:w-auto justify-center text-theme-cyan shadow-[0_0_15px_rgba(77,248,255,0.1)]">
                    <Bitcoin className="text-warning w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-pulse flex-shrink-0" /> <span className="whitespace-nowrap">BTC & XMR Payments</span>
                  </div>
                  <div className="flex items-center bg-white/5 backdrop-blur-md px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full border border-theme-cyan/10 hover:border-theme-cyan/40 transition-all duration-300 w-full sm:w-auto justify-center text-theme-cyan shadow-[0_0_15px_rgba(77,248,255,0.1)]">
                    <Shield className="text-success w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-pulse flex-shrink-0" /> <span className="whitespace-nowrap">Escrow Protection</span>
                  </div>
                  <div className="flex items-center bg-white/5 backdrop-blur-md px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full border border-theme-red/10 hover:border-theme-red/40 transition-all duration-300 w-full sm:w-auto justify-center text-theme-red shadow-[0_0_15px_rgba(166,3,62,0.1)]">
                    <UserX className="text-theme-red w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-pulse flex-shrink-0" /> <span className="whitespace-nowrap">Anonymous Trading</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section className="py-8 sm:py-12 lg:py-20 relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-theme-red mb-3 uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>Featured Categories</h2>
              <div className="w-16 sm:w-20 lg:w-24 h-1 bg-gradient-to-r from-theme-red via-theme-red/50 to-transparent mx-auto rounded-full"></div>
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={() => scrollCategories('left')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-theme-cyan hover:bg-white/5 transition-all active:scale-95 border border-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollCategories('right')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-theme-cyan hover:bg-white/5 transition-all active:scale-95 border border-white/5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={categoriesScrollRef}
              className="flex overflow-x-auto no-scrollbar gap-4 sm:gap-6 lg:gap-8 pb-8 px-4 -mx-4 scroll-smooth"
            >
              {isLoading && featuredCategories.length === 0 ? (
                [...Array(4)].map((_, index) => (
                  <Card key={`skeleton-cat-${index}`} className="min-w-[240px] sm:min-w-[280px] bg-[#111C20] border-theme-red/10 overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-5 lg:mb-6 h-32 sm:h-36 lg:h-40 bg-white/5 animate-pulse">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-6 bg-white/5 rounded mb-3 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-4 bg-white/5 rounded mb-5 w-3/4 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-6 bg-white/5 rounded w-20 animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                        <div className="h-5 w-5 bg-white/5 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (featuredCategories.length > 0 ? (
                featuredCategories.map((category, index) => (
                  <Card key={category.id} className="min-w-[240px] sm:min-w-[280px] bg-[#111C20] cursor-pointer group border-theme-red/10 hover:border-theme-cyan/50 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-theme-cyan/10" data-testid={`category-${category.id}`} style={{ animationDelay: `${index * 100}ms` }} onClick={() => navigate(`/buyer/listings?category=${category.id}`)}>
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-5 lg:mb-6 transition-all duration-500 border border-white/5 bg-gray-950/50 p-6">
                        <img src={category.image} alt={category.title} className="w-full h-24 sm:h-28 lg:h-32 object-contain opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 via-transparent to-transparent opacity-60 pointer-events-none"></div>
                      </div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-2 sm:mb-3 uppercase tracking-wider group-hover:text-theme-cyan transition-colors duration-300" style={{ fontFamily: "'Orbitron', sans-serif" }}>{category.title}</h3>
                      <p className="text-xs sm:text-sm mb-4 sm:mb-5 lg:mb-6 uppercase text-gray-400 group-hover:text-gray-300 transition-colors duration-300 font-medium">{category.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-theme-cyan text-xs sm:text-sm font-bold uppercase bg-theme-cyan/5 px-2 sm:px-3 py-1 rounded-full border border-theme-cyan/10">{category.listings} listings</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-theme-cyan group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : null)}
            </div>
          </div>
        </section>

        {/* Featured Listings */}
        <section className="py-8 sm:py-12 lg:py-20 bg-gradient-to-b from-surface to-bg relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-theme-red mb-3 uppercase tracking-widest" style={{ fontFamily: "'Orbitron', sans-serif" }}>Featured Listings</h2>
              <div className="w-16 sm:w-20 lg:w-24 h-1 bg-gradient-to-r from-theme-red via-theme-red/50 to-transparent mx-auto rounded-full mb-4"></div>
              <Link to="/buyer/listings" className="inline-flex items-center text-theme-cyan hover:text-white font-bold text-sm sm:text-base lg:text-lg uppercase tracking-widest transition-all duration-300 hover:gap-3 group">
                View All Listings <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <button
                onClick={rotateListings}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-theme-red hover:bg-white/5 transition-all active:scale-95 border border-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={rotateListings}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-theme-red hover:bg-white/5 transition-all active:scale-95 border border-white/5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {(isLoading && displayListings.length === 0) ? (
                [...Array(3)].map((_, index) => (
                  <Card key={`skeleton-list-${index}`} className="bg-[#0E1A26] border border-white/5 overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-4 sm:p-5 lg:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-6 w-20 bg-white/5 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                        <div className="h-8 w-8 bg-white/5 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-white/5 rounded mb-2 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-4 bg-white/5 rounded mb-1 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-4 bg-white/5 rounded mb-4 w-3/4 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="flex items-center justify-between mb-4 pt-2 border-t border-white/5">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-white/5 rounded-full animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                          </div>
                          <div className="h-4 w-16 bg-white/5 rounded animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                          </div>
                          <div className="h-4 w-12 bg-white/5 rounded animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="h-5 w-24 bg-white/5 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                        <div className="h-9 w-24 bg-white/5 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : displayListings.length > 0 ? (
                displayListings.map((listing) => {
                  const priceNum = parseFloat(listing.price as any || '0');
                  const formattedUsd = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(priceNum);
                  const approxBtc = (priceNum / 100000).toFixed(6);

                  return (
                    <Card key={listing.id} className="bg-[#0E1A26] border border-theme-cyan/10 hover:border-theme-cyan/40 transition-all duration-300 cursor-pointer group shadow-lg" data-testid={`listing-${listing.id}`}>
                      <CardContent className="p-4 sm:p-5 lg:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <StatusBadge status={listing.delivery_method || 'Instant'} type={listing.delivery_method?.toLowerCase().includes('instant') ? 'success' : 'accent'} className="bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20" />
                          <Button variant="ghost" size="sm" className="hover:text-theme-red transition-colors" data-testid={`favorite-${listing.id}`}><Heart className="w-4 h-4" /></Button>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-theme-cyan transition-colors">{listing.listing_title}</h3>
                        <p className="text-sm mb-4 line-clamp-2 text-gray-400 min-h-[40px] leading-relaxed">{listing.description}</p>
                        <div className="flex items-center justify-between mb-4 pt-2 border-t border-white/5">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-theme-cyan/20 rounded-full flex items-center justify-center border border-theme-cyan/30">
                              <User className="w-3 h-3 text-theme-cyan" />
                            </div>
                            <span className="text-sm text-gray-300 font-medium">{listing.vendor?.username}</span>
                            <div className="flex items-center ml-2 border-l border-white/10 pl-2"><Star className="text-yellow-400 w-3 h-3 fill-current" /> <span className="text-xs ml-1 text-gray-300 font-bold">{Number(listing.rating || 5.0).toFixed(1)}</span></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-lg font-bold text-theme-cyan">{formattedUsd}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Bitcoin className="text-warning w-3 h-3" />
                              <span className="text-xs text-gray-400 font-mono">~{approxBtc} BTC</span>
                            </div>
                          </div>
                          <Button className="bg-theme-red hover:bg-[#850231] text-white text-xs font-bold uppercase tracking-widest px-4 h-10 shadow-lg shadow-theme-red/20 transition-all active:scale-95" data-testid={`buy-${listing.id}`} onClick={() => navigate(`/buyer/listings?search=${encodeURIComponent(listing.listing_title)}&openView=${listing.id}`)}>Buy Now</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center">
                  <Package className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
                  <p className="text-gray-500 font-medium uppercase tracking-widest text-sm">No featured listings found</p>
                  <Link to="/buyer/listings" className="text-theme-cyan hover:underline mt-2 inline-block text-xs uppercase font-bold">Browse all products</Link>
                </div>
              )}
            </div>
          </div>
        </section >

        {/* Privacy Section */}
        < section className="py-8 sm:py-12 lg:py-16 relative z-0" >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 uppercase tracking-[0.2em] px-4" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                Why Choose Accountz<span className="text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-[#A6033E] to-[#850231] font-black inline-block transform -rotate-6 mx-1 drop-shadow-[0_0_15px_rgba(166,3,62,0.4)]">Club</span>?
              </h2>
              <p className="max-w-2xl mx-auto text-sm sm:text-base px-4 text-gray-400 font-medium">We prioritize your privacy and security above all else, providing a safe environment for anonymous digital commerce.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-theme-red/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-theme-red/20 group-hover:scale-110 group-hover:bg-theme-red/20 transition-all duration-300"><UserX className="text-theme-red w-8 h-8" /></div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Anonymous Trading</h3>
                <p className="text-gray-400 text-sm leading-relaxed">No personal data required. Trade with complete privacy using only usernames and recovery phrases.</p>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-theme-cyan/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-theme-cyan/20 group-hover:scale-110 group-hover:bg-theme-cyan/20 transition-all duration-300"><Shield className="text-theme-cyan w-8 h-8" /></div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Escrow Protection</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Your payments are held securely until delivery is confirmed, protecting both buyers and sellers.</p>
              </div>
              <div className="text-center group">
                <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-warning/20 group-hover:scale-110 group-hover:bg-warning/20 transition-all duration-300"><Bitcoin className="text-warning w-8 h-8" /></div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">Crypto Payments</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Accept Bitcoin and Monero for maximum privacy and security in all transactions.</p>
              </div>
            </div>
          </div>
        </section >

        {/* Footer */}
        < footer className="bg-gradient-to-b from-[#0E1A26] to-black border-t border-theme-red/20 relative z-0" >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="flex items-center mb-4 sm:mb-6">
                  <Link to="/" className="flex items-center flex-shrink-0 pr-4 sm:pr-8">
                    <img src="/images/logo.png" alt="AccountzClub Logo" className="h-8 sm:h-10 lg:h-12 w-auto" style={{ imageRendering: '-webkit-optimize-contrast', transformOrigin: 'left center' }} />
                  </Link>
                </div>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed">The secure, anonymous marketplace for digital accounts. Trade safely with cryptocurrency payments and escrow protection.</p>
                <p className="text-xs sm:text-sm text-gray-400 bg-white/5 p-3 sm:p-4 rounded-lg border border-theme-red/20">We do not collect unnecessary personal data. Accounts are anonymous. Use recovery phrase to regain access.</p>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 uppercase tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>Marketplace</h4>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                  <li><Link to="/buyer/listings" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Browse Listings</Link></li>
                  <li><Link to="/buyer/listings" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Categories</Link></li>
                  <li><Link to="/buyer/home" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Featured Vendors</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">How It Works</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 uppercase tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>Support</h4>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                  <li><Link to="/buyer/support" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Help Center</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Dispute Resolution</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Privacy Policy</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-400 hover:text-theme-cyan transition-all duration-300 hover:translate-x-2 inline-block font-medium">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/5 mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-7 lg:pt-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
              <p>© 2026 <span className="!text-theme-red">AccountzClub</span> • ALL RIGHTS RESERVED • PRIVACY-FIRST ANONYMOUS MARKETPLACE</p>
            </div>
          </div>
        </footer >
      </div >
    </>
  );
}