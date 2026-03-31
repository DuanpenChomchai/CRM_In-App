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
} from "lucide-react";
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

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);

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
    <aside className="w-56 bg-white border-r flex flex-col justify-between h-full">
      <nav className="flex flex-col gap-1 p-4">
        {menuItems.map((item) => {
          const isQuotationMenu = item.url === "/quotationlist";
          const isQuotationActive =
            isQuotationMenu &&
            (location.pathname.startsWith("/quotation") ||
              location.pathname.startsWith("/quotationlist"));

          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md transition ${
                  isActive || isQuotationActive
                    ? "bg-gradient-to-r from-green-300 to-pink-300 text-white font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => setLogoutOpen(true)}
        >
          <LogOut className="h-5 w-5" />
          ออกจากระบบ
        </Button>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันออกจากระบบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการออกจากระบบใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
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
  );
};

export { Sidebar };
