import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ToastProvider from './components/ui/ToastContainer';
import { Toaster } from '@/components/ui/toaster';
import { MessagingProvider } from '@/contexts/MessagingContext';
import { CartProvider } from '@/contexts/CartContext';
import { AdminCountsProvider } from '@/contexts/AdminCountsContext';
import { VendorCountsProvider } from '@/contexts/VendorCountsContext';
import { BuyerCountsProvider } from '@/contexts/BuyerCountsContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { TokenExpirationModal } from './components/auth/TokenExpirationModal';
import MarketplaceHome from './pages/marketplace/home';
import BuyerDashboard from './pages/buyer/buyer-dashboard';
import VendorDashboard from './pages/vendor/dashboard';
import SignIn from './pages/auth/sign-in';
import SignUp from './pages/auth/sign-up';
import AdminSignIn from './pages/auth/admin-sign-in';
import VenderSignIn from './pages/auth/vender-sign-in';
import ForgotPassword from './pages/auth/forgot-password';
import VendorApply from './pages/vendor/apply';
import VendorApplySuccess from './pages/vendor/apply-success';
import VendorPublicListings from './pages/vendor/public-listings';
import BuyerListings from "./pages/buyer/listings";
import BuyerOrders from "./pages/buyer/orders";
import BuyerMessages from "./pages/buyer/messages";
import BuyerWishlist from "./pages/buyer/wishlist";
import BuyerSettings from "./pages/buyer/settings";
import BuyerSupport from "./pages/buyer/support";
import BuyerHome from "./pages/buyer/home";
import ProductDetailPage from "./pages/buyer/product-detail";
import PaymentTest from "./pages/buyer/payment-test";
import BuyerMyReviews from "./pages/buyer/my-reviews";
import BuyerNotifications from "./pages/buyer/notifications";
import { PriceProvider } from './contexts/PriceContext';
import { MaintenanceProvider } from './contexts/MaintenanceContext';
import MaintenancePage, { MaintenancePageWrapper } from './pages/maintenance';
import './index.css';

// Lazy load admin dashboard to hide admin routes from initial bundle
// This prevents admin paths from being visible in the main JavaScript bundle
const AdminDashboard = lazy(() => import('./pages/admin/admin-dashboard'));

// Debug component to track route changes - DISABLED IN PRODUCTION
// Remove or comment out in production to prevent route information leakage
function RouteDebugger() {
  const location = useLocation();

  useEffect(() => {
    // Only log in development mode
    if (import.meta.env.DEV) {
    }
  }, [location]);

  return null;
}

function App() {
  console.log('App component rendering with React Router...');

  return (
    <PriceProvider>
      <ToastProvider>
        <Router>
          <MaintenanceProvider>
            <MessagingProvider>
              <CartProvider>
                <RouteDebugger />
                <div className="App">
                  {/* Shadcn Toaster to ensure useToast toasts render */}
                  <Toaster />
                  {/* Token Expiration Modal - shows when session expires */}
                  <TokenExpirationModal />
                  <Routes>
                    {/* ... rest of the routes ... */}
                    {/* Public Routes */}
                    <Route path="/maintenance" element={<MaintenancePageWrapper />} />
                    <Route path="/" element={<MarketplaceHome />} />
                    <Route path="/sign-in" element={<SignIn />} />
                    <Route path="/sign-up" element={<SignUp />} />
                    <Route path="/6f2c9b681c3b4cf9a8c4-admin-access-control-panel-login" element={<AdminSignIn />} />
                    <Route path="/vender-sign-in" element={<VenderSignIn />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/payment-test" element={<PaymentTest />} />

                    {/* Buyer Dashboard Routes */}
                    <Route path="/buyer/*" element={
                      <ProtectedRoute requiredUserType="buyer">
                        <BuyerCountsProvider>
                          <BuyerDashboard />
                        </BuyerCountsProvider>
                      </ProtectedRoute>
                    }>
                      <Route index element={<BuyerHome />} />
                      <Route path="dashboard" element={<BuyerHome />} />
                      <Route path="home" element={<BuyerHome />} />
                      <Route path="listings" element={<BuyerListings />} />
                      <Route path="orders" element={<BuyerOrders />} />
                      <Route path="messages" element={<BuyerMessages />} />
                      <Route path="wishlist" element={<BuyerWishlist />} />
                      <Route path="settings" element={<BuyerSettings />} />
                      <Route path="support" element={<BuyerSupport />} />
                      <Route path="notifications" element={<BuyerNotifications />} />
                      <Route path="product/:id" element={<ProductDetailPage />} />
                      <Route path="payment-test" element={<PaymentTest />} />
                      <Route path="my-reviews" element={<BuyerMyReviews />} />
                    </Route>

                    {/* Vendor Apply Routes (Standalone) - MUST come BEFORE /vendor/* */}
                    <Route path="/vendor/apply" element={
                      <ProtectedRoute requiredUserType="buyer">
                        <VendorApply />
                      </ProtectedRoute>
                    } />
                    <Route path="/vendor/apply/success" element={
                      <ProtectedRoute>
                        <VendorApplySuccess />
                      </ProtectedRoute>
                    } />

                    {/* Public Vendor Listings Route - MUST come BEFORE /vendor/* */}
                    <Route path="/vendor/public/:vendorUsername" element={<VendorPublicListings />} />

                    {/* Vendor Dashboard Routes (Nested) - MUST come AFTER specific routes */}
                    <Route path="/vendor/*" element={
                      <ProtectedRoute requiredUserType="vendor">
                        <VendorCountsProvider>
                          <VendorDashboard />
                        </VendorCountsProvider>
                      </ProtectedRoute>
                    } />

                    {/* Admin Routes - Lazy loaded to hide from initial bundle */}
                    <Route path="/admin/*" element={
                      <ProtectedRoute requiredUserType="admin">
                        <AdminCountsProvider>
                          <Suspense fallback={
                            <div className="min-h-screen bg-black flex items-center justify-center">
                              <div className="text-white">Loading...</div>
                            </div>
                          }>
                            <AdminDashboard />
                          </Suspense>
                        </AdminCountsProvider>
                      </ProtectedRoute>
                    } />

                    {/* Catch all route */}
                    <Route path="*" element={<MarketplaceHome />} />
                  </Routes>
                </div>
              </CartProvider>
            </MessagingProvider>
          </MaintenanceProvider>
        </Router>
      </ToastProvider>
    </PriceProvider>
  );
}

export default App;