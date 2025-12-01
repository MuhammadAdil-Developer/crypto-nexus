import { useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Overview } from "@/components/admin/Overview";

// Import all admin page components
import Users from "./users";
import Vendors from "./vendors";
import Listings from "./listings";
import Orders from "./orders";
import Disputes from "./disputes";
import RefundDisputes from "./refund-disputes";
import Messages from "./messages";
import Tickets from "./tickets";
import Crypto from "./crypto";
import Payouts from "./payouts";
import Commissions from "./commissions";
import Ads from "./ads";
import Categories from "./categories";
import GiftCards from "./gift-cards";
import Alerts from "./alerts";
import Roles from "./roles";
import Security from "./security";
import Branding from "./branding";
import Settings from "./settings";
import Notifications from "./notifications";

// Component mapping
const ADMIN_COMPONENTS: Record<string, () => JSX.Element> = {
  "": Overview,
  "users": Users,
  "vendors": Vendors,
  "listings": Listings,
  "orders": Orders,
  "disputes": Disputes,
  "refund-disputes": RefundDisputes,
  "messages": Messages,
  "tickets": Tickets,
  "crypto": Crypto,
  "payouts": Payouts,
  "commissions": Commissions,
  "ads": Ads,
  "categories": Categories,
  "gift-cards": GiftCards,
  "alerts": Alerts,
  "roles": Roles,
  "security": Security,
  "branding": Branding,
  "settings": Settings,
  "notifications": Notifications,
};

// Section name mapping for breadcrumbs
const SECTION_NAMES: Record<string, string> = {
  "": "Overview",
  "users": "Users",
  "vendors": "Vendors",
  "listings": "Listings",
  "orders": "Orders",
  "disputes": "Disputes",
  "refund-disputes": "Refund & Dispute Management",
  "messages": "Messages",
  "tickets": "Tickets",
  "crypto": "Crypto",
  "payouts": "Payouts & Refunds",
  "commissions": "Commissions",
  "ads": "Ads",
  "categories": "Categories",
  "gift-cards": "Gift Cards",
  "alerts": "Alerts",
  "roles": "Roles & Permissions",
  "security": "Security",
  "branding": "Branding",
  "settings": "Settings",
  "notifications": "Notifications",
};

export default function AdminDashboard() {
  const location = useLocation();
  
  // Extract section from URL path (e.g., "/admin/users" -> "users", "/admin" -> "")
  const section = location.pathname.replace(/^\/admin\/?/, "");
  
  // Get the component for this section, fallback to Overview
  const Component = ADMIN_COMPONENTS[section] || Overview;
  const sectionName = SECTION_NAMES[section] || "Overview";

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: sectionName }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <Component />
    </AdminLayout>
  );
}
