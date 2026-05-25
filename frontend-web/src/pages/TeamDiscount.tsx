import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Percent, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE;
const getToken = () => localStorage.getItem("token") || "";

interface SaleMember {
  id: number;
  name: string;
  email: string;
  tol?: string;
  img?: string;
  maxDiscount: number | null;
  editValue: string; // ค่าที่กำลังแก้ไขใน input
  dirty: boolean;    // มีการแก้ไขหรือยัง
}

const TeamDiscount = () => {
  const [members, setMembers] = useState<SaleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const role = (userObj?.role || "").toUpperCase();

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/managers-with-teams`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("โหลดทีมไม่สำเร็จ");
      const data = await res.json();

      let sales: any[] = [];

      if (role === "MANAGER") {
        // หา manager ที่เป็นตัวเอง
        const myTeam = (data.managers || []).find((m: any) => m.id === userObj?.id);
        sales = myTeam?.team || [];
      } else if (role === "ADMIN") {
        // Admin เห็นทุกคน
        for (const m of data.managers || []) {
          sales = [...sales, ...m.team];
        }
        sales = [...sales, ...(data.unassignedSales || [])];
      }

      // ดึง maxDiscount ของแต่ละ sale จาก API users list
      const detailRes = await fetch(`${API_BASE}/api/users?role=SALE&pageSize=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const detailData = detailRes.ok ? await detailRes.json() : { data: [] };
      const detailMap: Record<number, any> = {};
      for (const u of detailData.data || []) detailMap[u.id] = u;

      const mapped: SaleMember[] = sales.map((s: any) => {
        const detail = detailMap[s.id];
        const md = detail?.maxDiscount !== undefined ? detail.maxDiscount : null;
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          tol: s.tol,
          img: s.img,
          maxDiscount: md !== null ? Number(md) : null,
          editValue: md !== null ? String(Number(md)) : "",
          dirty: false,
        };
      });

      setMembers(mapped);
    } catch (err: any) {
      toast.error(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleChange = (id: number, value: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, editValue: value, dirty: true } : m
      )
    );
  };

  const handleSave = async (member: SaleMember) => {
    setSaving(member.id);
    try {
      const val = member.editValue === "" ? null : Number(member.editValue);
      if (val !== null && (val < 0 || val > 100)) {
        toast.error("ส่วนลดต้องอยู่ระหว่าง 0-100%");
        return;
      }

      const res = await fetch(`${API_BASE}/api/users/${member.id}/max-discount`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ maxDiscount: val }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "บันทึกไม่สำเร็จ");
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, maxDiscount: val, dirty: false }
            : m
        )
      );

      toast.success(`บันทึกส่วนลดของ ${member.name} สำเร็จ`);
    } catch (err: any) {
      toast.error(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(null);
    }
  };

  const getDiscountBadge = (val: number | null) => {
    if (val === null) return <Badge variant="outline" className="text-gray-400">ไม่จำกัด</Badge>;
    if (val === 0) return <Badge className="bg-red-100 text-red-600 border-red-200">ห้ามลด</Badge>;
    if (val <= 5) return <Badge className="bg-orange-100 text-orange-600 border-orange-200">{val}%</Badge>;
    if (val <= 15) return <Badge className="bg-yellow-100 text-yellow-600 border-yellow-200">{val}%</Badge>;
    return <Badge className="bg-green-100 text-green-600 border-green-200">{val}%</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="w-7 h-7 text-primary" />
            กำหนดส่วนลดสูงสุดให้ทีมขาย
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            กำหนดเพดานส่วนลดที่เซลล์แต่ละคนสามารถให้ลูกค้าได้
          </p>
        </div>
        <Button variant="outline" onClick={fetchTeam} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex gap-3 text-sm text-blue-700">
            <Percent className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">วิธีใช้งาน</p>
              <p className="text-blue-600 mt-0.5">กรอกตัวเลข 0-100 เพื่อกำหนดส่วนลดสูงสุด (%) ที่เซลล์คนนั้นสามารถให้ลูกค้าได้ในใบเสนอราคา ถ้าปล่อยว่างไว้ = ไม่จำกัด</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ทีมขาย ({members.length} คน)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">กำลังโหลด...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>ไม่พบเซลล์ในทีม</p>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {m.img ? (
                      <img src={m.img} alt={m.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold text-sm">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>

                  {/* Current discount badge */}
                  <div className="shrink-0 w-24 text-center">
                    <p className="text-xs text-muted-foreground mb-1">ปัจจุบัน</p>
                    {getDiscountBadge(m.maxDiscount)}
                  </div>

                  {/* Input */}
                  <div className="shrink-0 w-36">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ไม่จำกัด"
                        value={m.editValue}
                        onChange={(e) => handleChange(m.id, e.target.value)}
                        className={`h-9 pr-8 text-center ${m.dirty ? "border-orange-400 ring-1 ring-orange-300" : ""}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    size="sm"
                    onClick={() => handleSave(m)}
                    disabled={!m.dirty || saving === m.id}
                    className="shrink-0 gradient-primary text-white h-9"
                  >
                    {saving === m.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        บันทึก
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDiscount;
