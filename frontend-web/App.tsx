import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import TeamDiscount from "@/pages/TeamDiscount";

const queryClient = new QueryClient();

// ✅ คอมโพเนนต์ดักจับและบล็อกการกดย้อนกลับ (Back Button) ของ Browser เมื่ออยู่หน้า /login และหน้าแดชบอร์ด /
const BackButtonBlocker = () => {
  const location = useLocation();

  useEffect(() => {
    // บล็อกการย้อนกลับเมื่ออยู่หน้า /login หรือหน้าแรก / (แดชบอร์ด) เพื่อให้หน้าหมวดหมู่อื่นๆ (ลูกค้า, Stage, ฯลฯ) กดย้อนกลับได้ตามปกติ
    if (location.pathname !== "/login" && location.pathname !== "/") {
      return;
    }

    const targetIndex = 9;

    // ดันประวัติไปข้างหน้า 10 ครั้งเพื่อสร้าง buffer ป้องกันการกดย้อนกลับออกนอกเว็บจากการกดเบิ้ล (Double-Click)
    for (let i = 0; i < 10; i++) {
      window.history.pushState({ blocker: true, index: i }, "", window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state && state.blocker && typeof state.index === "number") {
        // คำนวณหาจำนวนขั้นที่ต้องเดินหน้ากลับไปที่ยอดสุดของ buffer (index 9)
        const stepsForward = targetIndex - state.index;
        if (stepsForward > 0) {
          window.history.go(stepsForward);
        }
      } else {
        // หากอยู่นอกขอบเขตของ blocker state ให้ดึงกลับไปข้างหน้าสุด
        window.history.go(10);
      }
    };

    // เพิ่มด่านป้องกันพิเศษเฉพาะหน้า /login: เมื่อผู้ใช้พยายามออกจากหน้าเว็บ/ย้อนกลับหลุดนอกระบบ จะแสดงกล่องข้อความยืนยันของเบราว์เซอร์
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (location.pathname === "/login") {
        e.preventDefault();
        e.returnValue = "ระบบล็อกไม่ให้ออกจากหน้าเว็บนี้";
        return e.returnValue;
      }
    };

    window.addEventListener("popstate", handlePopState);
    if (location.pathname === "/login") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (location.pathname === "/login") {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
  }, [location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackButtonBlocker />
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

          {/* Team Discount */}
          <Route
            path="/team-discount"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TeamDiscount />
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
