import { Routes, Route } from "react-router-dom";
import BuyerHome from "./home";
import BuyerListings from "./listings";
import BuyerOrders from "./orders";
import BuyerMessages from "./messages";
import BuyerWishlist from "./wishlist";
import BuyerSettings from "./settings";
import BuyerSupport from "./support";
import BuyerMyReviews from "./my-reviews";
import BuyerMyDisputes from "./my-disputes";
import CreateDispute from "./create-dispute";
import ProductDetailPage from "./product-detail";
import BuyerTransactionHistory from "./transaction-history";
import BuyerNotifications from "./notifications";
import BuyerBilling from "./billing";

export default function BuyerDashboard() {
  return (
    <Routes>
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
      <Route path="my-reviews" element={<BuyerMyReviews />} />
      <Route path="my-disputes" element={<BuyerMyDisputes />} />
      <Route path="create-dispute" element={<CreateDispute />} />
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="transaction-history" element={<BuyerTransactionHistory />} />
      <Route path="billing" element={<BuyerBilling />} />
    </Routes>
  );
}
