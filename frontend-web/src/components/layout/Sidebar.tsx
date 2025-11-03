import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Workflow,
  Users,
  UserPlus,
  Building2,
  LayoutDashboard,
  UserCog,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuItems = [
  { title: "แดชบอร์ด", url: "/", icon: LayoutDashboard },
  { title: "ลูกค้า", url: "/customer", icon: UserPlus },
  { title: "Stage", url: "/stagebased", icon: Workflow },
  { title: "อสังหาริมทรัพย์", url: "/properties", icon: Building2 },
  { title: "รายการใบเสนอราคา", url: "/quotationlist", icon: Users },
  { title: "จัดการผู้ใช้งาน", url: "/userManagement", icon: UserCog },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    toast.success("ออกจากระบบสำเร็จ");
    navigate("/auth");
  };

  return (
    <aside className="w-56 bg-white border-r flex flex-col justify-between h-full">
      {/* เมนูหลัก */}
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
    </aside>
  );
}
