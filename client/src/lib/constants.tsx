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
  Palette,
  ChevronDown,
  ChevronRight
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  {
    title: "Overview",
    icon: BarChart3,
    href: "/admin",
    badge: null
  },
  {
    title: "Users",
    icon: Users,
    href: "/admin/users",
    badge: { text: "2,847", type: "accent" }
  },
  {
    title: "Vendors",
    icon: Store,
    href: "/admin/vendors",
    badge: { text: "7", type: "warning" }
  },
  {
    title: "Listings",
    icon: List,
    href: "/admin/listings",
    badge: { text: "1,432", type: "success" }
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/admin/orders",
    badge: { text: "89", type: "accent" }
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
    badge: { text: "24", type: "accent" }
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
    badge: { text: "23", type: "warning" }
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
    badge: { text: "8", type: "success" }
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
    badge: { text: "45", type: "accent" }
  },
  {
    title: "Alerts",
    icon: Bell,
    href: "/admin/alerts",
    badge: { text: "5", type: "danger" }
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

export const ADMIN_GROUPED_NAV = [
  {
    category: "Core Management",
    icon: BarChart3,
    items: [
      {
        title: "Overview",
        icon: BarChart3,
        href: "/admin",
        badge: null
      },
      {
        title: "Users",
        icon: Users,
        href: "/admin/users",
        badge: { text: "2,847", type: "accent" }
      },
      {
        title: "Vendors",
        icon: Store,
        href: "/admin/vendors",
        badge: { text: "7", type: "warning" }
      }
    ]
  },
  {
    category: "Commerce",
    icon: ShoppingCart,
    items: [
      {
        title: "Listings",
        icon: List,
        href: "/admin/listings",
        badge: { text: "1,432", type: "success" }
      },
      {
        title: "Orders",
        icon: ShoppingCart,
        href: "/admin/orders",
        badge: { text: "89", type: "accent" }
      },
      {
        title: "Disputes",
        icon: Gavel,
        href: "/admin/disputes",
        badge: { text: "3", type: "danger" }
      }
    ]
  },
  {
    category: "Communications",
    icon: MessageSquare,
    items: [
      {
        title: "Messages",
        icon: MessageSquare,
        href: "/admin/messages",
        badge: { text: "24", type: "accent" }
      },
      {
        title: "Tickets",
        icon: Ticket,
        href: "/admin/tickets",
        badge: { text: "12", type: "warning" }
      }
    ]
  },
  {
    category: "Financial",
    icon: Bitcoin,
    items: [
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
        badge: { text: "23", type: "warning" }
      },
      {
        title: "Commissions",
        icon: Percent,
        href: "/admin/commissions",
        badge: null
      }
    ]
  },
  {
    category: "Content & Marketing",
    icon: Megaphone,
    items: [
      {
        title: "Ads",
        icon: Megaphone,
        href: "/admin/ads",
        badge: { text: "8", type: "success" }
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
        badge: { text: "45", type: "accent" }
      }
    ]
  },
  {
    category: "System & Security",
    icon: Shield,
    items: [
      {
        title: "Alerts",
        icon: Bell,
        href: "/admin/alerts",
        badge: { text: "5", type: "danger" }
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
    ]
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

export const SAMPLE_USERS = [
  {
    id: 1,
    username: "crypto_buyer_89",
    email: "•••@••••.com",
    role: "Customer",
    status: "Active",
    statusType: "success" as const,
    joinDate: "2024-01-15",
    lastLogin: "2 hours ago",
    orders: 24,
    totalSpent: "2.4 BTC"
  },
  {
    id: 2,
    username: "anon_user_423", 
    email: "•••@••••.com",
    role: "Vendor",
    status: "Active",
    statusType: "success" as const,
    joinDate: "2023-11-08",
    lastLogin: "1 day ago",
    orders: 156,
    totalSpent: "0.8 BTC"
  },
  {
    id: 3,
    username: "privacy_first",
    email: "•••@••••.com", 
    role: "Customer",
    status: "Banned",
    statusType: "danger" as const,
    joinDate: "2024-02-20",
    lastLogin: "1 week ago",
    orders: 3,
    totalSpent: "0.2 BTC"
  },
  {
    id: 4,
    username: "user_7824",
    email: "•••@••••.com",
    role: "Customer", 
    status: "Active",
    statusType: "success" as const,
    joinDate: "2024-03-10",
    lastLogin: "30 min ago",
    orders: 8,
    totalSpent: "1.1 BTC"
  }
];

export const SAMPLE_VENDORS = [
  {
    id: 1,
    shopName: "CryptoAccountsPlus",
    owner: "vendor_alpha",
    status: "Approved",
    statusType: "success" as const,
    category: "Streaming Services",
    joinDate: "2023-08-15",
    listings: 47,
    totalSales: "12.8 BTC",
    rating: 4.9,
    reviews: 234,
    commission: "5%",
    lastActivity: "2 hours ago"
  },
  {
    id: 2,
    shopName: "DigitalVault",
    owner: "secure_vendor",
    status: "Pending",
    statusType: "warning" as const,
    category: "Software & Tools",
    joinDate: "2024-03-22",
    listings: 0,
    totalSales: "0 BTC",
    rating: 0,
    reviews: 0,
    commission: "5%",
    lastActivity: "1 day ago"
  },
  {
    id: 3,
    shopName: "PremiumSoft",
    owner: "software_expert",
    status: "Approved",
    statusType: "success" as const,
    category: "Software & Tools", 
    joinDate: "2023-12-03",
    listings: 23,
    totalSales: "8.4 BTC",
    rating: 4.8,
    reviews: 156,
    commission: "4%",
    lastActivity: "6 hours ago"
  }
];

export const SAMPLE_DISPUTES = [
  {
    id: 1,
    orderId: "ORD-2844",
    buyer: "privacy_first",
    vendor: "PremiumDigital",
    reason: "Account credentials not working",
    status: "Open",
    statusType: "danger" as const,
    created: "2 hours ago",
    amount: "0.0015 BTC",
    priority: "High"
  },
  {
    id: 2,
    orderId: "ORD-2831",
    buyer: "crypto_buyer_89", 
    vendor: "StreamAccounts",
    reason: "Wrong account type delivered",
    status: "In Review",
    statusType: "warning" as const,
    created: "1 day ago",
    amount: "0.0008 BTC",
    priority: "Medium"
  },
  {
    id: 3,
    orderId: "ORD-2823",
    buyer: "anon_user_423",
    vendor: "DigitalServices",
    reason: "Account suspended by provider",
    status: "Resolved",
    statusType: "success" as const,
    created: "3 days ago",
    amount: "0.0012 BTC",
    priority: "Low"
  }
];

export const SAMPLE_TICKETS = [
  {
    id: 1,
    ticketId: "TK-2024-001",
    user: "crypto_buyer_89",
    subject: "Unable to access purchased Netflix account",
    status: "Open",
    statusType: "danger" as const,
    priority: "High",
    created: "1 hour ago",
    lastReply: "1 hour ago",
    assignedTo: "support_agent_1"
  },
  {
    id: 2,
    ticketId: "TK-2024-002",
    user: "vendor_alpha",
    subject: "Commission rate change request",
    status: "In Progress", 
    statusType: "warning" as const,
    priority: "Medium",
    created: "6 hours ago",
    lastReply: "2 hours ago",
    assignedTo: "support_agent_2"
  },
  {
    id: 3,
    ticketId: "TK-2024-003",
    user: "privacy_first",
    subject: "Account recovery assistance needed",
    status: "Closed",
    statusType: "muted" as const,
    priority: "Low",
    created: "2 days ago",
    lastReply: "1 day ago",
    assignedTo: "support_agent_1"
  }
];
