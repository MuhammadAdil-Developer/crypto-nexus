import { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles, ChevronRight, Zap, Target, User, Tag } from "lucide-react";
import { getImageUrl } from "@/config/api";
import placeholderImage from "@/assets/placeholder.png";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import brandLogo from "@/assets/banner/logo.png";

export interface SpotlightProduct {
  id: number;
  listing_title: string;
  description?: string;
  price: string;
  main_image?: string | null;
  vendor?: { username: string };
  category?: { name: string };
  is_giveaway?: boolean;
  is_currently_highlighted?: boolean;
  highlighted_until?: string | null;
}

export interface SpotlightMeta {
  count: number;
  unique_vendors: number;
}

export function FeaturedOfferSpotlight({
  products,
  loading,
  onProductClick,
}: {
  products: SpotlightProduct[];
  meta?: SpotlightMeta | null;
  loading?: boolean;
  onProductClick?: (id: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for right, -1 for left
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % products.length);
  }, [products.length]);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    // Increased to 8 seconds for a more professional, readable pace
    autoPlayRef.current = setInterval(nextSlide, 8000);
  }, [nextSlide]);

  useEffect(() => {
    if (products.length > 1) {
      startAutoPlay();
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [products.length, startAutoPlay]);

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto mb-16 px-4">
        <div className="relative bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] h-52 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-theme-cyan/5 via-transparent to-theme-cyan/5 animate-pulse" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-theme-cyan/20 blur-2xl rounded-full animate-ping opacity-30" />
              <img src={brandLogo} className="h-16 w-auto opacity-40 grayscale brightness-150 animate-pulse relative z-10" alt="Loading..." />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1 w-12 bg-gray-800 rounded-full" />
              <div className="text-[10px] font-black text-gray-700 uppercase tracking-[0.4em]">Establishing Uplink</div>
              <div className="h-1 w-12 bg-gray-800 rounded-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      filter: "blur(10px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      filter: "blur(10px)",
    }),
  };

  const product = products[currentIndex];
  const img = getImageUrl(product.main_image) || placeholderImage;

  return (
    <section className="max-w-6xl mx-auto mb-16 px-4 relative group">
      {/* Centered Premium Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-theme-cyan" />
          <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-theme-cyan animate-pulse" />
            Featured right now ({products.length})
            <Sparkles className="w-4 h-4 text-theme-cyan animate-pulse" />
          </h2>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-theme-cyan" />
        </div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Promoted by the seller · ranked by sales, ratings & trust
        </p>
      </div>

      {/* Background Glow - Enhanced Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-theme-cyan/10 blur-[120px] rounded-full opacity-30 group-hover:opacity-50 transition-all duration-1000 pointer-events-none" />

      <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
        {/* Progress Navigation Line */}
        <div className="absolute top-0 left-0 right-0 p-1 flex gap-1 z-20">
          {products.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full transition-all duration-700 ${idx === currentIndex ? "bg-theme-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-white/5"
                }`}
            />
          ))}
        </div>

        {/* Carousel Content */}
        <div className="relative h-44 sm:h-52 flex items-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 200, damping: 25 },
                opacity: { duration: 0.5 },
                filter: { duration: 0.5 },
              }}
              className="absolute inset-0 flex items-center"
            >
              <div
                onClick={() => onProductClick?.(product.id)}
                className="w-full h-full flex items-center px-10 sm:px-24 group/item relative cursor-pointer"
                onMouseEnter={() => autoPlayRef.current && clearInterval(autoPlayRef.current)}
                onMouseLeave={() => startAutoPlay()}
              >
                {/* Decorative Pattern Layer */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(34,211,238,0.1) 1px, transparent 0)', backgroundSize: '32px 32px' }} />

                <div className="flex-1 flex items-center gap-6 sm:gap-12 min-w-0">
                  {/* Left: Product Image */}
                  <div className="relative shrink-0">
                    <div className="absolute -inset-4 bg-theme-cyan/20 blur-xl opacity-0 group-hover/item:opacity-100 transition-opacity rounded-full animate-pulse" />
                    <div className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-[2rem] bg-gray-950 border-2 border-white/10 overflow-hidden flex items-center justify-center p-4 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                      <img
                        src={img}
                        alt=""
                        className="max-h-full max-w-full object-contain transition-transform duration-1000 group-hover/item:scale-110 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                        onError={(e) => {
                          e.currentTarget.src = placeholderImage;
                        }}
                      />
                    </div>
                  </div>

                  {/* Middle: Expanded Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-theme-cyan/10 text-theme-cyan border-theme-cyan/20 text-[9px] px-1.5 h-4 font-black uppercase tracking-tighter">
                        Official Ad
                      </Badge>
                      <div className="h-1 w-1 rounded-full bg-gray-700" />
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        ID: {product.id}
                      </span>
                    </div>

                    <h3
                      className="text-lg sm:text-2xl font-black text-white truncate leading-tight group-hover/item:text-theme-cyan transition-colors mb-2 uppercase tracking-tight"
                      style={{ fontFamily: "'Space Age', 'Orbitron', sans-serif" }}
                    >
                      {product.listing_title}
                    </h3>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">
                        <User className="w-3 h-3 text-accent" />
                        <span className="text-[11px] font-bold text-gray-300">@{product.vendor?.username || "seller"}</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">
                        <Tag className="w-3 h-3 text-blue-400" />
                        <span className="text-[11px] font-bold text-blue-100/60 uppercase">{product.category?.name || "General"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle-Right: Trust Box (New Section to fill space) */}
                  <div className="hidden md:flex flex-col gap-2 shrink-0 border-l border-white/5 pl-8">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      INSTANT DELIVERY
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <Target className="w-3.5 h-3.5 text-theme-red" />
                      <span className="uppercase">{product.category?.name || "Premium Listing"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      TRUSTED VENDOR
                    </div>
                  </div>
                </div>

                {/* Right: Pricing & CTA */}
                <div className="flex items-center gap-6 sm:gap-12 shrink-0 ml-8 sm:ml-12 pr-2">
                  <div className="flex flex-col items-end">
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-baseline gap-1 tracking-tighter">
                      <span className="text-sm font-normal text-theme-cyan/60">$</span>
                      {parseFloat(String(product.price).replace(/[^0-9.-]/g, "") || "0").toFixed(2)}
                    </div>
                    {product.is_giveaway && (
                      <div className="mt-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 rounded uppercase tracking-widest animate-bounce">
                        Free Giveaway
                      </div>
                    )}
                  </div>
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center group-hover/item:scale-110 group-hover/item:bg-theme-cyan group-hover/item:border-theme-cyan group-hover/item:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-500">
                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white group-hover/item:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Hint */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        Hover to pause · Sliding auto
      </div>
    </section>
  );
}
