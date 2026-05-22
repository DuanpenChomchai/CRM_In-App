import { Building2, LogOut, User, Menu, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Navbar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userEmail = user?.email || "ไม่พบอีเมล";
  const userId = user?.id;

  const API_HOST = (import.meta as any)?.env?.VITE_API_BASE 
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !userId) return;
    // โหลดรูปผ่าน backend proxy
    const url = `${API_HOST}/api/users/profile-image/${userId}?t=${encodeURIComponent(token)}&b=${Date.now()}`;
    setAvatarUrl(url);
  }, [API_HOST, userId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <nav className="w-full bg-gradient-to-r from-pink-400 to-green-400 shadow-md relative z-50">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu - เฉพาะ Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/20"
            onClick={onMenuClick}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg hidden sm:block">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-white font-semibold text-base md:text-lg whitespace-nowrap">
              CRM In-App
            </h1>
          </div>
        </div>

        {/* เมนูผู้ใช้ */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full bg-white/20 hover:bg-white/30"
            >
              <Avatar>
                {avatarUrl && (
                  <AvatarImage
                    src={avatarUrl}
                    onError={() => setAvatarUrl(null)}
                  />
                )}
                <AvatarFallback className="bg-gradient-to-r from-green-400 to-pink-400 text-white font-bold">
                  {userEmail[0]?.toUpperCase() || "?"}
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
            <DropdownMenuItem onClick={() => navigate("/profile", { replace: true })}>
              <User className="mr-2 h-4 w-4" />
              โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/about", { replace: true })}>
              <Info className="mr-2 h-4 w-4" />
              เกี่ยวกับเรา
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
