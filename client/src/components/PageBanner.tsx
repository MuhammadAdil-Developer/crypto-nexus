import { cn } from "@/lib/utils";

// Banner Assets
import bannerLeftArrow from "@/assets/banner/arrow_left.png";
import bannerRightArrow from "@/assets/banner/arrow_right.png";
import buyerPattern from "@/assets/banner/pattern.png";
import buyerLogo from "@/assets/banner/logo.png";
import vendorPattern from "@/assets/banner/vendor/pattern.png";
import vendorLogo from "@/assets/banner/vendor/logo.png";

interface PageBannerProps {
    title: string;
    subtitle?: string;
    type?: 'buyer' | 'vendor';
    className?: string;
}

export function PageBanner({ title, subtitle, type = 'buyer', className }: PageBannerProps) {
    const pattern = type === 'vendor' ? vendorPattern : buyerPattern;
    const logo = type === 'vendor' ? vendorLogo : buyerLogo;

    return (
        <div className={cn(
            "relative w-full h-[120px] md:h-[180px] overflow-hidden rounded-2xl bg-black mb-10 border border-gray-800 shadow-2xl group",
            className
        )}>
            {/* Pattern Background */}
            <div
                className="absolute inset-0 w-full h-full opacity-60"
                style={{
                    backgroundImage: `url(${pattern})`,
                    backgroundRepeat: 'repeat-x',
                    backgroundSize: 'auto 100%'
                }}
            />

            {/* Left Arrow (Pinned Left) */}
            <img
                src={bannerLeftArrow}
                alt=""
                className="absolute left-0 top-0 h-full z-10 select-none pointer-events-none object-cover sm:object-fill"
                style={{ maxWidth: '30%' }}
            />

            {/* Right Arrow (Pinned Right) */}
            <img
                src={bannerRightArrow}
                alt=""
                className="absolute right-0 top-0 h-full z-10 select-none pointer-events-none object-cover sm:object-fill"
                style={{ maxWidth: '30%' }}
            />

            {/* Center Logo (Always Centered) */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 h-[70%] md:h-[80%] aspect-square flex items-center justify-center">
                <img
                    src={logo}
                    alt="Logo"
                    className="h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] scale-110 group-hover:scale-125 transition-transform duration-700"
                />
            </div>

            {/* Brand Text (Left Half) - Hidden on extra small screens to prevent overlap */}
            <div className="absolute left-[20%] top-1/2 transform -translate-y-1/2 z-20 hidden sm:block" style={{ maxWidth: '25%' }}>
                <h1
                    className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-black uppercase whitespace-nowrap"
                    style={{
                        fontFamily: "'Space Age', 'Orbitron', sans-serif",
                        filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.4))'
                    }}
                >
                    <span className="text-[#00F0FF]">{title}</span>
                </h1>
                {subtitle && (
                    <p className="text-gray-400/80 text-[10px] md:text-xs tracking-[0.3em] mt-1 ml-1 uppercase font-bold" style={{ fontFamily: "'Space Age', 'Orbitron', sans-serif" }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
