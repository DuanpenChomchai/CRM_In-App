import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Lock, Building2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE || ;

declare global {
  interface Window {
    google: any;
  }
}

const Login = () => {
  const navigate = useNavigate();


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================
  // 🚀 NORMAL LOGIN (EMAIL/PASSWORD)
  // ============================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) return toast.error(data.message);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast.success("เข้าสู่ระบบสำเร็จ 🎉");
      navigate("/", { replace: true });
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  // ============================
  // 🚀 GOOGLE LOGIN
  // ============================
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error("❌ ERROR: Missing VITE_GOOGLE_CLIENT_ID");
      return;
    }

    // โหลดปุ่ม Google
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          const res = await fetch(`${API_BASE}/api/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          });

          const data = await res.json();

          if (!res.ok) {
            toast.error(data.message || "ล็อกอินด้วย Google ไม่สำเร็จ");
            return;
          }

          localStorage.setItem("token", data.token);
          toast.success("เข้าสู่ระบบด้วย Google สำเร็จ 🎉");
          navigate("/", { replace: true });
        } catch (error) {
          toast.error("เกิดข้อผิดพลาด Google Login");
        }
      },
    });

    window.google?.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large", width: 330 }
    );
  }, []);

  // ============================
  // 🔥 UI
  // ============================
  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft p-4">
      <Card className="w-full max-w-md shadow-elegant animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full gradient-primary">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">ระบบ CRM</CardTitle>
          <CardDescription className="text-base">
            เข้าสู่ระบบเพื่อจัดการลูกค้าของคุณ
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* ✅ ช่องอีเมล พร้อมไอคอน */}
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10" // ✅ เพิ่ม padding-left เพื่อเว้นที่ให้ icon
                  required
                />
              </div>
            </div>

            {/* ✅ ช่องรหัสผ่าน พร้อมไอคอน */}
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full flex justify-center gradient-primary text-white hover:opacity-90 transition-opacity"
            >
              เข้าสู่ระบบ
            </Button>
          </form>

         
          {/* <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">หรือ</span>
            </div>
          </div> */}

          {/* ปุ่ม Google Login */}
          {/* <div id="googleBtn" className="w-full flex justify-center"></div> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
