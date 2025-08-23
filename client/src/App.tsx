import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import BuyerDashboard from "@/pages/buyer/buyer-dashboard";
import MarketplaceHome from "@/pages/marketplace/home";

// Vendor Pages
import VendorApply from "@/pages/vendor/apply";
import VendorApplySuccess from "@/pages/vendor/apply-success";
import VendorDashboard from "@/pages/vendor/dashboard";
import VendorListings from "@/pages/vendor/listings";
import VendorOrders from "@/pages/vendor/orders";
import VendorMessages from "@/pages/vendor/messages";
import VendorAnalytics from "@/pages/vendor/analytics";
import VendorReviews from "@/pages/vendor/reviews";
import VendorAds from "@/pages/vendor/ads";
import VendorDisputes from "@/pages/vendor/disputes";
import VendorPayouts from "@/pages/vendor/payouts";
import VendorSettings from "@/pages/vendor/settings";
import VendorSupport from "@/pages/vendor/support";
import VendorAddProduct from "@/pages/vendor/add-product";

// Auth Pages
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import ForgotPassword from "@/pages/auth/forgot-password";

function Router() {
  return (
    <div className="h-full bg-bg text-text">
      <Switch>
        <Route path="/" component={MarketplaceHome} />
        
        {/* Auth Routes */}
        <Route path="/sign-in" component={SignIn} />
        <Route path="/sign-up" component={SignUp} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/buyer" component={BuyerDashboard} />
        <Route path="/buyer/:section*" component={BuyerDashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/:section*" component={AdminDashboard} />
        
        {/* Vendor Routes */}
        <Route path="/vendor/apply" component={VendorApply} />
        <Route path="/vendor/apply/success" component={VendorApplySuccess} />
        <Route path="/vendor/dashboard" component={VendorDashboard} />
        <Route path="/vendor/listings" component={VendorListings} />
        <Route path="/vendor/listings/add" component={VendorAddProduct} />
        <Route path="/vendor/orders" component={VendorOrders} />
        <Route path="/vendor/messages" component={VendorMessages} />
        <Route path="/vendor/analytics" component={VendorAnalytics} />
        <Route path="/vendor/reviews" component={VendorReviews} />
        <Route path="/vendor/ads" component={VendorAds} />
        <Route path="/vendor/disputes" component={VendorDisputes} />
        <Route path="/vendor/payouts" component={VendorPayouts} />
        <Route path="/vendor/settings" component={VendorSettings} />
        <Route path="/vendor/support" component={VendorSupport} />
        
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
