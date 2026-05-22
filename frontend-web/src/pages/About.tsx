import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  UserCheck,
  Building2,
  LayoutDashboard,
  Workflow,
  FileText,
  UserCog,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Star,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Edit3,
  Trash2,
  RotateCcw,
  Camera,
  Check,
  X,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE;

// ─── ข้อมูลระบบ ───────────────────────────────────────
const APP_NAME = "Stage-based CRM & In-app communication";
const APP_TAGLINE = "ระบบบริหารความสัมพันธ์ลูกค้าเชิงขั้นตอนและการสื่อสารบนแอปพลิเคชันมือถือ";
const APP_DESC =
  "ระบบบริหารความสัมพันธ์ลูกค้าเชิงขั้นตอนและการสื่อสารบนแอปพลิเคชันมือถือ เป็นการพัฒนาระบบ CRM รูปแบบใหม่ที่มุ่งเน้นการเพิ่มประสิทธิภาพในการบริหารจัดการลูกค้าและการสื่อสารภายในองค์กรให้เป็นระบบและครบวงจรในที่เดียว";

// ─── สมาชิกทีมพัฒนาเริ่มต้น ──────────────────────
const DEFAULT_TEAM = {
  dev1: {
    name: "นฤมล สีละมุด",
    studentId: "65112125",
    role: "Full-Stack Developer (Me)",
    avatar: "/avatar_narimon.png",
  },
  dev2: {
    name: "นางสาวเดือนเพ็ญ โฉมฉาย",
    studentId: "65111987",
    role: "Full-Stack Developer (Friend)",
    avatar: "/avatar_somchai.png",
  },
  advisor: {
    name: "ดร. ณิชาภัทร ณ นคร",
    role: "อาจารย์ที่ปรึกษาโครงงาน (Project Advisor)",
    avatar: "", // ค่าเริ่มต้นเป็นแบบไม่มีรูป (แสดง fallback GraduationCap)
  }
};


// ─── บทบาทและสิทธิ์การใช้งานของแต่ละฝ่าย ────────────────────────────────────
const ROLES = [
  {
    id: "ADMIN",
    label: "ผู้ดูแลระบบ (Admin)",
    icon: Shield,
    color: "from-pink-500 to-rose-600",
    badge: "bg-pink-100 text-pink-700 border-pink-200",
    description: "มีสิทธิ์สูงสุดในระบบ สามารถจัดการบัญชีผู้ใช้ โครงการ และตั้งค่าแพลตฟอร์มได้ทั้งหมด",
    capabilities: [
      { icon: LayoutDashboard, text: "ดูและติดตามภาพรวม Dashboard ทั่วทั้งระบบแบบเรียลไทม์" },
      { icon: UserCog, text: "จัดการรายชื่อผู้ใช้งานทั้งหมดในระบบ (สร้าง/แก้ไข/ลบ บัญชี และกำหนดบทบาท)" },
      { icon: UserPlus, text: "จัดการข้อมูลผู้สนใจและลูกค้าทั้งหมดในระบบ พร้อมมอบหมายพนักงานขาย" },
      { icon: Workflow, text: "วิเคราะห์และควบคุม Pipeline การเดินทางของดีลของทุกทีมขาย" },
      { icon: Building2, text: "จัดการแคตตาล็อกข้อมูลโครงการอสังหาริมทรัพย์และจำนวนยูนิต" },
      { icon: FileText, text: "ตรวจสอบ ปรับเปลี่ยน และอนุมัติใบเสนอราคาที่มีการขอเอกสารทั้งหมด" },
    ],
  },
  {
    id: "MANAGER",
    label: "ผู้จัดการขาย (Manager)",
    icon: UserCheck,
    color: "from-pink-400 to-green-400",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    description: "รับผิดชอบการดูแลทีมพนักงานขาย ติดตามสถิติของทีม และอนุมัติเอกสารเบื้องต้น",
    capabilities: [
      { icon: LayoutDashboard, text: "ดูแดชบอร์ดรายงานและสถิติยอดขายภาพรวมเฉพาะของทีมที่ดูแล" },
      { icon: Users, text: "ติดตามทีมพนักงานขาย ดูสถิติและประสิทธิภาพการทำงานรายบุคคล" },
      { icon: UserPlus, text: "ดูลูกค้าของทุกคนในทีม พร้อมติดตามประวัติความสนใจ" },
      { icon: Workflow, text: "ติดตาม Pipeline ความคืบหน้าของดีลทีมขายทั้งหมด" },
      { icon: Building2, text: "ดูและตรวจสอบข้อมูลโครงการอสังหาริมทรัพย์เพื่อประกอบคำปรึกษา" },
      { icon: FileText, text: "เรียกดูและตรวจสอบรายการใบเสนอราคาทั้งหมดของสมาชิกในทีม" },
    ],
  },
  {
    id: "SALE",
    label: "พนักงานขาย (Sale)",
    icon: Star,
    color: "from-emerald-500 to-green-600",
    badge: "bg-green-100 text-green-700 border-green-200",
    description: "จัดการปฏิสัมพันธ์กับลูกค้า มุ่งปิดการขาย ขับเคลื่อนขั้นตอนดีล และออกเอกสารใบเสนอราคา",
    capabilities: [
      { icon: LayoutDashboard, text: "ดูสถิติส่วนบุคคล แดชบอร์ดยอดขาย และเป้าหมายของตนเอง" },
      { icon: UserPlus, text: "จัดการข้อมูลลูกค้ารายบุคคลที่ได้รับมอบหมายและบันทึกประวัติการติดต่อ" },
      { icon: Workflow, text: "เลื่อนสถานะดีลในระบบ Pipeline เพื่ออำนวยความสะดวกในการขาย" },
      { icon: FileText, text: "สร้างและจัดพิมพ์ใบเสนอราคา (Quotation) เฉพาะตัวส่งให้ลูกค้า" },
      { icon: Building2, text: "เข้าถึงข้อมูลแคตตาล็อกโครงการและเช็คสถานะยูนิตว่างได้ทันที" },
    ],
  },
];

// ─── คุณสมบัติเด่นของระบบ ───────────────────────────────────────
const FEATURES = [
  { 
    icon: MessageSquare, 
    title: "In-app Communication", 
    desc: "รองรับการสื่อสารผ่านการโทร แชท และการบันทึกเสียงสนทนาภายในตัวแอปพลิเคชัน เพื่อเก็บประวัติการติดต่อไว้เป็นหลักฐานและตรวจสอบได้" 
  },
  { 
    icon: Workflow, 
    title: "Stage Management", 
    desc: "ระบบจัดการขั้นตอนการขายที่ชัดเจน ตั้งแต่การเริ่มต้นติดต่อ การเสนอราคา การเจรจา ไปจนถึงการปิดการขาย ช่วยให้ทีมงานติดตามสถานะลูกค้าได้อย่างแม่นยำ" 
  },
  { 
    icon: LayoutDashboard, 
    title: "แดชบอร์ดและการวิเคราะห์ยอดขาย", 
    desc: "แดชบอร์ดแสดงสถิติยอดขายและภาพรวมการทำงานของทีมแบบเรียลไทม์ ผู้จัดการและแอดมินสามารถติดตามประสิทธิภาพ วิเคราะห์แนวโน้ม และตัดสินใจได้อย่างรวดเร็วจากข้อมูลจริง" 
  },
  { 
    icon: FileText, 
    title: "ใบเสนอราคาและการอนุมัติเอกสาร", 
    desc: "พนักงานขายสร้างและส่งใบเสนอราคาให้ลูกค้าได้ทันที ผู้จัดการและแอดมินสามารถตรวจสอบและอนุมัติเอกสารได้บนระบบเว็บ พร้อมดาวน์โหลดเป็น PDF ได้โดยตรง" 
  },
];

export default function About() {
  // ดึงข้อมูล User จากระบบจริงเพื่อแสดงผลและปรับปรุง UI
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const currentRole = (user?.role || "GUEST").toUpperCase();
  const userEmail = user?.email || "ผู้มาเยือนทั่วไป";

  // เลือกแท็บบทบาทที่จะเปิดใช้งานขยายตามสิทธิ์จริงของเขาโดยอัตโนมัติ
  const [expandedRole, setExpandedRole] = useState<string | null>(
    ["ADMIN", "MANAGER", "SALE"].includes(currentRole) ? currentRole : "ADMIN"
  );

  // ─── การจัดการข้อมูลทีมผู้พัฒนาและที่ปรึกษาโครงงาน ──────────────────────
  const [team, setTeam] = useState(DEFAULT_TEAM);
  const [teamLoading, setTeamLoading] = useState(true);

  // ดึงข้อมูลทีมจาก API
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/api/settings/about-team`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) setTeam(res.data);
      })
      .catch(() => { /* ใช้ DEFAULT_TEAM ต่อ */ })
      .finally(() => setTeamLoading(false));
  }, []);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempTeam, setTempTeam] = useState(team);

  const handleImageUpload = (key: 'dev1' | 'dev2' | 'advisor', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error("ขนาดรูปภาพใหญ่เกินไป (ไม่ควรเกิน 1.5MB) ❌");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempTeam(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            avatar: reader.result as string
          }
        }));
        toast.success("อัปโหลดรูปภาพสำเร็จ! 📸");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTeam = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/settings/about-team`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(tempTeam),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.message || `บันทึกไม่สำเร็จ (${res.status})`);
      }
      const data = await res.json();
      setTeam(data.data ?? tempTeam);
      setIsEditModalOpen(false);
      toast.success("บันทึกข้อมูลคณะผู้พัฒนาและที่ปรึกษาสำเร็จ! 🎉");
    } catch (err: any) {
      toast.error(err?.message || "บันทึกไม่สำเร็จ");
    }
  };

  const handleResetAll = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/settings/about-team`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(DEFAULT_TEAM),
      });
      if (!res.ok) throw new Error();
      setTempTeam(DEFAULT_TEAM);
      setTeam(DEFAULT_TEAM);
      toast.success("คืนค่าข้อมูลเป็นค่าเริ่มต้นทั้งหมดสำเร็จ! 🔄");
    } catch {
      toast.error("คืนค่าไม่สำเร็จ");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16">

      {/* ── ฮีโร่หัวเรื่องแนะนำระบบ (Premium White Theme with subtle glows) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-pink-200/50 bg-card p-8 md:p-12 shadow-lg transition-all duration-300 hover:shadow-xl">
        {/* Animated Background Gradients & Glows */}
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          {/* Header Texts */}
          <div className="space-y-4 lg:flex-1 w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200/60 text-pink-600 font-bold tracking-wider text-xs w-fit">
              <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
              <span>เกี่ยวกับแพลตฟอร์มของเรา</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-[28px] xl:text-[34px] font-black tracking-tight leading-none flex items-center gap-2.5 sm:whitespace-nowrap">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-pink-500 animate-pulse shrink-0" />
              <span className="bg-gradient-to-r from-pink-600 to-green-600 bg-clip-text text-transparent">{APP_NAME}</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-800 font-bold leading-snug">
              {APP_TAGLINE}
            </p>
            <p className="text-slate-500 leading-relaxed text-xs md:text-sm font-medium max-w-2xl">
              {APP_DESC}
            </p>
          </div>

          {/* Stats Glassmorphic Cards (Premium Horizontal Minimalist Cards - Stacked Vertically on Right) */}
          <div className="flex flex-col gap-3 w-full lg:w-[320px] shrink-0 justify-center">
            {/* Card 1: Web Portal */}
            <div className="bg-white border-2 border-pink-100 p-3.5 rounded-[18px] flex items-center gap-3.5 shadow-sm hover:scale-[102%] hover:shadow-md transition-all duration-300 w-full relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0 border border-pink-100/40">
                <Building2 className="w-4.5 h-4.5 text-pink-500" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-[15px] font-black text-pink-600 leading-tight">Web CRM</div>
                <div className="text-[10.5px] font-bold text-slate-500 mt-0.5 leading-tight truncate">เน้นการขาย & รายละเอียด</div>
              </div>
            </div>

            {/* Card 2: App Call */}
            <div className="bg-white border-2 border-emerald-100 p-3.5 rounded-[18px] flex items-center gap-3.5 shadow-sm hover:scale-[102%] hover:shadow-md transition-all duration-300 w-full relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 border border-green-100/40">
                <PhoneCall className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-[15px] font-black text-emerald-600 leading-tight">App Call</div>
                <div className="text-[10.5px] font-bold text-slate-500 mt-0.5 leading-tight truncate">โทรหาลูกค้าสายตรง</div>
              </div>
            </div>

            {/* Card 3: App Chat */}
            <div className="bg-white border-2 border-amber-100 p-3.5 rounded-[18px] flex items-center gap-3.5 shadow-sm hover:scale-[102%] hover:shadow-md transition-all duration-300 w-full relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100/40">
                <MessageSquare className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-[15px] font-black text-amber-600 leading-tight">App Chat</div>
                <div className="text-[10.5px] font-bold text-slate-500 mt-0.5 leading-tight truncate">แชทโต้ตอบเรียลไทม์</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── แผงบทบาทการใช้งานปัจจุบัน (Custom Role Panel with Gradient and border) ── */}
      <div className="rounded-3xl border border-pink-200/50 bg-card/70 backdrop-blur-md p-6 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">สถานะบัญชีการล็อกอินของคุณ</p>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              ยินดีต้อนรับกลับมา: <span className="bg-gradient-to-r from-pink-600 to-green-600 bg-clip-text text-transparent font-extrabold">{userEmail}</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">บทบาทสิทธิ์ปัจจุบัน:</span>
              <Badge className={cn("text-xs font-bold font-mono px-2.5 py-0.5 shadow-sm border", 
                currentRole === "ADMIN" ? "bg-pink-50 text-pink-700 border-pink-200" :
                currentRole === "MANAGER" ? "bg-rose-50 text-rose-700 border-rose-200" :
                currentRole === "SALE" ? "bg-green-50 text-green-700 border-green-200" :
                "bg-gray-100 text-gray-700 border-gray-200"
              )}>
                {currentRole === "ADMIN" ? "🛡️ ADMIN" :
                 currentRole === "MANAGER" ? "💼 MANAGER" :
                 currentRole === "SALE" ? "⚡ SALE" :
                 "👤 GUEST / CUSTOMER"}
              </Badge>
            </div>
          </div>
          
          <div className="flex-shrink-0 bg-muted/40 rounded-2xl p-4 border border-border/80 max-w-md w-full">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ขีดความสามารถหลักที่เปิดให้คุณใช้งาน:</p>
            <ul className="space-y-1.5">
              {currentRole === "ADMIN" && (
                <>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ สิทธิ์ระดับสูงสุด: ควบคุม ดูภาพรวม และแก้ไขได้ 100%</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ จัดการสร้าง แก้ไข ลบบัญชีผู้ใช้งานระบบ และกำหนดสิทธิ์</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ สิทธิ์ดูแลจัดการยูนิตโครงการและเอกสารคำขอเสนอราคาทั้งหมด</li>
                </>
              )}
              {currentRole === "MANAGER" && (
                <>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ ติดตามพฤติกรรม วิเคราะห์ยอด และช่วยเหลือทีมขายย่อย</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ ตรวจสอบความสมบูรณ์และรายการเอกสารใบเสนอราคาของทีม</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ สิทธิ์วิเคราะห์และเข้าถึงแคตตาล็อกสต็อกโครงการรวม</li>
                </>
              )}
              {currentRole === "SALE" && (
                <>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ ติดต่อ ดูแล และขับเคลื่อนการตอบกลับลูกค้ารายบุคคล</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ ปรับเปลี่ยนสเตจ Pipeline ดีลความคืบหน้าของตนเอง</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ สรรสร้างและจัดพิมพ์ใบเสนอราคาเพื่อใช้เสนอต่อผู้สนใจ</li>
                </>
              )}
              {currentRole !== "ADMIN" && currentRole !== "MANAGER" && currentRole !== "SALE" && (
                <>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ สิทธิ์ผู้สนใจทั่วไป: สามารถเรียกชมรายละเอียดและบริการระบบ</li>
                  <li className="text-xs text-slate-700 flex items-center gap-2">✔ โปรดติดต่อฝ่ายแอดมินระบบหากต้องการเปลี่ยนระดับการเข้าใช้งาน</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* ── คุณสมบัติเด่นของระบบ (Key Features) ── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
          <Star className="w-6 h-6 text-pink-500 fill-pink-500/20" />
          คุณสมบัติเด่นของระบบ (Key Features)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border bg-card p-6 hover:shadow-lg hover:border-pink-300/50 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-to-br group-hover:from-pink-400 group-hover:to-green-400 transition-all duration-300">
                    <f.icon className="w-5 h-5 text-pink-500 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="font-black text-base sm:text-lg group-hover:text-pink-600 transition-colors duration-300 leading-tight">
                    {f.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── แนะนำและแจกแจงบทบาทแบบละเอียด ── */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Shield className="w-6 h-6 text-pink-500" />
            บทบาทและการจัดการระดับสิทธิ์
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            ระบบของเรามีสถาปัตยกรรมแบบ RBAC (Role-Based Access Control) แยกฟังก์ชันการทำงานอย่างชัดเจนเพื่อความปลอดภัย
          </p>
        </div>

        <div className="space-y-3">
          {ROLES.map((role) => {
            const isOpen = expandedRole === role.id;
            const isUserOwnRole = currentRole === role.id;
            
            return (
              <div key={role.id} className={cn("rounded-2xl border-2 overflow-hidden transition-all duration-300", 
                isOpen 
                  ? role.id === "ADMIN" ? "border-pink-300/60 shadow-pink-100/50 shadow-lg"
                    : role.id === "MANAGER" ? "border-pink-300/40 shadow-rose-100/50 shadow-lg"
                    : "border-green-300/60 shadow-green-100/50 shadow-lg"
                  : "border-border",
                isUserOwnRole 
                  ? role.id === "ADMIN" ? "bg-pink-50/10 ring-2 ring-pink-500/20"
                    : role.id === "MANAGER" ? "bg-rose-50/10 ring-2 ring-pink-400/20"
                    : "bg-green-50/10 ring-2 ring-green-500/20"
                  : ""
              )}>
                {/* ปุ่มเปิดปิดและหัวข้อบทบาท */}
                <button
                  className="w-full flex items-center gap-4 p-5 text-left focus:outline-none hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedRole(isOpen ? null : role.id)}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <role.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base">{role.label}</span>
                      <Badge className={cn("text-[9px] font-bold border font-mono tracking-wider px-2 py-0.5", role.badge)}>
                        {role.id}
                      </Badge>
                      {isUserOwnRole && (
                        <Badge className="bg-gradient-to-r from-pink-500 to-green-500 text-white text-[9px] font-bold px-2 py-0.5 animate-pulse border-none">
                          บทบาทปัจจุบันของคุณ
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-normal">{role.description}</p>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0 ml-2">
                    {isOpen ? <ChevronUp className="w-5 h-5 text-pink-500" /> : <ChevronDown className="w-5 h-5" />}
                  </span>
                </button>

                {/* รายการสิ่งที่สามารถกระทำได้เมื่อเปิดออกมา */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t bg-muted/10 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4 mb-3">
                      ความสามารถและรายการจัดการในสิทธิ์นี้:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {role.capabilities.map((cap, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border/80 shadow-sm">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <cap.icon className="w-4 h-4 text-white" />
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed pt-0.5">{cap.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── คณะผู้พัฒนาและที่ปรึกษาโครงงาน (Dynamic & Editable) ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <Users className="w-6 h-6 text-pink-500" />
              คณะผู้พัฒนาและที่ปรึกษาโครงงาน
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">
              พัฒนาและรังสรรค์ระบบด้วยความตั้งใจ พร้อมข้อมูลการแนะแนวและรับคำปรึกษาอย่างถูกต้องเป็นระบบ
            </p>
          </div>

          <button
            onClick={() => {
              setTempTeam(team);
              setIsEditModalOpen(true);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-green-600 hover:opacity-90 text-white font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-[0.98] duration-200"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>ปรับแต่งข้อมูลคณะผู้พัฒนา & รูปภาพ</span>
          </button>
        </div>

        {/* ── อาจารย์ที่ปรึกษาโครงงาน (แสดงผลด้านบนอย่างสมเกียรติ) ── */}
        <div className="max-w-xl mx-auto pt-2">
          <div className="group relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-amber-50/5 hover:border-amber-400 hover:shadow-xl transition-all duration-300 flex flex-row items-center p-4 sm:p-6 gap-4 sm:gap-6 text-left">
            {/* ตกแต่งแบ็คกราวด์ */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.01] to-transparent pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/[0.03] blur-2xl pointer-events-none" />

            {/* รูปภาพโปรไฟล์ อาจารย์ */}
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-amber-200 flex-shrink-0 group-hover:scale-105 transition-transform duration-300 relative bg-muted flex items-center justify-center">
              {team.advisor.avatar ? (
                <img
                  src={team.advisor.avatar}
                  alt={team.advisor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100/50 to-yellow-100/40 flex items-center justify-center text-amber-600/80">
                  <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12 stroke-[1.5]" />
                </div>
              )}
            </div>

            {/* ข้อมูลอาจารย์ */}
            <div className="flex-1 space-y-1.5 text-left">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[9px] sm:text-[10px] tracking-wide uppercase w-fit">
                  <span>Project Advisor</span>
                </div>
                <h3 className="font-black text-base sm:text-xl text-foreground group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                  <GraduationCap className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                  <span>{team.advisor.name}</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">
                  {team.advisor.role}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── สมาชิกผู้พัฒนา (แสดงผลด้านล่างเคียงข้างกัน) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* คนที่ 1: Me */}
          <div className="group relative overflow-hidden rounded-3xl border bg-card hover:shadow-xl hover:border-pink-300/50 transition-all duration-300 flex flex-row items-center p-4 sm:p-6 gap-4 sm:gap-6 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/[0.01] to-transparent pointer-events-none" />
            
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-pink-200 flex-shrink-0 group-hover:scale-105 transition-transform duration-300 relative bg-muted flex items-center justify-center">
              {team.dev1.avatar ? (
                <img
                  src={team.dev1.avatar}
                  alt={team.dev1.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-250 flex items-center justify-center text-pink-600">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 stroke-[1.5]" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-left">
              <div>
                <h3 className="font-black text-sm sm:text-lg text-foreground group-hover:text-pink-600 transition-colors flex items-center gap-1.5">
                  <UserCog className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-pink-500 shrink-0" />
                  <span>{team.dev1.name}</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5">
                  {team.dev1.role}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border text-[9px] sm:text-xs font-mono font-bold text-slate-700">
                <span className="text-muted-foreground text-[8px] sm:text-[10px]">รหัสนักศึกษา:</span>
                <span>{team.dev1.studentId}</span>
              </div>
            </div>
          </div>

          {/* คนที่ 2: Friend */}
          <div className="group relative overflow-hidden rounded-3xl border bg-card hover:shadow-xl hover:border-green-300/50 transition-all duration-300 flex flex-row items-center p-4 sm:p-6 gap-4 sm:gap-6 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.01] to-transparent pointer-events-none" />
            
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-green-200 flex-shrink-0 group-hover:scale-105 transition-transform duration-300 relative bg-muted flex items-center justify-center">
              {team.dev2.avatar ? (
                <img
                  src={team.dev2.avatar}
                  alt={team.dev2.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center text-green-600">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 stroke-[1.5]" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-left">
              <div>
                <h3 className="font-black text-sm sm:text-lg text-foreground group-hover:text-green-600 transition-colors flex items-center gap-1.5">
                  <UserCog className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500 shrink-0" />
                  <span>{team.dev2.name}</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5">
                  {team.dev2.role}
                </p>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border text-[9px] sm:text-xs font-mono font-bold text-slate-700">
                <span className="text-muted-foreground text-[8px] sm:text-[10px]">รหัสนักศึกษา:</span>
                <span>{team.dev2.studentId}</span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── ฟูตเตอร์ระบุด้านล่าง ── */}
      <div className="text-center text-xs text-muted-foreground border-t pt-6">
        <p className="font-bold text-sm text-foreground mb-1">{APP_NAME}</p>
        <p>{APP_TAGLINE}</p>
        <p className="text-[10px] text-muted-foreground mt-2">© 2026 {APP_NAME} Team. All rights reserved.</p>
      </div>

      {/* ── EDIT MODE MODAL (Glassmorphic Uploader Panel) ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 p-6 md:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
                  ปรับแต่งข้อมูลผู้พัฒนา & ที่ปรึกษา
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  แก้ไขชื่อ ข้อมูล หรืออัปโหลดรูปภาพใหม่เพื่อแสดงบนเว็บไซต์ ข้อมูลจะบันทึกไว้ในบราวเซอร์เครื่องนี้
                </p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Forms */}
            <div className="space-y-6">
              {/* Section 1: Developer 1 */}
              <div className="bg-pink-50/10 border border-pink-100/50 p-4 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-pink-100/30">
                  <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-bold text-pink-700">ผู้พัฒนาคนแรก (ตัวฉัน)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">ชื่อ-นามสกุล</label>
                    <input 
                      type="text"
                      className="w-full text-sm px-3.5 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                      value={tempTeam.dev1.name}
                      onChange={(e) => setTempTeam({
                        ...tempTeam,
                        dev1: { ...tempTeam.dev1, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">รหัสนักศึกษา</label>
                    <input 
                      type="text"
                      className="w-full text-sm px-3.5 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                      value={tempTeam.dev1.studentId}
                      onChange={(e) => setTempTeam({
                        ...tempTeam,
                        dev1: { ...tempTeam.dev1, studentId: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border shadow-sm flex-shrink-0 bg-muted flex items-center justify-center">
                    {tempTeam.dev1.avatar ? (
                      <img src={tempTeam.dev1.avatar} alt="Dev 1 Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-bold cursor-pointer transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>อัปโหลดรูปภาพ</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload('dev1', e)} 
                        />
                      </label>
                      {tempTeam.dev1.avatar && (
                        <button
                          onClick={() => setTempTeam({
                            ...tempTeam,
                            dev1: { ...tempTeam.dev1, avatar: "" }
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรูปภาพ</span>
                        </button>
                      )}

                    </div>
                    <p className="text-[10px] text-muted-foreground">💡 แนะนำ: ใช้รูปสัดส่วน 1:1 ขนาดไม่เกิน 1.5MB เพื่อประสิทธิภาพการบันทึก</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Developer 2 */}
              <div className="bg-emerald-50/10 border border-emerald-100/50 p-4 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-100/30">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-700">ผู้พัฒนาคนที่สอง (เพื่อน)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">ชื่อ-นามสกุล</label>
                    <input 
                      type="text"
                      className="w-full text-sm px-3.5 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      value={tempTeam.dev2.name}
                      onChange={(e) => setTempTeam({
                        ...tempTeam,
                        dev2: { ...tempTeam.dev2, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">รหัสนักศึกษา</label>
                    <input 
                      type="text"
                      className="w-full text-sm px-3.5 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      value={tempTeam.dev2.studentId}
                      onChange={(e) => setTempTeam({
                        ...tempTeam,
                        dev2: { ...tempTeam.dev2, studentId: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border shadow-sm flex-shrink-0 bg-muted flex items-center justify-center">
                    {tempTeam.dev2.avatar ? (
                      <img src={tempTeam.dev2.avatar} alt="Dev 2 Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-bold cursor-pointer transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>อัปโหลดรูปภาพ</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload('dev2', e)} 
                        />
                      </label>
                      {tempTeam.dev2.avatar && (
                        <button
                          onClick={() => setTempTeam({
                            ...tempTeam,
                            dev2: { ...tempTeam.dev2, avatar: "" }
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรูปภาพ</span>
                        </button>
                      )}

                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Advisor */}
              <div className="bg-amber-50/10 border border-amber-100/50 p-4 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-100/30">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-bold text-amber-700">อาจารย์ที่ปรึกษาโครงงาน</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">ชื่อ-นามสกุลอาจารย์</label>
                    <input 
                      type="text"
                      className="w-full text-sm px-3.5 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      value={tempTeam.advisor.name}
                      onChange={(e) => setTempTeam({
                        ...tempTeam,
                        advisor: { ...tempTeam.advisor, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">ตำแหน่ง / บทบาทหน้าที่</label>
                    <input 
                      type="text"
                      className="w-full text-sm px-3.5 py-2 rounded-xl border bg-background focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                      value={tempTeam.advisor.role}
                      onChange={(e) => setTempTeam({
                        ...tempTeam,
                        advisor: { ...tempTeam.advisor, role: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border shadow-sm flex-shrink-0 bg-muted flex items-center justify-center">
                    {tempTeam.advisor.avatar ? (
                      <img src={tempTeam.advisor.avatar} alt="Advisor Preview" className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-bold cursor-pointer transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>อัปโหลดรูปภาพ</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload('advisor', e)} 
                        />
                      </label>
                      {tempTeam.advisor.avatar && (
                        <button
                          onClick={() => setTempTeam({
                            ...tempTeam,
                            advisor: { ...tempTeam.advisor, avatar: "" }
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรูปภาพ</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">

              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border bg-background hover:bg-muted transition-all duration-200"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ยกเลิก</span>
                </button>
                <button
                  onClick={handleSaveTeam}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-pink-500 to-green-600 text-white shadow-md hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
