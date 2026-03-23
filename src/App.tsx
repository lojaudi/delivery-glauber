import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import { CampaignSenderProvider } from "@/hooks/useCampaignSender";
import { DynamicPageTitle } from "@/components/DynamicPageTitle";

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
import AdminReports from "./pages/admin/Reports";
import AdminCustomers from "./pages/admin/Customers";
import AdminDrivers from "./pages/admin/Drivers";

// Waiter, Kitchen & Driver Pages
import WaiterAccess from "./pages/WaiterAccess";
import WaiterDashboard from "./pages/WaiterDashboard";
import Kitchen from "./pages/Kitchen";
import KitchenLogin from "./pages/KitchenLogin";
import DriverAccess from "./pages/DriverAccess";
import DriverDashboard from "./pages/DriverDashboard";

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
        <CampaignSenderProvider>
        <DynamicPageTitle />
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Root and Auth routes */}
                <Route path="/" element={<InitialRedirect />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Legacy Admin Routes */}
                <Route path="/admin/*" element={<Auth />} />
                
                {/* Landing Page Route */}
                <Route path="/lp/:resellerSlug" element={<Landing />} />
                
                {/* Reseller Routes - must come BEFORE /:slug */}
                <Route path="/setup" element={<ResellerSetup />} />
                <Route path="/reseller" element={<ResellerDashboard />} />
                <Route path="/reseller/restaurants" element={<ResellerRestaurants />} />
                <Route path="/reseller/restaurants/:id" element={<ResellerRestaurantDetails />} />
                <Route path="/reseller/subscriptions" element={<ResellerSubscriptions />} />
                <Route path="/reseller/reports" element={<ResellerReports />} />
                <Route path="/reseller/settings" element={<ResellerSettings />} />
                <Route path="/reseller/guia-mercadopago" element={<ResellerMercadoPagoGuide />} />
                <Route path="/docs" element={<ResellerDocs />} />
                
                {/* Restaurant Routes (Multi-tenant) - /:slug must come AFTER specific routes */}
                <Route path="/:slug" element={<Index />} />
                <Route path="/:slug/cart" element={<Cart />} />
                <Route path="/:slug/checkout" element={<Checkout />} />
                <Route path="/:slug/order/:id" element={<OrderStatus />} />
                <Route path="/:slug/my-orders" element={<MyOrders />} />
                <Route path="/:slug/auth" element={<Auth />} />
                <Route path="/:slug/suspended" element={<RestaurantSuspended />} />
                
                {/* Restaurant Admin Routes (Multi-tenant) */}
                <Route path="/:slug/admin" element={<AdminDashboard />} />
                <Route path="/:slug/admin/orders" element={<AdminOrders />} />
                <Route path="/:slug/admin/products" element={<AdminProducts />} />
                <Route path="/:slug/admin/categories" element={<AdminCategories />} />
                <Route path="/:slug/admin/coupons" element={<AdminCoupons />} />
                <Route path="/:slug/admin/hours" element={<AdminHours />} />
                <Route path="/:slug/admin/delivery-zones" element={<AdminDeliveryZones />} />
                <Route path="/:slug/admin/settings" element={<AdminSettings />} />
                <Route path="/:slug/admin/setup" element={<AdminSetup />} />
                <Route path="/:slug/admin/addons" element={<AdminAddons />} />
                <Route path="/:slug/admin/pdv" element={<AdminPDV />} />
                <Route path="/:slug/admin/waiters" element={<AdminWaiters />} />
                <Route path="/:slug/admin/reports" element={<AdminReports />} />
                <Route path="/:slug/admin/customers" element={<AdminCustomers />} />
                <Route path="/:slug/admin/drivers" element={<AdminDrivers />} />
                
                {/* Restaurant Waiter, Kitchen & Driver Routes (Multi-tenant) */}
                <Route path="/:slug/waiter" element={<WaiterAccess />} />
                <Route path="/:slug/waiter/dashboard" element={<WaiterDashboard />} />
                <Route path="/:slug/kitchen" element={<Kitchen />} />
                <Route path="/:slug/kitchen/login" element={<KitchenLogin />} />
                <Route path="/:slug/driver" element={<DriverAccess />} />
                <Route path="/:slug/driver/dashboard" element={<DriverDashboard />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
        </CampaignSenderProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;