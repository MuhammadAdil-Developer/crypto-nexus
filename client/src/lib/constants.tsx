import { 
  BarChart3, 
  Users, 
  Store, 
  List, 
  ShoppingCart, 
  Gavel,
  MessageSquare,
  Ticket,
  Bitcoin,
  Wallet,
  Percent,
  Megaphone,
  Tags,
  Gift,
  Bell,
  Shield,
  Lock,
  Palette
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  {
    title: "Overview",
    icon: BarChart3,
    href: "/admin",
    badge: null,
    active: true
  },
  {
    title: "Users",
    icon: Users,
    href: "/admin/users",
    badge: { text: "23", type: "warning" }
  },
  {
    title: "Vendors",
    icon: Store,
    href: "/admin/vendors",
    badge: { text: "7", type: "accent" }
  },
  {
    title: "Listings",
    icon: List,
    href: "/admin/listings",
    badge: null
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/admin/orders",
    badge: { text: "156", type: "success" }
  },
  {
    title: "Disputes",
    icon: Gavel,
    href: "/admin/disputes",
    badge: { text: "3", type: "danger" }
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/admin/messages",
    badge: null
  },
  {
    title: "Tickets",
    icon: Ticket,
    href: "/admin/tickets",
    badge: { text: "12", type: "warning" }
  },
  {
    title: "Crypto",
    icon: Bitcoin,
    href: "/admin/crypto",
    badge: null
  },
  {
    title: "Payouts & Refunds",
    icon: Wallet,
    href: "/admin/payouts",
    badge: null
  },
  {
    title: "Commissions",
    icon: Percent,
    href: "/admin/commissions",
    badge: null
  },
  {
    title: "Ads",
    icon: Megaphone,
    href: "/admin/ads",
    badge: null
  },
  {
    title: "Categories",
    icon: Tags,
    href: "/admin/categories",
    badge: null
  },
  {
    title: "Gift Cards",
    icon: Gift,
    href: "/admin/gift-cards",
    badge: null
  },
  {
    title: "Alerts",
    icon: Bell,
    href: "/admin/alerts",
    badge: null
  },
  {
    title: "Roles & Permissions",
    icon: Shield,
    href: "/admin/roles",
    badge: null
  },
  {
    title: "Security",
    icon: Lock,
    href: "/admin/security",
    badge: null
  },
  {
    title: "Branding",
    icon: Palette,
    href: "/admin/branding",
    badge: null
  }
];

export const SAMPLE_ORDERS = [
  {
    id: "ORD-2847",
    buyer: "user_7824",
    vendor: "CryptoAccountsPlus",
    listing: "Netflix Premium Account (1 Year)",
    amount: "0.0012 BTC",
    status: "Delivered",
    statusType: "success" as const,
    created: "2 hours ago"
  },
  {
    id: "ORD-2846", 
    buyer: "anon_user_423",
    vendor: "DigitalVault",
    listing: "Spotify Premium (6 Months)",
    amount: "0.0008 BTC",
    status: "In Escrow",
    statusType: "warning" as const,
    created: "4 hours ago"
  },
  {
    id: "ORD-2845",
    buyer: "crypto_buyer_89", 
    vendor: "SecureAccounts",
    listing: "YouTube Premium (3 Months)",
    amount: "1.24 XMR",
    status: "Confirming",
    statusType: "accent" as const,
    created: "6 hours ago"
  },
  {
    id: "ORD-2844",
    buyer: "privacy_first",
    vendor: "PremiumDigital", 
    listing: "Disney+ (1 Year Subscription)",
    amount: "0.0015 BTC",
    status: "Disputed",
    statusType: "danger" as const,
    created: "8 hours ago"
  }
];

export const SAMPLE_ACTIVITY = [
  {
    id: 1,
    type: "success",
    title: "New vendor approved",
    description: "CryptoAccountsPlus • 5 min ago"
  },
  {
    id: 2,
    type: "warning", 
    title: "Dispute opened",
    description: "Order #ORD-2847 • 12 min ago"
  },
  {
    id: 3,
    type: "accent",
    title: "Large order completed",
    description: "2.4 BTC • 18 min ago" 
  },
  {
    id: 4,
    type: "success",
    title: "Escrow released", 
    description: "Order #ORD-2845 • 22 min ago"
  },
  {
    id: 5,
    type: "muted",
    title: "System maintenance",
    description: "XMR node sync • 1 hr ago"
  }
];

export const SAMPLE_CATEGORIES = [
  {
    id: 1,
    title: "Streaming Services",
    description: "Netflix, Spotify, Disney+, Hulu and more",
    listings: 247,
    image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"
  },
  {
    id: 2,
    title: "Gaming Accounts",
    description: "Steam, Epic Games, Xbox, PlayStation", 
    listings: 189,
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"
  },
  {
    id: 3,
    title: "Software & Tools",
    description: "Adobe, Microsoft, Figma, Notion",
    listings: 156,
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"
  },
  {
    id: 4, 
    title: "VPN & Security",
    description: "NordVPN, ExpressVPN, Antivirus",
    listings: 98,
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200"
  }
];

export const SAMPLE_LISTINGS = [
  {
    id: 1,
    title: "Netflix Premium Account (1 Year)",
    description: "Full access to Netflix Premium with 4K streaming, 4 screens, and download capability. Warranty included.",
    vendor: "CryptoAccountsPlus",
    rating: 4.9,
    reviews: 234,
    btcPrice: "0.0012",
    xmrPrice: "0.84",
    delivery: "Instant Delivery",
    deliveryType: "success" as const
  },
  {
    id: 2,
    title: "Spotify Premium (6 Months)",
    description: "Individual Spotify Premium account with offline downloads, no ads, and unlimited skips.",
    vendor: "DigitalVault",
    rating: 4.7,
    reviews: 89,
    btcPrice: "0.0008", 
    xmrPrice: "0.56",
    delivery: "Escrow Only",
    deliveryType: "warning" as const
  },
  {
    id: 3,
    title: "Adobe Creative Cloud (1 Year)", 
    description: "Full access to all Adobe apps including Photoshop, Illustrator, After Effects, and more.",
    vendor: "PremiumSoft",
    rating: 4.8,
    reviews: 156,
    btcPrice: "0.0034",
    xmrPrice: "2.47", 
    delivery: "Manual Delivery",
    deliveryType: "accent" as const
  }
];
