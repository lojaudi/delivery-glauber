import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";

// Client Pages
import Index from "./pages/Index";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import MyOrders from "./pages/MyOrders";
import Auth from "./pages/Auth";
import RestaurantSuspended from "./pages/RestaurantSuspended";

// Admin Pages
import AdminOrders from "./pages/admin/Orders";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminCoupons from "./pages/admin/Coupons";
import AdminHours from "./pages/admin/Hours";
import AdminSettings from "./pages/admin/Settings";
import AdminSetup from "./pages/admin/Setup";
import AdminDeliveryZones from "./pages/admin/DeliveryZones";
import AdminAddons from "./pages/admin/Addons";
import AdminPDV from "./pages/admin/PDV";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminWaiters from "./pages/admin/Waiters";

// Waiter & Kitchen Pages
import WaiterAccess from "./pages/WaiterAccess";
import WaiterDashboard from "./pages/WaiterDashboard";
import Kitchen from "./pages/Kitchen";
import KitchenLogin from "./pages/KitchenLogin";

// Reseller Pages
import ResellerDashboard from "./pages/reseller/Dashboard";
import ResellerRestaurants from "./pages/reseller/Restaurants";
import ResellerRestaurantDetails from "./pages/reseller/RestaurantDetails";
import ResellerSubscriptions from "./pages/reseller/Subscriptions";
import ResellerReports from "./pages/reseller/Reports";
import ResellerSettings from "./pages/reseller/Settings";
import ResellerMercadoPagoGuide from "./pages/reseller/MercadoPagoGuide";
import ResellerDocs from "./pages/reseller/Docs";

import NotFound from "./pages/NotFound";
import ResellerSetup from "./pages/ResellerSetup";
import Landing from "./pages/Landing";
import InitialRedirect from "./pages/InitialRedirect";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Root and Auth routes */}
                <Route path="/" element={<InitialRedirect />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Restaurant Routes (Multi-tenant) */}
                <Route path="/r/:slug" element={<Index />} />
                <Route path="/r/:slug/cart" element={<Cart />} />
                <Route path="/r/:slug/checkout" element={<Checkout />} />
                <Route path="/r/:slug/order/:id" element={<OrderStatus />} />
                <Route path="/r/:slug/my-orders" element={<MyOrders />} />
                <Route path="/r/:slug/auth" element={<Auth />} />
                <Route path="/r/:slug/suspended" element={<RestaurantSuspended />} />
                
                {/* Restaurant Admin Routes (Multi-tenant) */}
                <Route path="/r/:slug/admin" element={<AdminDashboard />} />
                <Route path="/r/:slug/admin/orders" element={<AdminOrders />} />
                <Route path="/r/:slug/admin/products" element={<AdminProducts />} />
                <Route path="/r/:slug/admin/categories" element={<AdminCategories />} />
                <Route path="/r/:slug/admin/coupons" element={<AdminCoupons />} />
                <Route path="/r/:slug/admin/hours" element={<AdminHours />} />
                <Route path="/r/:slug/admin/delivery-zones" element={<AdminDeliveryZones />} />
                <Route path="/r/:slug/admin/settings" element={<AdminSettings />} />
                <Route path="/r/:slug/admin/setup" element={<AdminSetup />} />
                <Route path="/r/:slug/admin/addons" element={<AdminAddons />} />
                <Route path="/r/:slug/admin/pdv" element={<AdminPDV />} />
                <Route path="/r/:slug/admin/waiters" element={<AdminWaiters />} />
                
                {/* Restaurant Waiter & Kitchen Routes (Multi-tenant) */}
                <Route path="/r/:slug/waiter" element={<WaiterAccess />} />
                <Route path="/r/:slug/waiter/dashboard" element={<WaiterDashboard />} />
                <Route path="/r/:slug/kitchen" element={<Kitchen />} />
                <Route path="/r/:slug/kitchen/login" element={<KitchenLogin />} />
                
                {/* Legacy Admin Routes - Redirect to auth for restaurant admins */}
                <Route path="/admin/*" element={<Auth />} />
                
                {/* Landing Page Route */}
                <Route path="/lp/:resellerSlug" element={<Landing />} />
                
                {/* Reseller Routes */}
                <Route path="/setup" element={<ResellerSetup />} />
                <Route path="/reseller" element={<ResellerDashboard />} />
                <Route path="/reseller/restaurants" element={<ResellerRestaurants />} />
                <Route path="/reseller/restaurants/:id" element={<ResellerRestaurantDetails />} />
                <Route path="/reseller/subscriptions" element={<ResellerSubscriptions />} />
                <Route path="/reseller/reports" element={<ResellerReports />} />
                <Route path="/reseller/settings" element={<ResellerSettings />} />
                <Route path="/reseller/guia-mercadopago" element={<ResellerMercadoPagoGuide />} />
                <Route path="/docs" element={<ResellerDocs />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;