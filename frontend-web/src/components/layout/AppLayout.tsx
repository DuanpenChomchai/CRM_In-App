import { useState } from "react";
import Navbar from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Navbar - รับ toggle function */}
      <Navbar onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />

      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar ด้านซ้าย - รับ state และ close function */}
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen} 
          onClose={() => setIsMobileSidebarOpen(false)} 
        />

        {/* Main content ด้านขวา */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  );
}
