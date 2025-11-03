import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Auth from "./src/pages/Login";
import Dashboard from "./src/pages/Dashboard";
import Customeroverview from "./src/pages/Customer";
import Quotationlist from "./src/pages/QuotationList";
import NotFound from "./src/pages/NotFound";
import Properties from "./src/pages/Properties";
import UserManagement from "./src/pages/UserManagement";
import ProtectedRoute from "./src/components/layout/ProtectedRoute";
import { AppLayout } from "./src/components/layout/AppLayout";
import Quotation from "./src/pages/Quotation";
import StageBased from "./src/pages/StageBased";

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
            path="/"
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
            path="/customer"
            element={
              <ProtectedRoute>
                <AppLayout>
                  < Customeroverview />
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
                  <StageBased />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* รายการใบเสนอราคา */}
          <Route
            path="/quotationlist"
            element={
              <ProtectedRoute>
                <AppLayout>
                  < Quotationlist/>
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
