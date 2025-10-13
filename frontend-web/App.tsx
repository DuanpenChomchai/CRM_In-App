import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Auth from "./src/pages/Login";
import Dashboard from "./src/pages/Dashboard";
import SalesProcess from "./src/pages/SalesProcess";
import Pipeline from "./src/pages/Pipeline";
import Customers from "./src/pages/Customers";
import NotFound from "./src/pages/NotFound";
import Properties from "./src/pages/Properties";


import ProtectedRoute from "./src/components/layout/ProtectedRoute";
import { AppLayout } from "./src/components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* หน้าล็อกอิน */}
          <Route path="/auth" element={<Auth />} />

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

          {/* Sales Process */}
          <Route
            path="/sales-process"
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
            path="/pipeline"
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
            path="/customers"
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


          {/* หน้าหาไม่เจอ */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
