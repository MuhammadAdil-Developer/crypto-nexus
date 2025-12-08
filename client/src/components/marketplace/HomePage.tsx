import { Bitcoin, Shield, UserX, ArrowRight, Star, Heart, Search, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { productService, Product } from '@/services/productService';

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
      try {
        setIsLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          productService.getProducts({ page_size: 50 }).catch(err => { console.error("Prod fetch err", err); return { data: [] }; }),
          productService.getCategories().catch(err => { console.error("Cat fetch err", err); return { data: [] }; })
        ]);

        const products = (productsRes as any).data || (productsRes as any).results || [];
        setFeaturedListings(products as Product[]);

        const categoriesData = (categoriesRes as any).data || [];
        let processedCats: any[] = [];

        if (categoriesData.length > 0) {
          processedCats = categoriesData.slice(0, 4).map((cat: any) => ({
            id: cat.slug || cat.id,
            title: cat.name,
            listings: cat.products_count || '10+',
            description: cat.description || `Browse premium ${cat.name} accounts`,
            image: cat.icon || "/images/category-placeholder.png"
          }));
        } else if (products.length > 0) {
          const catMap = new Map();
          products.forEach((p: Product) => {
            const name = p.category?.name || 'Uncategorized';
            catMap.set(name, (catMap.get(name) || 0) + 1);
          });
          processedCats = Array.from(catMap.entries())
            .slice(0, 4)
            .map(([title, count], index) => ({
              id: title.toLowerCase().replace(/\s+/g, '-'),
              title,
              listings: count,
              description: `Browse premium ${title} accounts`,
              image: "/images/category-placeholder.png"
            }));
        }

        setFeaturedCategories(processedCats);
      } catch (error) {
        console.error("Failed to fetch homepage data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Carousel Logic
  useEffect(() => {
    if (featuredListings.length === 0) return;
    const rotate = () => {
      const shuffled = [...featuredListings].sort(() => 0.5 - Math.random());
      setDisplayListings(shuffled.slice(0, 3));
    };
    rotate();
    const interval = setInterval(rotate, 5000);
    return () => clearInterval(interval);
  }, [featuredListings]);

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
      <link rel="preload" as="image" href="/images/vendor-main-bg.png" />
      <link rel="preload" as="image" href="/images/ac-logo-monogram.png" />
      <link rel="preload" as="image" href="/images/the-one-and-only.png" />
      <link rel="preload" as="image" href="/images/logo.png" />

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseSlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-fade-in-up-delay { animation: fadeInUp 0.8s ease-out 0.2s both; }
        .animate-fade-in-up-delay-2 { animation: fadeInUp 0.8s ease-out 0.4s both; }
        .animate-pulse-slow { animation: pulseSlow 3s ease-in-out infinite; }
        .shimmer { animation: shimmer 2s infinite; }
        .homepage-font { font-family: 'Inter', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        img { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
      `}</style>

      <div className="min-h-screen relative vendor-main-background homepage-font">
        <div className="absolute inset-0 opacity-20">
          <img src="/images/vendor-main-bg.png" alt="Background" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ec4899' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        </div>

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-transparent via-surface/50 to-surface relative z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
            <div className="text-center">
              <div className="space-y-4 sm:space-y-6 lg:space-y-8 relative z-10 p-3 sm:p-0">
                <div className="flex flex-col items-center justify-center py-4 sm:py-6">
                  <div className="mb-3 sm:mb-4">
                    <img src="/images/ac-logo-monogram.png" alt="AC Logo Monogram" className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain" style={{ filter: 'brightness(1) contrast(1.1) saturate(0.9)', imageRendering: '-webkit-optimize-contrast' }} />
                  </div>
                  <div className="mb-0">
                    <img src="/images/the-one-and-only.png" alt="THE ONE AND ONLY" className="h-5 sm:h-6 lg:h-7 object-contain" style={{ filter: 'brightness(0.75) contrast(1.2) saturate(0.85)', imageRendering: '-webkit-optimize-contrast' }} />
                  </div>
                </div>

                <div className="max-w-3xl mx-auto mb-6 sm:mb-8 lg:mb-12 animate-fade-in-up-delay px-2 relative z-50" ref={searchContainerRef}>
                  <div className="relative group">
                    <Input
                      type="text"
                      placeholder="Search Netflix, Spotify, Gaming..."
                      className="pl-4 sm:pl-6 pr-16 sm:pr-20 py-4 sm:py-5 lg:py-6 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border-2 border-pink-500/30 text-text placeholder-muted focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 text-sm sm:text-base lg:text-xl shadow-2xl transition-all duration-300 group-hover:border-pink-500/50"
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
                      className="absolute inset-y-0 right-0 mr-2 sm:mr-3 my-2 sm:my-3 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl p-0 shadow-xl transform hover:scale-105 transition-all duration-300"
                      data-testid="hero-search-button"
                      onClick={() => handleSearch()}
                    >
                      {isSearchLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />}
                    </Button>

                    {/* Search Suggestions Dropdown */}
                    {showSuggestions && searchQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1419] border border-pink-500/30 rounded-2xl shadow-2xl overflow-hidden z-[9999] text-left max-h-80 overflow-y-auto">
                        {isSearchLoading ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-pink-500" />
                          </div>
                        ) : suggestions.length > 0 ? (
                          <>
                            {suggestions.map((product) => (
                              <div
                                key={product.id}
                                className="p-3 sm:p-4 hover:bg-white/10 cursor-pointer border-b border-pink-500/10 last:border-0 transition-colors flex items-center justify-between group"
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
                                    <span className="text-white font-medium text-sm sm:text-base group-hover:text-pink-400 transition-colors">{product.listing_title || product.headline}</span>
                                    <span className="text-gray-400 text-xs">{product.category?.name} • {product.vendor?.username}</span>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                              </div>
                            ))}
                            <div
                              className="p-3 bg-[#0f1419] text-center text-pink-400 text-sm font-semibold cursor-pointer hover:bg-[#1a1f2e] transition-colors sticky bottom-0 border-t border-pink-500/20 z-[10000]"
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

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 lg:gap-6 xl:gap-12 text-xs sm:text-sm animate-fade-in-up-delay-2 px-4">
                  <div className="flex items-center bg-white/10 backdrop-blur-md px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 w-full sm:w-auto justify-center">
                    <Bitcoin className="text-warning w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-bounce flex-shrink-0" /> <span className="font-medium whitespace-nowrap">BTC & XMR Payments</span>
                  </div>
                  <div className="flex items-center bg-white/10 backdrop-blur-md px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 w-full sm:w-auto justify-center">
                    <Shield className="text-success w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-bounce flex-shrink-0" /> <span className="font-medium whitespace-nowrap">Escrow Protection</span>
                  </div>
                  <div className="flex items-center bg-white/10 backdrop-blur-md px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-full border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300 w-full sm:w-auto justify-center">
                    <UserX className="text-pink-500 w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 animate-bounce flex-shrink-0" /> <span className="font-medium whitespace-nowrap">Anonymous Trading</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section className="py-8 sm:py-12 lg:py-20 relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4 uppercase tracking-wider px-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#c4144b' }}>Featured Categories</h2>
              <div className="w-16 sm:w-20 lg:w-24 h-0.5 sm:h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {isLoading ? (
                [...Array(4)].map((_, index) => (
                  <Card key={`skeleton-cat-${index}`} className="crypto-card border-pink-500/20 overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-5 lg:mb-6 h-32 sm:h-36 lg:h-40 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-pink-500/10 animate-pulse">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded mb-3 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded mb-5 w-3/4 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded w-20 animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                        <div className="h-5 w-5 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : featuredCategories.map((category, index) => (
                <Card key={category.id} className="crypto-card cursor-pointer group border-pink-500/20 hover:border-pink-500/60 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20" data-testid={`category-${category.id}`} style={{ animationDelay: `${index * 100}ms` }} onClick={() => navigate(`/buyer/listings?category=${category.id}`)}>
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-4 sm:mb-5 lg:mb-6 group-hover:scale-110 transition-transform duration-500">
                      <img src={category.image} alt={category.title} className="w-full h-32 sm:h-36 lg:h-40 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-text mb-2 sm:mb-3 uppercase tracking-wide group-hover:text-pink-500 transition-colors duration-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{category.title}</h3>
                    <p className="text-xs sm:text-sm mb-4 sm:mb-5 lg:mb-6 uppercase text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-pink-500 text-xs sm:text-sm font-bold uppercase bg-pink-500/10 px-2 sm:px-3 py-1 rounded-full">{category.listings} listings</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:text-pink-500 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Listings */}
        <section className="py-8 sm:py-12 lg:py-20 bg-gradient-to-b from-surface to-bg relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4 uppercase tracking-wider px-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#c4144b' }}>Featured Listings</h2>
              <div className="w-16 sm:w-20 lg:w-24 h-0.5 sm:h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto rounded-full mb-4 sm:mb-6 lg:mb-8"></div>
              <Link to="/buyer/listings" className="inline-flex items-center text-pink-500 hover:text-pink-400 font-bold text-sm sm:text-base lg:text-lg uppercase tracking-wide transition-all duration-300 hover:translate-x-2 px-4">View All Listings <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" /></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {isLoading || displayListings.length === 0 ? (
                [...Array(3)].map((_, index) => (
                  <Card key={`skeleton-list-${index}`} className="bg-bg border border-border overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-4 sm:p-5 lg:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-6 w-20 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                        <div className="h-8 w-8 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded mb-2 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded mb-1 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="h-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded mb-4 w-3/4 animate-pulse relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded-full animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                          </div>
                          <div className="h-4 w-16 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                          </div>
                          <div className="h-4 w-12 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-5 w-24 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                        <div className="h-9 w-20 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 rounded animate-pulse relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : displayListings.map((listing) => (
                <Card key={listing.id} className="bg-bg border border-border hover:border-pink-500/30 transition-colors cursor-pointer" data-testid={`listing-${listing.id}`}>
                  <CardContent className="p-4 sm:p-5 lg:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <StatusBadge status={listing.delivery_method || 'Instant'} type={listing.delivery_method?.toLowerCase().includes('instant') ? 'success' : 'accent'} />
                      <Button variant="ghost" size="sm" className="hover:text-pink-500" data-testid={`favorite-${listing.id}`}><Heart className="w-4 h-4" /></Button>
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-2 line-clamp-1">{listing.listing_title}</h3>
                    <p className="text-sm mb-4 line-clamp-2 text-gray-400 min-h-[40px]">{listing.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-pink-500/20 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" /></svg>
                        </div>
                        <span className="text-sm text-text">{listing.vendor?.username}</span>
                        <div className="flex items-center"><Star className="text-warning w-3 h-3 fill-current" /> <span className="text-xs ml-1">{listing.rating || '5.0'} ({listing.review_count || 10})</span></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2"><Bitcoin className="text-warning w-4 h-4" /> <span className="font-mono text-sm text-text">{listing.price}</span></div>
                      </div>
                      <Button className="text-white text-sm font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: '#c02053ff' }} data-testid={`buy-${listing.id}`} onClick={() => navigate(`/buyer/listings?search=${encodeURIComponent(listing.listing_title)}&openView=${listing.id}`)}>Buy Now</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="py-8 sm:py-12 lg:py-16 relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10 lg:mb-12">
              <h2 className="text-xl sm:text-2xl font-bold text-text mb-3 sm:mb-4 uppercase px-4">
                Why Choose Account<span className="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-pink-800 font-black inline-block transform -rotate-6 mx-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Z</span>Club?
              </h2>
              <p className="max-w-2xl mx-auto text-sm sm:text-base px-4">We prioritize your privacy and security above all else, providing a safe environment for anonymous digital commerce.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><UserX className="text-pink-500 w-8 h-8" /></div>
                <h3 className="text-lg font-semibold text-text mb-2 uppercase">Anonymous Trading</h3>
                <p className="">No personal data required. Trade with complete privacy using only usernames and recovery phrases.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield className="text-pink-500 w-8 h-8" /></div>
                <h3 className="text-lg font-semibold text-text mb-2 uppercase">Escrow Protection</h3>
                <p className="">Your payments are held securely until delivery is confirmed, protecting both buyers and sellers.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><Bitcoin className="text-pink-500 w-8 h-8" /></div>
                <h3 className="text-lg font-semibold text-text mb-2 uppercase">Crypto Payments</h3>
                <p className="">Accept Bitcoin and Monero for maximum privacy and security in all transactions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-b from-bg to-gray-900 border-t border-pink-500/20 relative z-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="flex items-center mb-4 sm:mb-6">
                  <Link to="/" className="flex items-center flex-shrink-0 pr-4 sm:pr-8">
                    <img src="/images/logo.png" alt="AccountzClub Logo" className="h-8 sm:h-10 lg:h-12 w-auto" style={{ imageRendering: '-webkit-optimize-contrast', transformOrigin: 'left center' }} />
                  </Link>
                </div>
                <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed">The secure, anonymous marketplace for digital accounts. Trade safely with cryptocurrency payments and escrow protection.</p>
                <p className="text-xs sm:text-sm text-gray-400 bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-pink-500/20">We do not collect unnecessary personal data. Accounts are anonymous. Use recovery phrase to regain access.</p>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Marketplace</h4>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                  <li><Link to="/buyer/listings" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Browse Listings</Link></li>
                  <li><Link to="/buyer/listings" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Categories</Link></li>
                  <li><Link to="/buyer/home" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Featured Vendors</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">How It Works</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Support</h4>
                <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                  <li><Link to="/buyer/support" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Help Center</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Dispute Resolution</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Privacy Policy</Link></li>
                  <li><Link to="/buyer/support" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-pink-500/20 mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-7 lg:pt-8 text-center">
              <p className="text-xs sm:text-sm text-gray-400 flex items-center justify-center gap-1 sm:gap-2 flex-wrap px-4">
                <span>© 2026</span>
                <Link to="/" className="inline-flex items-center">
                  <img src="/images/logo.png" alt="AccountzClub Logo" className="h-10 w-auto mb-1" style={{ imageRendering: '-webkit-optimize-contrast' }} />
                </Link>
                <span> All rights reserved. • Privacy-first anonymous marketplace</span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}