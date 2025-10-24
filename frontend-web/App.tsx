import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Auth from "./src/pages/Login";
import Dashboard from "./src/pages/Dashboard";
import SalesProcess from "./src/pages/CustomerOverview";
import Pipeline from "./src/pages/StageBased";
import Customers from "./src/pages/CustomerList";
import NotFound from "./src/pages/NotFound";
import Properties from "./src/pages/Properties";
import UserManagement from "./src/pages/UserManagement";



import ProtectedRoute from "./src/components/layout/ProtectedRoute";
import { AppLayout } from "./src/components/layout/AppLayout";
import Quotation from "./src/pages/Quotation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* หน้าล็อกอิน */}
          <Route path="/login" element={<Auth />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* แจ้งเตือนลูกค้า */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SalesProcess />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Pipeline */}
          <Route
            path="/stagebased"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Pipeline />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* รายชื่อลูกค้า */}
          <Route
            path="/customerlist"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Customers />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* อสังหาริมทรัพย์ */
          <Route
            path="/properties"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Properties /> 
                </AppLayout>
              </ProtectedRoute>
            }
          />
            }

          {/* จัดการผู้ใช้งาน */}
          <Route
            path="/usermanagement"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <UserManagement />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/*ใบเสนอราคาดีล */}
          <Route
            path="/quotation"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Quotation />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          
          {/* หน้าหาไม่เจอ */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
