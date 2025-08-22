import { Switch, Route } from "wouter";
import BuyerHome from "./home";
import BuyerListings from "./listings";
import BuyerOrders from "./orders";
import BuyerMessages from "./messages";
import BuyerWishlist from "./wishlist";
import BuyerSettings from "./settings";
import BuyerSupport from "./support";

export default function BuyerDashboard() {
  return (
    <Switch>
      <Route path="/buyer" component={BuyerHome} />
      <Route path="/buyer/listings" component={BuyerListings} />
      <Route path="/buyer/orders" component={BuyerOrders} />
      <Route path="/buyer/messages" component={BuyerMessages} />
      <Route path="/buyer/wishlist" component={BuyerWishlist} />
      <Route path="/buyer/settings" component={BuyerSettings} />
      <Route path="/buyer/support" component={BuyerSupport} />
    </Switch>
  );
}