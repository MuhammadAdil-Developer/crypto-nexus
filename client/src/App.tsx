import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import BuyerDashboard from "@/pages/buyer/buyer-dashboard";
import MarketplaceHome from "@/pages/marketplace/home";

function Router() {
  return (
    <div className="h-full bg-bg text-text">
      <Switch>
        <Route path="/" component={MarketplaceHome} />
        <Route path="/buyer" component={BuyerDashboard} />
        <Route path="/buyer/:section*" component={BuyerDashboard} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/:section*" component={AdminDashboard} />
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
