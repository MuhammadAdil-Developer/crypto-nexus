import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ToastProvider from './components/ui/ToastContainer';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import MarketplaceHome from './pages/marketplace/home';
import BuyerDashboard from './pages/buyer/buyer-dashboard';
import VendorDashboard from './pages/vendor/dashboard';
import AdminDashboard from './pages/admin/admin-dashboard';
import SignIn from './pages/auth/sign-in';
import SignUp from './pages/auth/sign-up';
import AdminSignIn from './pages/auth/admin-sign-in';
import VendorApply from './pages/vendor/apply';
import VendorApplySuccess from './pages/vendor/apply-success';
import BuyerListings from "./pages/buyer/listings";
import BuyerOrders from "./pages/buyer/orders";
import BuyerMessages from "./pages/buyer/messages";
import BuyerWishlist from "./pages/buyer/wishlist";
import BuyerSettings from "./pages/buyer/settings";
import BuyerSupport from "./pages/buyer/support";
import BuyerHome from "./pages/buyer/home";
import ProductDetailPage from "./pages/buyer/product-detail";
import './index.css';

// Debug component to track route changes
function RouteDebugger() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('🔍 Route changed to:', location.pathname);
    console.log('🔍 Full location:', location);
  }, [location]);
  
  return null;
}

function App() {
  console.log('🚀 App component rendering with React Router...'); // Debug log
  
  return (
    <ToastProvider>
      <Router>
        <RouteDebugger />
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<MarketplaceHome />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/admin-sign-in" element={<AdminSignIn />} />
            
            {/* Buyer Dashboard Routes */}
            <Route path="/buyer" element={
              <ProtectedRoute requiredUserType="buyer">
                <BuyerDashboard />
              </ProtectedRoute>
            }>
              <Route index element={<BuyerHome />} />
              <Route path="home" element={<BuyerHome />} />
              <Route path="listings" element={<BuyerListings />} />
              <Route path="orders" element={<BuyerOrders />} />
              <Route path="messages" element={<BuyerMessages />} />
              <Route path="wishlist" element={<BuyerWishlist />} />
              <Route path="settings" element={<BuyerSettings />} />
              <Route path="support" element={<BuyerSupport />} />
              <Route path="product/:id" element={<ProductDetailPage />} />
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
            
            {/* Vendor Dashboard Routes (Nested) - MUST come AFTER specific routes */}
            <Route path="/vendor/*" element={
              <ProtectedRoute requiredUserType="vendor">
                <VendorDashboard />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<MarketplaceHome />} />
          </Routes>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
