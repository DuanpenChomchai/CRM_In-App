import { useState } from "react";
import {
  AlertTriangle,
  Mail,
  PhoneCall,
  Sparkles,
  Send,
  Clock,
  LifeBuoy,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [reportForm, setReportForm] = useState({
    name: "",
    contact: "",
    category: "BUG",
    description: ""
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleSendReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.description.trim()) {
      toast.error("กรุณากรอกรายละเอียดปัญหาที่พบด้วยนะคะ ❌");
      return;
    }
    setIsSubmittingReport(true);
    setTimeout(() => {
      setIsSubmittingReport(false);
      toast.success("ส่งรายงานปัญหาสำเร็จ! คณะผู้พัฒนาได้รับข้อมูลเรียบร้อยแล้ว 🚀");
      setReportForm({
        name: "",
        contact: "",
        category: "BUG",
        description: ""
      });
    }, 850);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-16 animate-in fade-in duration-300">
      
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-pink-200/50 bg-card p-8 md:p-12 shadow-lg transition-all duration-300 hover:shadow-xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-pink-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4 flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200/60 text-pink-600 font-bold tracking-wider text-xs w-fit">
              <LifeBuoy className="w-3.5 h-3.5 text-pink-500 animate-spin-slow" />
              <span>ศูนย์สนับสนุนและช่วยเหลือ</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-none">
              <span className="bg-gradient-to-r from-pink-600 to-green-600 bg-clip-text text-transparent">ติดต่อเรา / รายงานปัญหา</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 font-semibold leading-relaxed max-w-2xl">
              หากพบบั๊ก ข้อผิดพลาด หรือต้องการความช่วยเหลือด้านเทคนิค ทีมงานผู้พัฒนาพร้อมให้บริการและตรวจสอบทุกปัญหาเพื่อให้ระบบทำงานได้อย่างราบรื่นที่สุดค่ะ
            </p>
          </div>
          
          <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-pink-100 to-green-100 p-6 rounded-3xl border border-white shadow-inner">
            <LifeBuoy className="w-16 h-16 text-pink-500 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
        </div>
      </div>

      {/* ── ช่องทางการติดต่อและแบบฟอร์ม ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ฝั่งซ้าย: ข้อมูลช่องทางติดต่อ (5 คอลัมน์) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50/30 border border-pink-100 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-200/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500"></span>
              </span>
              <h3 className="font-extrabold text-base text-pink-600">ช่องทางการติดต่อตรง</h3>
            </div>
            
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              หากระบบขัดข้องฉุกเฉิน หรือต้องการติดต่อสอบถามข้อมูลโครงงานโดยตรง สามารถประสานงานตามช่องทางด้านล่างนี้ได้เลยค่ะ
            </p>

            <div className="space-y-4">
              {/* ช่องทางที่ 1: อีเมลด่วน */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-pink-100/60 shadow-sm hover:scale-[101%] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0 text-pink-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">อีเมลสนับสนุนหลัก</div>
                  <div className="text-xs sm:text-[13.5px] font-black text-slate-800 break-all select-all">support.crm@university.ac.th</div>
                </div>
              </div>

              {/* ช่องทางที่ 2: เบอร์ติดต่อด่วน */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-pink-100/60 shadow-sm hover:scale-[101%] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เบอร์โทรศัพท์ติดต่อฉุกเฉิน</div>
                  <div className="text-xs sm:text-[13.5px] font-black text-slate-800 select-all">02-123-4567 (ต่อ 890)</div>
                </div>
              </div>

              {/* ช่องทางที่ 3: เวลาให้บริการ */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-pink-100/60 shadow-sm hover:scale-[101%] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เวลาทำการฝ่ายสนับสนุน</div>
                  <div className="text-xs sm:text-[13.5px] font-black text-slate-800">จันทร์ - ศุกร์ (09:00 - 18:00 น.)</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* การช่วยเหลือเพิ่มเติม */}
          <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/20 border border-green-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-green-700 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-green-500" />
              <span>ความเร็วในการประมวลผลคำขอ</span>
            </h4>
            <ul className="text-xs text-slate-600 space-y-2.5 font-bold">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                <span>รายงานประเภท Bug: ตรวจสอบและแก้ไขภายใน 24 ชม.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>ปัญหาการใช้งานบัญชี: ตรวจสอบสิทธิ์ภายใน 12 ชม.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>ข้อเสนอแนะทั่วไป: นำเข้าที่ประชุมโครงการสัปดาห์ละ 1 ครั้ง</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ฝั่งขวา: แบบฟอร์มแจ้งปัญหา (7 คอลัมน์) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSendReport} className="bg-card border border-pink-200/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-5 relative overflow-hidden group">
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-2 pb-3 border-b">
              <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm md:text-base text-slate-800">ฟอร์มส่งข้อมูลแจ้งปัญหาด่วน</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">ชื่อผู้แจ้งปัญหา</label>
                <input
                  type="text"
                  placeholder="เช่น นฤมล (พนักงานขาย)"
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold"
                  value={reportForm.name}
                  onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">อีเมล / เบอร์ติดต่อกลับ</label>
                <input
                  type="text"
                  placeholder="เช่น support@mycompany.com"
                  className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold"
                  value={reportForm.contact}
                  onChange={(e) => setReportForm({ ...reportForm, contact: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">หมวดหมู่และประเภทปัญหา</label>
              <select
                className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold"
                value={reportForm.category}
                onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
              >
                <option value="BUG">🐛 พบบั๊กของระบบ / ระบบขัดข้อง</option>
                <option value="LOGIN">🔑 ปัญหาบัญชีล็อกอินและการระบุสิทธิ์</option>
                <option value="LAYOUT">🎨 หน้าเว็บแสดงผลเพี้ยน / เลย์เอาต์ผิดพลาด</option>
                <option value="PIPELINE">💼 ระบบสเตจ CRM และเอกสารข้อเสนอ</option>
                <option value="OTHER">💡 คำแนะนำทั่วไป / ข้อเสนอแนะพัฒนาเพิ่ม</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">รายละเอียดปัญหา (โปรดระบุด่วน) *</label>
              <textarea
                rows={4}
                required
                placeholder="ช่วยพิมพ์อธิบายปัญหาสั้น ๆ เช่น 'พยายามเลื่อนดีลเข้าสเตจถัดไปแล้วระบบแสดง Error แจ้งสิทธิ์ไม่เพียงพอค่ะ'..."
                className="w-full text-xs sm:text-sm px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all font-semibold resize-none"
                value={reportForm.description}
                onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingReport}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-green-600 text-white font-extrabold text-xs sm:text-sm shadow-md hover:opacity-90 hover:scale-[101%] active:scale-[99%] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
            >
              {isSubmittingReport ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>กำลังส่งรายงานปัญหา...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ส่งรายงานปัญหาทันที</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-6">
        <p className="font-bold text-sm text-foreground mb-1">Stage-based CRM & In-app communication</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 CRM Team. All rights reserved.</p>
      </div>

    </div>
  );
}
