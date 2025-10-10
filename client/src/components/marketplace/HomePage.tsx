import { Bitcoin, Shield, UserX, ArrowRight, Star, Heart, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SAMPLE_CATEGORIES, SAMPLE_LISTINGS } from "@/lib/constants";
import { Link } from "wouter";

export function HomePage() {
  return (
    <>
      {/* Preload critical images for smooth loading */}
      <link rel="preload" as="image" href="/images/vendor-main-bg.png" />
      <link rel="preload" as="image" href="/images/ac-logo-monogram.png" />
      <link rel="preload" as="image" href="/images/the-one-and-only.png" />
      <link rel="preload" as="image" href="/images/logo.png" />
      
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulseSlow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-fade-in-up-delay {
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }
        
        .animate-fade-in-up-delay-2 {
          animation: fadeInUp 0.8s ease-out 0.4s both;
        }
        
        .animate-pulse-slow {
          animation: pulseSlow 3s ease-in-out infinite;
        }
        
        /* Apply modern font family */
        .homepage-font {
          font-family: 'Inter', 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Ensure images load smoothly */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      `}</style>
      <div className="min-h-screen relative vendor-main-background homepage-font">
      {/* Vendor Background */}
      <div className="absolute inset-0 opacity-20">
        <img 
          src="/images/vendor-main-bg.png" 
          alt="Background" 
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      
      {/* Geometric Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ec4899' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>
      
      {/* Vertical Pink Line */}
      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-pink-500 to-pink-600 z-20"></div>
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-transparent via-surface/50 to-surface relative z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* AC Logo and THE ONE AND ONLY */}
            <div className="mb-12 animate-fade-in-up">
              <div className="mb-6 transform hover:scale-105 transition-transform duration-500">
                <img 
                  src="/images/ac-logo-monogram.png" 
                  alt="AC Logo Monogram" 
                  className="w-40 h-40 object-contain mx-auto drop-shadow-2xl"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <div className="mb-0 animate-pulse-slow">
                <img 
                  src="/images/the-one-and-only.png" 
                  alt="THE ONE AND ONLY" 
                  className="h-10 object-contain mx-auto filter drop-shadow-lg"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-12 animate-fade-in-up-delay">
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="Search Netflix, Spotify, Gaming accounts..."
                  className="pl-6 pr-20 py-6 rounded-3xl bg-white/10 backdrop-blur-md border-2 border-pink-500/30 text-text placeholder-muted focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 text-xl shadow-2xl transition-all duration-300 group-hover:border-pink-500/50"
                  data-testid="hero-search-input"
                />
                <Button className="absolute inset-y-0 right-0 mr-3 my-3 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white w-14 h-14 rounded-2xl p-0 shadow-xl transform hover:scale-105 transition-all duration-300" data-testid="hero-search-button">
                  <Search className="w-6 h-6" />
                </Button>
              </div>
            </div>
            
            {/* Trust Badges */}
            <div className="flex items-center justify-center space-x-12 text-sm animate-fade-in-up-delay-2">
              <div className="flex items-center bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300">
                <Bitcoin className="text-warning w-5 h-5 mr-3 animate-bounce" />
                <span className="font-medium">BTC & XMR Payments</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300">
                <Shield className="text-success w-5 h-5 mr-3 animate-bounce" />
                <span className="font-medium">Escrow Protection</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-pink-500/20 hover:border-pink-500/40 transition-all duration-300">
                <UserX className="text-pink-500 w-5 h-5 mr-3 animate-bounce" />
                <span className="font-medium">Anonymous Trading</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Categories */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-4 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Featured Categories
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {SAMPLE_CATEGORIES.map((category, index) => (
              <Card key={category.id} className="crypto-card cursor-pointer group border-pink-500/20 hover:border-pink-500/60 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/20" data-testid={`category-${category.id}`} style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="p-8">
                  <div className="relative overflow-hidden rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-500">
                  <img 
                    src={category.image} 
                    alt={category.title}
                      className="w-full h-40 object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <h3 className="text-xl font-bold text-text mb-3 uppercase tracking-wide group-hover:text-pink-500 transition-colors duration-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{category.title}</h3>
                  <p className="text-sm mb-6 uppercase text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-pink-500 text-sm font-bold uppercase bg-pink-500/10 px-3 py-1 rounded-full">{category.listings} listings</span>
                    <ArrowRight className="w-5 h-5 group-hover:text-pink-500 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Featured Listings */}
      <section className="py-20 bg-gradient-to-b from-surface to-bg relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-4 uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Featured Listings
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto rounded-full mb-8"></div>
            <a href="#" className="inline-flex items-center text-pink-500 hover:text-pink-400 font-bold text-lg uppercase tracking-wide transition-all duration-300 hover:translate-x-2">
              View All Listings
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_LISTINGS.map((listing) => (
              <Card key={listing.id} className="bg-bg border border-border hover:border-pink-500/30 transition-colors cursor-pointer" data-testid={`listing-${listing.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <StatusBadge 
                      status={listing.delivery} 
                      type={listing.deliveryType === 'success' ? 'success' : listing.deliveryType === 'warning' ? 'warning' : 'accent'} 
                    />
                    <Button variant="ghost" size="sm" className="hover:text-pink-500" data-testid={`favorite-${listing.id}`}>
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-text mb-2">{listing.title}</h3>
                  <p className="text-sm mb-4">{listing.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-pink-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-text">{listing.vendor}</span>
                      <div className="flex items-center">
                        <Star className="text-warning w-3 h-3 fill-current" />
                        <span className="text-xs ml-1">{listing.rating} ({listing.reviews})</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Bitcoin className="text-warning w-4 h-4" />
                        <span className="font-mono text-sm text-text">{listing.btcPrice} BTC</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z"/>
                        </svg>
                        <span className="font-mono text-sm text-text">{listing.xmrPrice} XMR</span>
                      </div>
                    </div>
                    <Button className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium" data-testid={`buy-${listing.id}`}>
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Privacy & Security Info */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-text mb-4 uppercase">Why Choose AccountzClub?</h2>
            <p className="max-w-2xl mx-auto">
              We prioritize your privacy and security above all else, providing a safe environment for anonymous digital commerce.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserX className="text-pink-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2 uppercase">Anonymous Trading</h3>
              <p className="">No personal data required. Trade with complete privacy using only usernames and recovery phrases.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-pink-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2 uppercase">Escrow Protection</h3>
              <p className="">Your payments are held securely until delivery is confirmed, protecting both buyers and sellers.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bitcoin className="text-pink-500 w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2 uppercase">Crypto Payments</h3>
              <p className="">Accept Bitcoin and Monero for maximum privacy and security in all transactions.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gradient-to-b from-bg to-gray-900 border-t border-pink-500/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center mb-6">
            <Link href="/" className="flex items-center flex-shrink-0 pr-8">
              <img 
                src="/images/logo.png" 
                alt="AccountzClub Logo" 
                className="h-18 w-auto"
                style={{ 
                  imageRendering: '-webkit-optimize-contrast',
                  transform: 'scale(1.5) translateY(3px)',
                  transformOrigin: 'left center'
                }}
              />
            </Link>
                
              </div>
              <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                The secure, anonymous marketplace for digital accounts. Trade safely with cryptocurrency payments and escrow protection.
              </p>
              <p className="text-sm text-gray-400 bg-gray-800/50 p-4 rounded-lg border border-pink-500/20">
                🔒 We do not collect unnecessary personal data. Accounts are anonymous. Use recovery phrase to regain access.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-6 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Marketplace</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Browse Listings</a></li>
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Categories</a></li>
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Featured Vendors</a></li>
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">How It Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold text-white mb-6 uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Support</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Help Center</a></li>
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Dispute Resolution</a></li>
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-300 hover:text-pink-500 transition-all duration-300 hover:translate-x-2 inline-block">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-pink-500/20 mt-12 pt-8 text-center">
            <p className="text-sm text-gray-400 flex items-center justify-center gap-2 flex-wrap">
              <span>© 2024</span>
              <Link href="/" className="inline-flex items-center">
                <img 
                  src="/images/logo.png" 
                  alt="AccountzClub Logo" 
                  className="h-20 w-auto"
                  style={{ 
                    imageRendering: '-webkit-optimize-contrast',
                    transform: 'translateY(8px)',
                  }}
                />
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
