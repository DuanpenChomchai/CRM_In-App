import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RedirectIfLoggedIn from "@/components/layout/RedirectIfLoggedIn";

import Auth from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Customeroverview from "@/pages/Customer";
import Quotationlist from "@/pages/QuotationList";
import NotFound from "@/pages/NotFound";
import Properties from "@/pages/Properties";
import UserManagement from "@/pages/UserManagement";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Quotation from "@/pages/Quotation";
import StageBased from "@/pages/StageBased";
import Profile from "@/pages/Profile";
import About from "@/pages/About";
import Contact from "@/pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route
            path="/login"
            element={
              <RedirectIfLoggedIn>
                <Auth />
              </RedirectIfLoggedIn>
            }
          />

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

          {/* Customer */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Customeroverview />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Pipeline (StageBased) */}
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

          {/* Quotation List */}
          <Route
            path="/quotationlist"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Quotationlist />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Properties */}
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

          {/* User Management */}
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

          {/* Quotation */}
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
          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            }
          />  
          
          {/* About */}
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <About />
                </AppLayout>
              </ProtectedRoute>
            }
          />  
          
          {/* Contact */}
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Contact />
                </AppLayout>
              </ProtectedRoute>
            }
          />  
          

          {/* Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
