import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WarehouseProvider } from "@/contexts/WarehouseContext";
import { DataProvider } from "@/contexts/DataContext";
import { getRoleDashboard } from "@/contexts/AuthContext";
import React from "react";

import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";
import AppLayout from "./components/AppLayout";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import ErrorBoundary from "./components/ErrorBoundary";

import { Suspense, lazy } from "react";

const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DealerManagement = lazy(() => import("./pages/DealerManagement"));
const DistributorManagement = lazy(() => import("./pages/DistributorManagement"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const HRDashboard = lazy(() => import("./pages/HRDashboard"));
const InventoryDashboard = lazy(() => import("./pages/InventoryDashboard"));
const InventoryManagement = lazy(() => import('@/pages/InventoryManagement'));
const DispatchOrderPage = lazy(() => import('@/pages/DispatchOrderPage'));
const WarehouseManagement = lazy(() => import("./pages/WarehouseManagement"));
const VisitTracking = lazy(() => import("./pages/VisitTracking"));
const ExpenseEntry = lazy(() => import("./pages/ExpenseEntry"));
const Reports = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BOMManagement = lazy(() => import("./pages/BOMManagement"));
const ReturnedOrders = lazy(() => import("./pages/ReturnedOrders"));
const RejectedOrders = lazy(() => import("./pages/RejectedOrders"));
const CreatePurchaseOrder = lazy(() => import("./pages/CreatePurchaseOrder"));
const GlobalInventory = lazy(() => import("./pages/GlobalInventory"));
const LeadsPage = lazy(() => import("./pages/CRM/LeadsPage"));
const SOMapping = lazy(() => import("./pages/SOMapping"));
const MyTerritory = lazy(() => import("./pages/MyTerritory"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true, // Fetch fresh data when user returns to the tab
      refetchInterval: 1000 * 10, // Automatically poll backend every 10 seconds for safe real-time sync without triggering 429 rate limits
      staleTime: 1000 * 5, // Consider data stale after 5 seconds to force fresh fetches
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
  console.log('💎 KAMLA OTS Booting...');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (!target) return;

        const tagName = target.tagName.toLowerCase();
        const inputType = tagName === 'input' ? (target as HTMLInputElement).type : '';

        // Only intercept text-like inputs and native selects
        // Explicitly exclude: buttons (Cancel/Save/Submit), checkboxes, radios
        const isTextInput = tagName === 'input' && !['button', 'submit', 'image', 'reset', 'checkbox', 'radio'].includes(inputType);
        const isSelect = tagName === 'select';
        const isTextArea = tagName === 'textarea';

        // Also handle Radix UI closed combobox triggers (shadcn Select)
        const isClosedCombobox = tagName === 'button' && target.getAttribute('role') === 'combobox' && target.getAttribute('aria-expanded') !== 'true';

        if (isTextInput || isSelect || isClosedCombobox) {
          const container = (
            target.closest('form') ||
            target.closest('[role="dialog"]') ||
            target.closest('.form-container') ||
            document.body
          ) as HTMLElement;

          // Only navigate to other text inputs, textareas, and closed combobox triggers — NEVER to buttons
          const selector = [
            'input:not([disabled]):not([type="hidden"]):not([readonly]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'button[role="combobox"]:not([disabled])',
          ].join(', ');

          const focusable = Array.from(container.querySelectorAll<HTMLElement>(selector));

          const visibleFocusable = focusable.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
          });

          const index = visibleFocusable.indexOf(target);
          if (index > -1 && index < visibleFocusable.length - 1) {
            e.preventDefault();
            visibleFocusable[index + 1].focus();
          }
          // If we're on the last input and press Enter, let the form submit naturally
        }

        // If Enter is pressed on a real Cancel/Close button, let it click (default behavior)
        // No interception needed — browser handles it correctly
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SpeedInsights />
          <Analytics />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <WarehouseProvider>
                <DataProvider>
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
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
                      <Route path="/sales/crm" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
                      <Route path="/sales/territory" element={<ProtectedRoute><MyTerritory /></ProtectedRoute>} />

                      {/* Admin */}
                      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                      <Route path="/admin/global-inventory" element={<ProtectedRoute><GlobalInventory /></ProtectedRoute>} />
                      <Route path="/admin/rejected" element={<ProtectedRoute><RejectedOrders /></ProtectedRoute>} />
                      <Route path="/admin/dealers" element={<ProtectedRoute><DealerManagement /></ProtectedRoute>} />
                      <Route path="/admin/distributors" element={<ProtectedRoute><DistributorManagement /></ProtectedRoute>} />
                      <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
                      <Route path="/admin/warehouses" element={<ProtectedRoute><WarehouseManagement /></ProtectedRoute>} />
                      <Route path="/admin/bom" element={<ProtectedRoute><BOMManagement /></ProtectedRoute>} />
                      <Route path="/admin/so-mapping" element={<ProtectedRoute><SOMapping /></ProtectedRoute>} />
                      <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                      {/* HR */}
                      <Route path="/hr" element={<ProtectedRoute><HRDashboard /></ProtectedRoute>} />

                      {/* Inventory */}
                      <Route path="/inventory" element={<ProtectedRoute><InventoryDashboard /></ProtectedRoute>} />
                      <Route path="/inventory/manage" element={<ProtectedRoute><InventoryManagement /></ProtectedRoute>} />
                      <Route path="/inventory/dispatch/:id" element={<ProtectedRoute><DispatchOrderPage /></ProtectedRoute>} />
                      <Route path="/inventory/purchase-orders/new" element={<ProtectedRoute><CreatePurchaseOrder /></ProtectedRoute>} />
                      <Route path="/inventory/purchase-orders/edit/:id" element={<ProtectedRoute><CreatePurchaseOrder /></ProtectedRoute>} />
                      <Route path="/inventory/returns" element={<ProtectedRoute><ReturnedOrders /></ProtectedRoute>} />

                      {/* Reports */}
                      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

                    </Routes>
                  </Suspense>
                </DataProvider>
              </WarehouseProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
