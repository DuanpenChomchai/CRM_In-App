import { Building2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Navbar = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail") || "admin@crm.com";

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    toast.success("ออกจากระบบสำเร็จ");
    navigate("/auth");
  };

  return (
    <nav className="w-full bg-gradient-to-r from-pink-400 to-green-400 shadow-md">
      <div className="flex items-center justify-between h-16 px-6">
        
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white font-semibold text-lg">CRM System</h1>
        </div>

        {/* เมนูผู้ใช้ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full bg-white/20 hover:bg-white/30"
            >
              <Avatar>
                <AvatarFallback className="bg-gradient-to-r from-green-400 to-pink-400 text-white font-bold">
                  {userEmail[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">บัญชีผู้ใช้</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;
