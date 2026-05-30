import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { getRoleDashboard } from "@/contexts/AuthContext";
import React from "react";

import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";
import AppLayout from "./components/AppLayout";

import SalesDashboard from "./pages/SalesDashboard";
import OrderPage from "./pages/OrderPage";
import MyOrders from "./pages/MyOrders";
import AdminDashboard from "./pages/AdminDashboard";
import DealerManagement from "./pages/DealerManagement";
import DistributorManagement from "./pages/DistributorManagement";
import UserManagement from "./pages/UserManagement";
import HRDashboard from "./pages/HRDashboard";
import InventoryDashboard from "./pages/InventoryDashboard";
import InventoryManagement from "./pages/InventoryManagement";
import WarehouseManagement from "./pages/WarehouseManagement";
import VisitTracking from "./pages/VisitTracking";
import ExpenseEntry from "./pages/ExpenseEntry";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import BOMManagement from "./pages/BOMManagement";
import ReturnedOrders from "./pages/ReturnedOrders";
import RejectedOrders from "./pages/RejectedOrders";
import CreatePurchaseOrder from "./pages/CreatePurchaseOrder";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalInventory from "./pages/GlobalInventory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

import { useApiHealth } from './hooks/useApiHealth';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const HomeRedirect: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDashboard(user!.role)} replace />;
};

const App = () => {
  console.log('💎 Simply Useful ERP Booting...');
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <DataProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/" element={<HomeRedirect />} />

                  {/* Sales */}
                  <Route path="/sales" element={<ProtectedRoute><SalesDashboard /></ProtectedRoute>} />
                  <Route path="/sales/order" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
                  <Route path="/sales/order/:id" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
                  <Route path="/sales/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                  <Route path="/sales/visits" element={<ProtectedRoute><VisitTracking /></ProtectedRoute>} />
                  <Route path="/sales/expenses" element={<ProtectedRoute><ExpenseEntry /></ProtectedRoute>} />

                  {/* Admin */}
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/global-inventory" element={<ProtectedRoute><GlobalInventory /></ProtectedRoute>} />
                  <Route path="/admin/rejected" element={<ProtectedRoute><RejectedOrders /></ProtectedRoute>} />
                  <Route path="/admin/dealers" element={<ProtectedRoute><DealerManagement /></ProtectedRoute>} />
                  <Route path="/admin/distributors" element={<ProtectedRoute><DistributorManagement /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                  <Route path="/admin/warehouses" element={<ProtectedRoute><WarehouseManagement /></ProtectedRoute>} />
                  <Route path="/admin/bom" element={<ProtectedRoute><BOMManagement /></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                  {/* HR */}
                  <Route path="/hr" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />

                  {/* Inventory */}
                  <Route path="/inventory" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />
                  <Route path="/inventory/manage" element={<ProtectedRoute><InventoryManagement /></ProtectedRoute>} />
                  <Route path="/inventory/purchase-orders/new" element={<ProtectedRoute><CreatePurchaseOrder /></ProtectedRoute>} />
                  <Route path="/inventory/purchase-orders/edit/:id" element={<ProtectedRoute><CreatePurchaseOrder /></ProtectedRoute>} />
                  <Route path="/inventory/returns" element={<ProtectedRoute><ReturnedOrders /></ProtectedRoute>} />

                  {/* Reports */}
                  <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </DataProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
