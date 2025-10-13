import { NavLink, useNavigate } from "react-router-dom";
import { Home, Users, TrendingUp, Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const menuItems = [
  { title: "แดชบอร์ด", url: "/", icon: Home },
  { title: "ขั้นตอนการขาย", url: "/sales-process", icon: TrendingUp },
  { title: "Pipeline", url: "/pipeline", icon: Building2 },
  { title: "รายชื่อลูกค้า", url: "/customers", icon: Users },
  { title: "อสังหาริมทรัพย์", url: "/properties", icon: Building2 },
];

export function Sidebar() {
  const navigate = useNavigate();

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
          {menuItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md transition ${
                  isActive
                    ? "bg-gradient-to-r from-green-300 to-pink-300 text-white font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </NavLink>
          ))}
        </nav>
      

      
    </aside>
  );
}
