import { Routes, Route } from "react-router-dom";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import VendorOverview from "./overview";
import VendorListings from "./listings";
import VendorAddProduct from "./add-product";
import VendorEditProduct from "./edit-product";
import VendorProductDetail from "./product-detail";
import VendorOrders from "./orders";
import VendorMessages from "./messages";
import VendorAnalytics from "./analytics";
import VendorReviews from "./reviews";
import VendorAds from "./ads";
import VendorDisputes from "./disputes";
import VendorSupport from "./support";
import VendorPayouts from "./payouts";
import VendorSettings from "./settings";

export default function VendorDashboard() {
  return (
    <VendorLayout>
      <Routes>
        <Route path="/" element={<VendorOverview />} />
        <Route path="/dashboard" element={<VendorOverview />} />
        <Route path="/listings" element={<VendorListings />} />
        <Route path="/listings/add" element={<VendorAddProduct />} />
        <Route path="/listings/edit/:id" element={<VendorEditProduct />} />
        <Route path="/listings/:id" element={<VendorProductDetail />} />
        <Route path="/orders" element={<VendorOrders />} />
        <Route path="/messages" element={<VendorMessages />} />
        <Route path="/analytics" element={<VendorAnalytics />} />
        <Route path="/reviews" element={<VendorReviews />} />
        <Route path="/ads" element={<VendorAds />} />
        <Route path="/disputes" element={<VendorDisputes />} />
        <Route path="/support" element={<VendorSupport />} />
        <Route path="/payouts" element={<VendorPayouts />} />
        <Route path="/settings" element={<VendorSettings />} />
        <Route path="*" element={<VendorOverview />} />
      </Routes>
    </VendorLayout>
  );
}