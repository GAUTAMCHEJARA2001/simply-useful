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

// Safe wrapper for React.lazy to handle chunk load errors gracefully by reloading the page ONCE
const safeLazy = (importFn: () => Promise<{ default: React.ComponentType<any> }>, name: string) => {
  return lazy(async () => {
    try {
      const result = await importFn();
      sessionStorage.removeItem(`reloaded_${name}`);
      return result;
    } catch (error) {
      const hasReloaded = sessionStorage.getItem(`reloaded_${name}`);
      if (!hasReloaded) {
        console.warn(`Dynamic import failed for ${name}, reloading page:`, error);
        sessionStorage.setItem(`reloaded_${name}`, 'true');
        window.location.reload();
        return { default: () => null };
      } else {
        console.error(`Dynamic import failed again for ${name} after reload. Giving up.`, error);
        return { 
          default: () => (
            <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg m-4">
              <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to load page component</h3>
              <p className="text-red-600 mb-4">Please clear your browser cache and refresh the page.</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Force Refresh</button>
            </div>
          ) 
        };
      }
    }
  });
};

const SalesDashboard = safeLazy(() => import("./pages/SalesDashboard"), "SalesDashboard");
const OrderPage = safeLazy(() => import("./pages/OrderPage"), "OrderPage");
const MyOrders = safeLazy(() => import("./pages/MyOrders"), "MyOrders");
const AdminDashboard = safeLazy(() => import("./pages/AdminDashboard"), "AdminDashboard");
const DealerManagement = safeLazy(() => import("./pages/DealerManagement"), "DealerManagement");
const DistributorManagement = safeLazy(() => import("./pages/DistributorManagement"), "DistributorManagement");
const UserManagement = safeLazy(() => import("./pages/UserManagement"), "UserManagement");
const HRDashboard = safeLazy(() => import("./pages/HRDashboard"), "HRDashboard");
const InventoryDashboard = safeLazy(() => import("./pages/InventoryDashboard"), "InventoryDashboard");
const InventoryManagement = safeLazy(() => import('@/pages/InventoryManagement'), "InventoryManagement");
const DispatchOrderPage = safeLazy(() => import('@/pages/DispatchOrderPage'), "DispatchOrderPage");
const WarehouseManagement = safeLazy(() => import("./pages/WarehouseManagement"), "WarehouseManagement");
const VisitTracking = safeLazy(() => import("./pages/VisitTracking"), "VisitTracking");
const ExpenseEntry = safeLazy(() => import("./pages/ExpenseEntry"), "ExpenseEntry");
const Reports = safeLazy(() => import("./pages/Reports"), "Reports");
const SettingsPage = safeLazy(() => import("./pages/SettingsPage"), "SettingsPage");
const NotFound = safeLazy(() => import("./pages/NotFound"), "NotFound");
const BOMManagement = safeLazy(() => import("./pages/BOMManagement"), "BOMManagement");
const ReturnedOrders = safeLazy(() => import("./pages/ReturnedOrders"), "ReturnedOrders");
const RejectedOrders = safeLazy(() => import("./pages/RejectedOrders"), "RejectedOrders");
const CreatePurchaseOrder = safeLazy(() => import("./pages/CreatePurchaseOrder"), "CreatePurchaseOrder");
const GlobalInventory = safeLazy(() => import("./pages/GlobalInventory"), "GlobalInventory");
const LeadsPage = safeLazy(() => import("./pages/CRM/LeadsPage"), "LeadsPage");
const SOMapping = safeLazy(() => import("./pages/SOMapping"), "SOMapping");
const MyTerritory = safeLazy(() => import("./pages/MyTerritory"), "MyTerritory");
const PartyLedger = safeLazy(() => import("./pages/PartyLedger"), "PartyLedger");



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // Don't aggressive refetch on tab switch
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
      gcTime: 1000 * 60 * 15, // Keep unused data in cache for 15 minutes
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
                      <Route path="/sales/party-ledger" element={<ProtectedRoute><PartyLedger /></ProtectedRoute>} />

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
      <Analytics />
      <SpeedInsights />
    </ErrorBoundary>
  );
};

export default App;
