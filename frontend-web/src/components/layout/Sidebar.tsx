import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Workflow,
  Users,
  UserPlus,
  Building2,
  LayoutDashboard,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Sidebar = ({ 
  isMobileOpen, 
  onClose,
}: { 
  isMobileOpen?: boolean; 
  onClose?: () => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ดึง user จาก localStorage
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role || "GUEST";

  // เมนูทั้งหมด
  let menuItems = [
    { title: "แดชบอร์ด", url: "/", icon: LayoutDashboard },
    { title: "ลูกค้า", url: "/customer", icon: UserPlus },
    { title: "Stage", url: "/stagebased", icon: Workflow },
    { title: "อสังหาริมทรัพย์", url: "/properties", icon: Building2 },
    { title: "รายการใบเสนอราคา", url: "/quotationlist", icon: Users },
  ];

  // เฉพาะ ADMIN เห็นเมนูจัดการผู้ใช้
  if (role === "ADMIN") {
    menuItems.push({
      title: "จัดการผู้ใช้งาน",
      url: "/userManagement",
      icon: UserCog,
    });
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      {/* Overlay สำหรับ mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <aside 
        className={cn(
          "bg-white border-r flex flex-col justify-between h-full transition-all duration-300 ease-in-out relative group",
          // Desktop behavior
          isCollapsed ? "w-16" : "w-56",
          // Mobile responsive behavior
          "fixed inset-y-0 left-0 z-50 md:relative",
          !isMobileOpen && "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Toggle Button (Desktop only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-6 bg-white border rounded-full p-1 shadow-md hover:bg-gray-50 transition-colors z-10 hidden md:block"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>

          <nav className={cn(
            "flex flex-col gap-1 p-4",
            isCollapsed ? "items-center" : ""
          )}>
            {menuItems.map((item) => {
              const isQuotationMenu = item.url === "/quotationlist";
              const isActive =
                item.url === "/"
                  ? location.pathname === "/"
                  : isQuotationMenu
                  ? location.pathname.startsWith("/quotation")
                  : location.pathname.startsWith(item.url);

              return (
                <button
                  key={item.url}
                  onClick={() => {
                    navigate(item.url);
                    if (onClose) onClose();
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition",
                    isCollapsed ? "justify-center w-10 h-10 px-0" : "w-full",
                    isActive
                      ? "bg-gradient-to-r from-green-300 to-pink-300 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  title={isCollapsed ? item.title : ""}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="truncate whitespace-nowrap">{item.title}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <div className={cn("p-4 border-t", isCollapsed ? "flex justify-center" : "")}>
           <Button
              variant="ghost"
              className={cn(
                "text-red-500 hover:text-red-600 hover:bg-red-50 w-full transition-all",
                isCollapsed ? "w-10 h-10 p-0 justify-center" : "justify-start"
              )}
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="ml-2">ออกจากระบบ</span>}
            </Button>
        </div>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent className="max-w-[90vw] md:max-w-lg rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันออกจากระบบ</AlertDialogTitle>
              <AlertDialogDescription>
                คุณต้องการออกจากระบบใช่หรือไม่?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="mt-0">ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleLogout}
              >
                ออกจากระบบ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>
    </>
  );
};

export { Sidebar };
