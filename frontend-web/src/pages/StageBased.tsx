import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  CalendarIcon,
  Upload,
  User,
  Phone,
  Home,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Star,
  Search,
  FileText,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { DraggableDealCard } from "@/components/layout/DraggableDealCard";
import { DroppableStageColumn } from "@/components/layout/DroppableStageColumn";

interface Deal {
  id: number | string;
  customerId: number;
  customerName: string;
  phone: string;
  propertyType: string;
  budget: number;
  stage: "contacted" | "negotiation" | "quotation" | "closed";
  status?: string;
  startDate?: Date;
  endDate?: Date;
  assignedSales?: string;
  files?: string[];
  quotationFiles?: string[];
  priceOffered?: number;
  terms?: string;
  quotationNumbers?: string[];
  quotations?: any[];
  finalValue?: number;
  dealStatus?: "won" | "lost";
  closingDate?: Date;
  purchaseCount?: number; // จำนวนครั้งที่ปิดดีลสำเร็จแล้ว
  isHistorical?: boolean;
  roundNumber?: number;
}

type ApiStage = "CONTACTED" | "NEGOTIATING" | "QUOTATION" | "CLOSED";

const API_BASE = import.meta.env.VITE_API_BASE;

const getToken = () => localStorage.getItem("token") || "";

const uiToApi = (s: Deal["stage"]): ApiStage => {
  if (s === "contacted") return "CONTACTED";
  if (s === "negotiation") return "NEGOTIATING";
  if (s === "quotation") return "QUOTATION";
  return "CLOSED";
};

const apiToUi = (s: ApiStage): Deal["stage"] => {
  if (s === "CONTACTED") return "contacted";
  if (s === "NEGOTIATING") return "negotiation";
  if (s === "QUOTATION") return "quotation";
  return "closed";
};

const StageBased = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handleViewQuotation = (qId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = getToken();
    if (!token) return;
    window.open(
      `${API_BASE}/api/quotations/${qId}/pdf?t=${encodeURIComponent(token)}`,
      "_blank",
    );
  };

  const handleDeleteQuotation = async (
    qId: number,
    quotationNumber: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!window.confirm(`ยืนยันการลบใบเสนอราคา ${quotationNumber}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/quotations/${qId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("ลบใบเสนอราคาเรียบร้อยแล้ว");
      fetchBoard();
    } catch {
      toast.error("ลบใบเสนอราคาล้มเหลว");
    }
  };
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<Deal["stage"]>("contacted");
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [isRepeatConfirmOpen, setIsRepeatConfirmOpen] = useState(false);
  const [repeatTargetDeal, setRepeatTargetDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const [deals, setDeals] = useState<Deal[]>([]);
  const [salesList, setSalesList] = useState<{ id: number; name: string }[]>(
    [],
  );

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const role = (userObj?.role || "GUEST").toUpperCase();
  const userId = userObj?.id;

  // ─── fetch board from backend ───────────────────────────────────────────────
  const fetchBoard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pipeline/board`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Load board failed");
      const data = await res.json();

      const mapped: Deal[] = [];
      const pushCol = (apiStage: ApiStage, list: any[]) => {
        for (const c of list) {
          const latestQ = c.quotations?.[0];
          const latestClosed = c.closedDeals?.[0];
          const latestNego = c.negotiations?.[0];
          const latestLog = c.contactedLogs?.[0];
          const rawResult = (latestClosed?.result ?? "").toUpperCase();

          mapped.push({
            id: c.dummyId || c.id, // ใช้ dummyId เป็น id หลักใน dnd
            customerId: c.id,
            customerName: c.name || "-",
            phone: c.tel ?? c.tol ?? "-",
            propertyType: c.interestedProperty?.type ?? c.productType ?? "-",
            budget: Number(c.priceBudget || 0),
            stage: apiToUi(apiStage),
            assignedSales: c.sale?.name,
            status: latestLog?.status ?? latestNego?.status ?? undefined,
            startDate: c.updatedAt ? new Date(c.updatedAt) : undefined,
            quotationNumbers: (c.quotations || [])
              .map((q: any) => q.quotationNumber)
              .filter(Boolean),
            quotations: c.quotations || [],
            priceOffered: latestQ
              ? Number(latestQ.totalAmount || 0)
              : undefined,
            terms: latestQ?.terms,
            finalValue: latestClosed?.finalValue
              ? Number(latestClosed.finalValue)
              : undefined,
            closingDate: latestClosed?.closingDate
              ? new Date(latestClosed.closingDate)
              : undefined,
            dealStatus:
              rawResult === "WON"
                ? "won"
                : rawResult === "LOST"
                  ? "lost"
                  : undefined,
            purchaseCount: c._count?.closedDeals ?? 0, // จำนวนครั้งที่ซื้อสำเร็จแล้ว (WON+LOST)
            isHistorical: c.isHistorical,
            roundNumber: c.roundNumber,
          });
        }
      };

      pushCol("CONTACTED", data.columns.CONTACTED || []);
      pushCol("NEGOTIATING", data.columns.NEGOTIATING || []);
      pushCol("QUOTATION", data.columns.QUOTATION || []);
      pushCol("CLOSED", data.columns.CLOSED || []);

      // โหลด quotationFiles จาก localStorage
      const withFiles = mapped.map((d) => {
        const saved = localStorage.getItem(`quotationFiles_${d.customerId}`);
        return saved ? { ...d, quotationFiles: JSON.parse(saved) } : d;
      });
      setDeals(withFiles);
    } catch (e: any) {
      console.error(e);
      toast.error("โหลด Pipeline ไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  // ─── fetch sales staff ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/users/sales-list`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setSalesList(d.data || []))
      .catch(() => {});
  }, []);
  // ─── repeat purchase ───────────────────────────────────────────────────────
  const handleRepeatPurchase = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    setRepeatTargetDeal(deal);
    setIsRepeatConfirmOpen(true);
  };

  const confirmRepeatPurchase = async () => {
    if (!repeatTargetDeal) return;
    try {
      const res = await fetch(`${API_BASE}/api/pipeline/repeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ customerId: repeatTargetDeal.customerId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "เริ่มดีลใหม่ไม่สำเร็จ");
        return;
      }
      toast.success(
        `เริ่ม Pipeline ใหม่สำหรับ ${repeatTargetDeal.customerName} แล้ว`,
      );
      fetchBoard();
    } catch {
      toast.error("เริ่มดีลใหม่ไม่สำเร็จ");
    } finally {
      setIsRepeatConfirmOpen(false);
      setRepeatTargetDeal(null);
    }
  };

  const stages = [
    { id: "contacted", title: "ติดต่อแล้ว", color: "bg-blue-500" },
    { id: "negotiation", title: "เจรจาต่อรอง", color: "bg-yellow-500" },
    { id: "quotation", title: "เสนอราคา", color: "bg-purple-500" },
    { id: "closed", title: "ปิดการขายสำเร็จ", color: "bg-green-500" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleOpenDialog = (deal: Deal, stage: Deal["stage"]) => {
    setSelectedDeal({ ...deal });
    setCurrentStage(stage);
    setIsDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find((d) => d.id === Number(event.active.id));
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveDeal(null);
      return;
    }

    const dealId = Number(active.id);
    const newStage = over.id as Deal["stage"];

    if (
      !["contacted", "negotiation", "quotation", "closed"].includes(newStage)
    ) {
      setActiveDeal(null);
      return;
    }

    const moving = deals.find((d) => d.id === dealId);
    if (!moving || moving.stage === newStage) {
      setActiveDeal(null);
      return;
    }

    // ✅ ย้ายได้เฉพาะไปข้างหน้าเท่านั้น
    const stageOrder = ["contacted", "negotiation", "quotation", "closed"];
    const fromIdx = stageOrder.indexOf(moving.stage);
    const toIdx = stageOrder.indexOf(newStage);
    if (toIdx <= fromIdx) {
      toast.error("ไม่สามารถย้ายย้อนกลับได้ ย้ายไปข้างหน้าเท่านั้น");
      setActiveDeal(null);
      return;
    }

    // optimistic update
    const prev = deals;
    setDeals((p) =>
      p.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    );
    if (newStage === "closed") {
      handleOpenDialog(moving, newStage);
    } else {
      toast.success(
        `ย้ายดีลไปยัง ${stages.find((s) => s.id === newStage)?.title} เรียบร้อย`,
      );
    }
    setActiveDeal(null);

    try {
      const res = await fetch(`${API_BASE}/api/pipeline/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          customerId: moving.customerId,
          toStatus: uiToApi(newStage),
        }),
      });
      if (!res.ok) throw new Error("Move failed");
      await fetchBoard();
    } catch (e: any) {
      toast.error("ย้าย Stage ไม่สำเร็จ");
      setDeals(prev);
    }
  };

  // ✅ Filter deals based on search
  const filteredDeals = deals.filter(
    (d) =>
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery),
  );

  // ✅ Calculate Stats per Column
  const getStageStats = (stageId: string) => {
    const stageDeals = filteredDeals.filter((d) => d.stage === stageId);
    const totalCount = stageDeals.length;
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.budget || 0), 0);
    return { totalCount, totalValue };
  };

  const handleSaveChanges = async () => {
    if (!selectedDeal) return;

    // อัปเดต local state ทันที
    setDeals((p) =>
      p.map((d) => (d.id === selectedDeal.id ? selectedDeal : d)),
    );

    try {
      // 1. อัปเดตข้อมูลลูกค้า (ชื่อ, เบอร์, อสังหา, งบประมาณ, เซลล์)
      const saleObj = salesList.find(
        (s) => s.name === selectedDeal.assignedSales,
      );
      await fetch(`${API_BASE}/api/customers/${selectedDeal.customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: selectedDeal.customerName,
          phone: selectedDeal.phone,
          productType: selectedDeal.propertyType,
          budget: selectedDeal.budget,
          saleId: saleObj ? saleObj.id : undefined,
        }),
      });

      // 2. sync stage กับ backend พร้อมรายละเอียดทุก field
      const movePayload: any = {
        customerId: selectedDeal.customerId,
        toStatus: uiToApi(currentStage),
        endDate: selectedDeal.endDate?.toISOString(),
        // CONTACTED
        contactedStatus:
          currentStage === "contacted" ? selectedDeal.status : undefined,
        // NEGOTIATING
        negotiationStatus:
          currentStage === "negotiation" ? selectedDeal.status : undefined,
        note: selectedDeal.terms || undefined,
        // QUOTATION
        quotationPrice:
          currentStage === "quotation" ? selectedDeal.priceOffered : undefined,
        terms: currentStage === "quotation" ? selectedDeal.terms : undefined,
        // CLOSED
        closedResult:
          currentStage === "closed" && selectedDeal.dealStatus
            ? selectedDeal.dealStatus === "won"
              ? "WON"
              : "LOST"
            : undefined,
        finalValue: selectedDeal.finalValue,
        closingDate: selectedDeal.closingDate?.toISOString(),
      };

      const res = await fetch(`${API_BASE}/api/pipeline/move`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(movePayload),
      });

      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");

      // 3. อัปโหลดไฟล์จริงเข้า MinIO (เฉพาะ quotation stage)
      if (currentStage === "quotation" && pendingFiles.length > 0) {
        // โหลด board ใหม่เพื่อหา quotationId ล่าสุด
        const boardRes = await fetch(`${API_BASE}/api/pipeline/board`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const boardData = await boardRes.json();
        const custInBoard = (boardData.columns?.QUOTATION || []).find(
          (c: any) => c.id === selectedDeal.customerId,
        );
        const quotationId = custInBoard?.quotations?.[0]?.id;

        if (quotationId) {
          for (const file of pendingFiles) {
            const fd = new FormData();
            fd.append("file", file);
            await fetch(`${API_BASE}/api/quotations/${quotationId}/files`, {
              method: "POST",
              headers: { Authorization: `Bearer ${getToken()}` },
              body: fd,
            });
          }
          setPendingFiles([]);
        }
      }

      toast.success("บันทึกข้อมูลสำเร็จ");
      fetchBoard();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "บันทึกไม่สำเร็จ");
    }

    setIsDialogOpen(false);
  };

  const handleDownloadFile = async (
    quotationId: number,
    fileId: number,
    fileName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(
        `${API_BASE}/api/quotations/${quotationId}/files/${fileId}/download`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!res.ok) { toast.error("ดาวน์โหลดไม่สำเร็จ"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("ดาวน์โหลดไม่สำเร็จ");
    }
  };

  const DealCard = ({ deal }: { deal: Deal }) => {
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    // ✅ แปลง enum ภาษาอังกฤษจาก backend เป็นภาษาไทย
    const statusToThai = (
      status: string | undefined,
      stage: string,
    ): string => {
      const map: Record<string, string> = {
        // Contacted
        FOLLOWING_UP: "กำลังติดตาม",
        WAITING_REPLY: "รอลูกค้าตอบกลับ",
        APPOINTED: "นัดพบแล้ว",
        NOT_INTERESTED: "ลูกค้าไม่สนใจ",
        // Negotiation
        NEGOTIATING: "อยู่ระหว่างเจรจา",
        WAITING_CONFIRM: "รอลูกค้ายืนยัน",
        COUNTER_OFFER: "ลูกค้าต่อราคา",
        PAUSED: "ชะลอการเจรจา",
        // Closed
        WON: "ปิดการขายสำเร็จ",
        LOST: "ปิดการขายไม่สำเร็จ",
        CLOSED: "ปิดการขายแล้ว",
      };
      if (status && map[status]) return map[status];
      // ถ้า status เป็นภาษาไทยอยู่แล้ว (จาก dropdown)
      if (status && !status.match(/^[A-Z_]+$/)) return status;
      // fallback ตาม stage
      if (stage === "contacted") return "กำลังติดตาม";
      if (stage === "negotiation") return "อยู่ระหว่างเจรจา";
      if (stage === "quotation") return "ส่งใบเสนอราคาแล้ว";
      if (stage === "closed") return "ปิดการขายแล้ว";
      return status || "-";
    };

    const statusOptions = {
      contacted: [
        "กำลังติดตาม",
        "รอลูกค้าตอบกลับ",
        "นัดพบแล้ว",
        "ลูกค้าไม่สนใจ",
      ],
      negotiation: [
        "อยู่ระหว่างเจรจา",
        "รอลูกค้ายืนยัน",
        "ลูกค้าต่อราคา",
        "ชะลอการเจรจา",
      ],
      quotation: [
        "ส่งใบเสนอราคาแล้ว",
        "ลูกค้ากำลังพิจารณา",
        "ลูกค้าขอปรับราคา",
        "รอผู้จัดการอนุมัติ",
      ],
      closed: ["ปิดการขายสำเร็จ", "ปิดการขายไม่สำเร็จ"],
    };

    const handleStatusChange = (newStatus: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeals(
        deals.map((d) => (d.id === deal.id ? { ...d, status: newStatus } : d)),
      );
      setIsStatusOpen(false);
      toast.success(`เปลี่ยนสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    };

    const getStatusBadge = () => {
      const currentStatus = statusToThai(deal.status, deal.stage);

      const getStatusColor = () => {
        switch (deal.stage) {
          case "contacted":
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200/50 hover:bg-blue-200";
          case "negotiation":
            return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 hover:bg-amber-200";
          case "quotation":
            return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200/50 hover:bg-purple-200";
          case "closed":
            return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200/50 hover:bg-emerald-200";
          default:
            return "bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-400 border border-stone-200/50 hover:bg-stone-200";
        }
      };

      return (
        <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer",
                getStatusColor(),
              )}
            >
              {currentStatus}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-2"
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                เลือกสถานะ
              </div>
              {statusOptions[deal.stage].map((status) => (
                <button
                  key={status}
                  onClick={(e) => handleStatusChange(status, e)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    deal.status === status &&
                      "bg-accent text-accent-foreground font-medium",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    };

    return (
      <div
        className={cn(
          "group p-4 bg-gradient-to-br rounded-xl border shadow-sm transition-all duration-300 cursor-pointer backdrop-blur-sm",
          deal.isHistorical
            ? "from-slate-50 to-slate-100/40 border-slate-200/80 hover:border-slate-300 hover:shadow-md opacity-95 dark:from-slate-900/80 dark:to-slate-900/40"
            : "from-card to-card/80 border-border/50 hover:shadow-lg hover:border-primary/30",
        )}
        onClick={() => handleOpenDialog(deal, deal.stage)}
      >
        <div className="space-y-3">
          {/* Header with status badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 max-w-[70%]">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors mt-0.5 shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col items-start pt-1 min-w-0 gap-2.5">
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors leading-normal break-words pb-1">
                  {deal.customerName}
                </div>
                {/* ✅ แสดงประวัติเก่า — ไว้บรรทัดล่างเพื่อไม่กวนชื่อ */}
                {deal.isHistorical && (
                  <span className="flex items-center whitespace-nowrap shrink-0 gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 border border-stone-200 shadow-sm dark:bg-stone-900 dark:text-stone-400 dark:border-stone-800 tracking-wide w-fit">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ซื้อครั้งที่ {deal.roundNumber}
                  </span>
                )}

                {/* ✅ แสดงประวัติการเป็นลูกค้าเก่า — สำหรับการ์ดที่ไม่ใช่ historical */}
                {(deal.purchaseCount ?? 0) > 0 && !deal.isHistorical && (
                  <span className="flex items-center whitespace-nowrap shrink-0 gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200 shadow-sm dark:from-amber-900/50 dark:to-orange-900/50 dark:text-amber-400 dark:border-amber-800/50 pb-[3px] w-fit">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    ลูกค้าเก่า (ซื้อมาแล้ว {deal.purchaseCount} ครั้ง)
                  </span>
                )}
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Contact & Property Info (Inside: Common to all stages) */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{deal.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">ประเภทอสังหา:</span>
              <span className="font-medium">{deal.propertyType}</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-muted-foreground font-normal">
                งบประมาณ:
              </span>
              <span>{deal.budget > 0 ? formatCurrency(deal.budget) : "-"}</span>
            </div>
          </div>

          {/* Start Date - Common to Dialog */}
          {deal.startDate && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              วันที่เริ่มต้น:{" "}
              {format(deal.startDate, "dd MMM yyyy", { locale: th })}
            </div>
          )}

          {/* Assigned Sales - Only Negotiation+ (Match Dialog visibility) */}
          {(deal.stage === "negotiation" ||
            deal.stage === "quotation" ||
            deal.stage === "closed") &&
            deal.assignedSales && (
              <div className="text-xs">
                <span className="text-muted-foreground">
                  พนักงานขายที่ดูแล:
                </span>{" "}
                <span className="font-medium text-foreground">
                  {deal.assignedSales}
                </span>
              </div>
            )}

          {/* Quotation Stage Details (Match Dialog visibility) */}
          {deal.stage === "quotation" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {deal.priceOffered ? (
                <div className="text-xs">
                  <span className="text-muted-foreground">ราคาที่เสนอ:</span>{" "}
                  <span className="font-semibold text-primary">
                    {formatCurrency(deal.priceOffered)}
                  </span>
                </div>
              ) : null}
              {deal.quotations && deal.quotations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {deal.quotations.map((q: any) => (
                    <div
                      key={q.id}
                      className="inline-flex items-center group/quote"
                    >
                      <button
                        onClick={(e) => handleViewQuotation(q.id, e)}
                        className="text-[10px] font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded-l-md border border-amber-200/50 flex items-center gap-1 transition-colors"
                        title="คลิกเพื่อดูใบเสนอราคา"
                      >
                        <FileText className="w-3 h-3 text-amber-500 transition-transform" />
                        {q.quotationNumber}
                      </button>
                      <button
                        onClick={(e) =>
                          handleDeleteQuotation(q.id, q.quotationNumber, e)
                        }
                        className="text-[10px] text-amber-600 bg-amber-50 hover:bg-red-100 hover:text-red-600 dark:bg-amber-950/30 dark:text-amber-400 border border-l-0 border-amber-200/50 p-1 rounded-r-md transition-colors"
                        title="ลบใบเสนอราคา"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {deal.terms && (
                <div className="text-xs">
                  <span className="text-muted-foreground">
                    เงื่อนไขเพิ่มเติม:
                  </span>{" "}
                  <span className="text-foreground line-clamp-1">
                    {deal.terms}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Closed Deal Stage Details (Match Dialog visibility) */}
          {deal.stage === "closed" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {deal.finalValue && (
                <div className="text-xs">
                  <span className="text-muted-foreground">มูลค่าสุดท้าย:</span>{" "}
                  <span className="font-bold text-primary">
                    {formatCurrency(deal.finalValue)}
                  </span>
                </div>
              )}
              {deal.dealStatus && (
                <div className="text-xs">
                  <span className="text-muted-foreground">สถานะดีล:</span>{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      deal.dealStatus === "won"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {deal.dealStatus === "won" ? "สำเร็จ" : "ไม่สำเร็จ"}
                  </span>
                </div>
              )}
              {deal.closingDate && (
                <div className="text-xs">
                  <span className="text-muted-foreground">
                    วันที่ปิดการขาย:
                  </span>{" "}
                  <span className="font-medium text-foreground">
                    {format(deal.closingDate, "dd MMM yyyy", { locale: th })}
                  </span>
                </div>
              )}
              {/* ✅ ปุ่มซื้อซ้ำ — ทุก role กดได้ แต่แสดงเฉพาะรายการล่าสุด */}
              {!deal.isHistorical && deal.dealStatus && (
                <div className="pt-2">
                  <button
                    onClick={(e) => handleRepeatPurchase(deal, e)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-bold rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 hover:brightness-110 border-none transition-all duration-300 group/btn"
                  >
                    <RefreshCw className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" />
                    เริ่มดีลซื้อซ้ำ (รอบที่ {(deal.purchaseCount ?? 0) + 1})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50/50 dark:bg-transparent">
        {/* Header Section */}
        <div className="p-6 pb-2 space-y-4 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
              <p className="text-sm text-muted-foreground mt-1">
                บริหารจัดการขั้นตอนการขายของคุณแบบเรียลไทม์
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Search className="w-4 h-4" />
              </span>
              <Input
                placeholder="ค้นหาชื่อลูกค้าหรือเบอร์โทร..."
                className="pl-10 rounded-xl bg-white/80 backdrop-blur-sm border-stone-200 focus:ring-primary shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Kanban Board Container */}
        <div className="flex-1 overflow-x-auto p-6 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground font-medium">
                  กำลังโหลดบอร์ดของคุณ...
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-full min-w-max pb-4">
              {stages.map((stage) => {
                const { totalCount, totalValue } = getStageStats(stage.id);
                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "flex-shrink-0 w-[280px] md:w-80 h-full flex flex-col rounded-[2rem] border transition-all duration-300 overflow-hidden",
                      stage.color === "bg-blue-500"
                        ? "bg-blue-50/30 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/20"
                        : stage.color === "bg-yellow-500"
                          ? "bg-amber-50/30 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/20"
                          : stage.color === "bg-purple-500"
                            ? "bg-purple-50/30 border-purple-100 dark:bg-purple-950/10 dark:border-purple-900/20"
                            : "bg-emerald-50/30 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/20",
                    )}
                  >
                    {/* Integrated Header */}
                    <div className="p-5 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2.5 rounded-2xl text-white shadow-lg shadow-current/20",
                            stage.color,
                          )}
                        >
                          {stage.id === "contacted" && (
                            <Phone className="w-4 h-4" />
                          )}
                          {stage.id === "negotiation" && (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          {stage.id === "quotation" && (
                            <Upload className="w-4 h-4" />
                          )}
                          {stage.id === "closed" && (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </div>
                        <h3 className="font-black text-base tracking-tight">
                          {stage.title}
                        </h3>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-white/80 dark:bg-stone-900/40 border border-current/10 shadow-sm">
                        <span className="text-xs font-black tabular-nums">
                          {totalCount}
                        </span>
                      </div>
                    </div>

                    {/* Scrollable Column Body */}
                    <div className="flex-1 overflow-hidden px-3 pb-3">
                      <DroppableStageColumn id={stage.id}>
                        {filteredDeals
                          .filter((d) => d.stage === stage.id)
                          .map((deal) => (
                            <DraggableDealCard key={deal.id} id={deal.id}>
                              <DealCard deal={deal} />
                            </DraggableDealCard>
                          ))}
                        {filteredDeals.filter((d) => d.stage === stage.id)
                          .length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-stone-200/50 dark:border-stone-800/50 rounded-[2rem] opacity-30 select-none">
                            <p className="text-xs font-bold uppercase tracking-widest text-center px-4">
                              ไม่มีดีลใน
                              <br />
                              {stage.title}
                            </p>
                          </div>
                        )}
                      </DroppableStageColumn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                รายละเอียดขั้นตอน:{" "}
                {stages.find((s) => s.id === currentStage)?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedDeal?.customerName}
              </DialogDescription>
            </DialogHeader>

            {/* ─── Pipeline Progress Stepper ─── */}
            <div className="py-2 overflow-x-auto scrollbar-hide">
              <div className="flex items-center min-w-[320px] px-2">
                {[
                  { id: "contacted", label: "ติดต่อแล้ว", step: 1 },
                  { id: "negotiation", label: "เจรจาต่อรอง", step: 2 },
                  { id: "quotation", label: "เสนอราคา", step: 3 },
                  { id: "closed", label: "ปิดการขาย", step: 4 },
                ].map((s, idx, arr) => {
                  const stageOrder = [
                    "contacted",
                    "negotiation",
                    "quotation",
                    "closed",
                  ];
                  const currentIdx = stageOrder.indexOf(currentStage);
                  const thisIdx = stageOrder.indexOf(s.id);
                  const isDone = thisIdx < currentIdx;
                  const isActive = thisIdx === currentIdx;

                  return (
                    <div
                      key={s.id}
                      className="flex items-center flex-1 min-w-0"
                    >
                      {/* Step circle + label */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className={cn(
                            "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold border-2 transition-all",
                            isDone
                              ? "bg-primary border-primary text-white"
                              : isActive
                                ? "bg-primary/20 border-primary text-primary"
                                : "bg-muted border-border text-muted-foreground",
                          )}
                        >
                          {isDone ? "✓" : s.step}
                        </div>
                        <span
                          className={cn(
                            "text-[9px] md:text-[10px] mt-1 font-medium text-center leading-tight",
                            isActive
                              ? "text-primary"
                              : isDone
                                ? "text-primary/70"
                                : "text-muted-foreground",
                          )}
                        >
                          {s.label}
                        </span>
                      </div>
                      {/* Connector line */}
                      {idx < arr.length - 1 && (
                        <div
                          className={cn(
                            "h-0.5 flex-1 mx-1 rounded transition-all",
                            thisIdx < currentIdx ? "bg-primary" : "bg-border",
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ชื่อลูกค้า</Label>
                  <Input
                    value={selectedDeal?.customerName || ""}
                    onChange={(e) => {
                      if (selectedDeal)
                        setSelectedDeal({
                          ...selectedDeal,
                          customerName: e.target.value,
                        });
                    }}
                  />
                </div>
                <div>
                  <Label>เบอร์โทร</Label>
                  <Input
                    value={selectedDeal?.phone || ""}
                    onChange={(e) => {
                      if (selectedDeal)
                        setSelectedDeal({
                          ...selectedDeal,
                          phone: e.target.value,
                        });
                    }}
                  />
                </div>
                <div>
                  <Label>ประเภทอสังหา</Label>
                  <Input
                    value={selectedDeal?.propertyType || ""}
                    onChange={(e) => {
                      if (selectedDeal)
                        setSelectedDeal({
                          ...selectedDeal,
                          propertyType: e.target.value,
                        });
                    }}
                  />
                </div>
                <div>
                  <Label>งบประมาณ</Label>
                  <Input
                    type="number"
                    value={selectedDeal?.budget || ""}
                    onChange={(e) => {
                      if (selectedDeal)
                        setSelectedDeal({
                          ...selectedDeal,
                          budget: Number(e.target.value),
                        });
                    }}
                  />
                </div>
              </div>

              {/* วันที่เริ่มต้น - สิ้นสุด */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>วันที่เริ่มต้น</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDeal?.startDate
                          ? format(selectedDeal.startDate, "PPP", {
                              locale: th,
                            })
                          : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDeal?.startDate}
                        onSelect={(date) => {
                          if (selectedDeal && date) {
                            setSelectedDeal({
                              ...selectedDeal,
                              startDate: date,
                            });
                          }
                        }}
                        locale={th}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>วันที่สิ้นสุด</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDeal?.endDate
                          ? format(selectedDeal.endDate, "PPP", { locale: th })
                          : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDeal?.endDate}
                        onSelect={(date) => {
                          if (selectedDeal && date) {
                            setSelectedDeal({ ...selectedDeal, endDate: date });
                          }
                        }}
                        locale={th}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Negotiation Stage */}
              {(currentStage === "negotiation" ||
                currentStage === "quotation" ||
                currentStage === "closed") && (
                <div>
                  <Label>พนักงานขายที่ดูแล</Label>
                  <Select
                    disabled={role === "SALE"}
                    value={selectedDeal?.assignedSales}
                    onValueChange={(value) => {
                      if (selectedDeal)
                        setSelectedDeal({
                          ...selectedDeal,
                          assignedSales: value,
                        });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกพนักงานขาย" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesList.length > 0 ? (
                        salesList.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>
                          ไม่พบข้อมูลเซลล์
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quotation Stage */}
              {(currentStage === "quotation" || currentStage === "closed") && (
                <div className="space-y-4 pt-2 border-t border-border/50">
                  {/* System Quotations (From DB) */}
                  {selectedDeal?.quotations &&
                    selectedDeal.quotations.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          ใบเสนอราคาในระบบ
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedDeal.quotations.map((q: any) => (
                            <div
                              key={q.id}
                              className="inline-flex items-center group/quote shadow-sm overflow-hidden rounded-xl border border-amber-200"
                            >
                              <button
                                onClick={(e) => handleViewQuotation(q.id, e)}
                                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300 px-3 py-2 flex items-center gap-2 transition-all"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {q.quotationNumber}
                              </button>
                              <button
                                onClick={(e) =>
                                  handleDeleteQuotation(
                                    q.id,
                                    q.quotationNumber,
                                    e,
                                  )
                                }
                                className="bg-amber-100 hover:bg-red-100 text-amber-700 hover:text-red-700 dark:bg-amber-950/50 p-2 border-l border-amber-200 transition-all"
                                title="ลบใบเสนอราคา"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div>
                    <Label>ราคาที่เสนอ (บาท)</Label>
                    <Input
                      type="number"
                      value={selectedDeal?.priceOffered || ""}
                      onChange={(e) => {
                        if (selectedDeal)
                          setSelectedDeal({
                            ...selectedDeal,
                            priceOffered: Number(e.target.value),
                          });
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>เงื่อนไขเพิ่มเติม (Terms)</Label>
                    <Textarea
                      value={selectedDeal?.terms || ""}
                      onChange={(e) => {
                        if (selectedDeal)
                          setSelectedDeal({
                            ...selectedDeal,
                            terms: e.target.value,
                          });
                      }}
                      placeholder="ระบุเงื่อนไขการชำระเงิน..."
                    />
                  </div>
                </div>
              )}

              {/* Closed Deal Stage */}
              {currentStage === "closed" && (
                <>
                  <div>
                    <Label>มูลค่าสุดท้าย (Final Value)</Label>
                    <Input
                      type="number"
                      value={selectedDeal?.finalValue || ""}
                      onChange={(e) => {
                        if (selectedDeal)
                          setSelectedDeal({
                            ...selectedDeal,
                            finalValue: Number(e.target.value),
                          });
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>สถานะดีล (Deal Status)</Label>
                    <Select
                      value={selectedDeal?.dealStatus}
                      onValueChange={(value: "won" | "lost") => {
                        if (selectedDeal)
                          setSelectedDeal({
                            ...selectedDeal,
                            dealStatus: value,
                          });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสถานะ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="won">ปิดการขายสำเร็จ</SelectItem>
                        <SelectItem value="lost">ไม่สำเร็จ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>วันที่ปิดการขาย (Closing Date)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDeal?.closingDate
                            ? format(selectedDeal.closingDate, "PPP", {
                                locale: th,
                              })
                            : "เลือกวันที่"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDeal?.closingDate}
                          onSelect={(date) => {
                            if (selectedDeal && date) {
                              setSelectedDeal({
                                ...selectedDeal,
                                closingDate: date,
                              });
                            }
                          }}
                          locale={th}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* แนบไฟล์ทั่วไป */}
              <div>
                <Label>แนบไฟล์</Label>
                <div className="space-y-2">
                  {selectedDeal?.files && selectedDeal.files.length > 0 && (
                    <div className="space-y-1">
                      {selectedDeal.files.map((f, idx) => {
                        const ext = f.split(".").pop()?.toLowerCase() || "";
                        const icon = [
                          "mp3",
                          "wav",
                          "m4a",
                          "aac",
                          "ogg",
                        ].includes(ext)
                          ? "🎧"
                          : ["mp4", "mov", "avi", "mkv"].includes(ext)
                            ? "🎥"
                            : ["jpg", "jpeg", "png", "gif"].includes(ext)
                              ? "🖼️"
                              : ["pdf"].includes(ext)
                                ? "📄"
                                : ["doc", "docx"].includes(ext)
                                  ? "📝"
                                  : ["xls", "xlsx"].includes(ext)
                                    ? "📊"
                                    : ["zip", "rar"].includes(ext)
                                      ? "🗂️"
                                      : "📁";
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-3 py-2 bg-muted rounded-md text-sm"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span>{icon}</span>
                              <span className="truncate text-foreground">
                                {f}
                              </span>
                            </span>
                            <button
                              onClick={() => {
                                if (selectedDeal) {
                                  setSelectedDeal({
                                    ...selectedDeal,
                                    files: selectedDeal.files?.filter(
                                      (_, i) => i !== idx,
                                    ),
                                  });
                                }
                              }}
                              className="ml-2 text-muted-foreground hover:text-destructive flex-shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.multiple = true;
                      input.accept =
                        ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.avi,.mkv,.txt,.zip,.rar";
                      input.onchange = (e) => {
                        const picked = Array.from(
                          (e.target as HTMLInputElement).files || [],
                        );
                        if (picked.length === 0) return;
                        // เก็บ File object จริงสำหรับ upload
                        setPendingFiles((prev) => [...prev, ...picked]);
                        // เก็บชื่อไว้แสดงใน UI
                        if (selectedDeal) {
                          setSelectedDeal({
                            ...selectedDeal,
                            quotationFiles: [
                              ...(selectedDeal.quotationFiles || []),
                              ...picked.map((f) => f.name),
                            ],
                          });
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    เลือกไฟล์
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveChanges}
                className="gradient-primary text-white"
              >
                บันทึกการเปลี่ยนแปลง
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ✅ Confirmation Dialog for Repeat Purchase - Premium Style */}
        <AlertDialog
          open={isRepeatConfirmOpen}
          onOpenChange={setIsRepeatConfirmOpen}
        >
          <AlertDialogContent className="rounded-2xl border-stone-200 dark:border-stone-800 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <RefreshCw className="w-5 h-5" />
                </div>
                ยืนยันเริ่มรอบการขายใหม่
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base pt-2">
                คุณแน่ใจหรือไม่ว่าต้องการเริ่มดีลใหม่ให้แก่ลูกค้า{" "}
                <span className="font-bold text-foreground">
                  "{repeatTargetDeal?.customerName}"
                </span>
                ?
                <br />
                <span className="text-sm text-muted-foreground mt-2 block bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  ⚠️ ลูกค้าคนนี้จะถูกปลดจากการดูแลของคุณ
                  และย้ายกลับไปเป็นลูกค้าใหม่ (NEW)
                  เพื่อให้แอดมินพิจารณามอบหมายงานให้อีกครั้ง
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="rounded-xl border-stone-200 hover:bg-stone-100">
                ยกเลิก
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRepeatPurchase}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              >
                ยืนยันเริ่มรอบใหม่
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndContext>
  );
};

export default StageBased;
