import { Bitcoin, Shield, UserX, ArrowRight, Star, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SAMPLE_CATEGORIES, SAMPLE_LISTINGS } from "@/lib/constants";

export function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Hero Section */}
      <section className="bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-text mb-6">
              Secure Digital Account Marketplace
            </h1>
            <p className="text-xl text-muted mb-8 max-w-3xl mx-auto">
              Trade premium accounts safely with cryptocurrency payments, escrow protection, and complete anonymity. Your privacy is our priority.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-muted" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Search Netflix, Spotify, Gaming accounts..."
                  className="pl-12 pr-4 py-4 rounded-2xl bg-surface-2 border-border text-text placeholder-muted focus:ring-accent focus:border-accent text-lg"
                  data-testid="hero-search-input"
                />
                <Button className="absolute inset-y-0 right-0 mr-2 my-2 bg-accent hover:bg-accent-2 text-bg px-6 rounded-xl" data-testid="hero-search-button">
                  Search
                </Button>
              </div>
            </div>
            
            {/* Trust Badges */}
            <div className="flex items-center justify-center space-x-8 text-sm text-muted">
              <div className="flex items-center">
                <Bitcoin className="text-warning w-4 h-4 mr-2" />
                <span>BTC & XMR Payments</span>
              </div>
              <div className="flex items-center">
                <Shield className="text-success w-4 h-4 mr-2" />
                <span>Escrow Protection</span>
              </div>
              <div className="flex items-center">
                <UserX className="text-accent w-4 h-4 mr-2" />
                <span>Anonymous Trading</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text mb-8">Featured Categories</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SAMPLE_CATEGORIES.map((category) => (
              <Card key={category.id} className="crypto-card cursor-pointer group" data-testid={`category-${category.id}`}>
                <CardContent className="p-6">
                  <img 
                    src={category.image} 
                    alt={category.title}
                    className="w-full h-32 object-cover rounded-xl mb-4" 
                  />
                  <h3 className="text-lg font-semibold text-text mb-2">{category.title}</h3>
                  <p className="text-muted text-sm mb-4">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-accent text-sm font-medium">{category.listings} listings</span>
                    <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Featured Listings */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-text">Featured Listings</h2>
            <a href="#" className="text-accent hover:text-accent-2 font-medium">View All →</a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_LISTINGS.map((listing) => (
              <Card key={listing.id} className="bg-bg border border-border hover:border-accent/30 transition-colors cursor-pointer" data-testid={`listing-${listing.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <StatusBadge status={listing.delivery} type={listing.deliveryType} />
                    <Button variant="ghost" size="sm" className="text-muted hover:text-danger" data-testid={`favorite-${listing.id}`}>
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-text mb-2">{listing.title}</h3>
                  <p className="text-muted text-sm mb-4">{listing.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-text">{listing.vendor}</span>
                      <div className="flex items-center">
                        <Star className="text-warning w-3 h-3 fill-current" />
                        <span className="text-xs text-muted ml-1">{listing.rating} ({listing.reviews})</span>
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
                        <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.605 16.695h-2.292l-1.689-2.646-1.689 2.646H10.64l2.646-4.141L10.64 8.414h2.295l1.689 2.646 1.689-2.646h2.292l-2.646 4.14 2.646 4.141z"/>
                        </svg>
                        <span className="font-mono text-sm text-text">{listing.xmrPrice} XMR</span>
                      </div>
                    </div>
                    <Button className="bg-accent text-bg hover:bg-accent-2 text-sm font-medium" data-testid={`buy-${listing.id}`}>
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
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-text mb-4">Why Choose CryptoMarket?</h2>
            <p className="text-muted max-w-2xl mx-auto">
              We prioritize your privacy and security above all else, providing a safe environment for anonymous digital commerce.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserX className="text-accent w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Anonymous Trading</h3>
              <p className="text-muted">No personal data required. Trade with complete privacy using only usernames and recovery phrases.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-accent w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Escrow Protection</h3>
              <p className="text-muted">Your payments are held securely until delivery is confirmed, protecting both buyers and sellers.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bitcoin className="text-accent w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">Crypto Payments</h3>
              <p className="text-muted">Accept Bitcoin and Monero for maximum privacy and security in all transactions.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Shield className="text-bg w-4 h-4" />
                </div>
                <h3 className="ml-3 text-xl font-bold text-text">CryptoMarket</h3>
              </div>
              <p className="text-muted mb-4">The secure, anonymous marketplace for digital accounts. Trade safely with cryptocurrency payments and escrow protection.</p>
              <p className="text-xs text-muted">We do not collect unnecessary personal data. Accounts are anonymous. Use recovery phrase to regain access.</p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-text mb-4">Marketplace</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-text">Browse Listings</a></li>
                <li><a href="#" className="hover:text-text">Categories</a></li>
                <li><a href="#" className="hover:text-text">Featured Vendors</a></li>
                <li><a href="#" className="hover:text-text">How It Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-text mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-text">Help Center</a></li>
                <li><a href="#" className="hover:text-text">Dispute Resolution</a></li>
                <li><a href="#" className="hover:text-text">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-text">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-xs text-muted">
              © 2024 CryptoMarket. All rights reserved. • Privacy-first anonymous marketplace
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
