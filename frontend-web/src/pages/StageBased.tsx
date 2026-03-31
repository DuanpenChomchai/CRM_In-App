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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Upload, User, Phone, Home, DollarSign } from "lucide-react";
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
  id: number;
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
  finalValue?: number;
  dealStatus?: "won" | "lost";
  closingDate?: Date;
}

type ApiStage = "CONTACTED" | "NEGOTIATING" | "QUOTATION" | "CLOSED";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

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
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<Deal["stage"]>("contacted");
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [deals, setDeals] = useState<Deal[]>([]);
  const [salesList, setSalesList] = useState<{ id: number; name: string }[]>([]);

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
            id: c.id,
            customerId: c.id,
            customerName: c.name || "-",
            phone: c.tel ?? c.tol ?? "-",
            propertyType: c.interestedProperty?.type ?? c.productType ?? "-",
            budget: Number(c.priceBudget || 0),
            stage: apiToUi(apiStage),
            assignedSales: c.sale?.name,
            status: latestLog?.status ?? latestNego?.status ?? undefined,
            startDate: c.updatedAt ? new Date(c.updatedAt) : undefined,
            quotationNumbers: (c.quotations || []).map((q: any) => q.quotationNumber).filter(Boolean),
            priceOffered: latestQ ? Number(latestQ.totalAmount || 0) : undefined,
            terms: latestQ?.terms,
            finalValue: latestClosed?.finalValue ? Number(latestClosed.finalValue) : undefined,
            closingDate: latestClosed?.closingDate ? new Date(latestClosed.closingDate) : undefined,
            dealStatus: rawResult === "WON" ? "won" : rawResult === "LOST" ? "lost" : undefined,
          });
        }
      };

      pushCol("CONTACTED", data.columns.CONTACTED || []);
      pushCol("NEGOTIATING", data.columns.NEGOTIATING || []);
      pushCol("QUOTATION", data.columns.QUOTATION || []);
      pushCol("CLOSED", data.columns.CLOSED || []);

      // โหลด quotationFiles จาก localStorage
      const withFiles = mapped.map(d => {
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

  useEffect(() => { fetchBoard(); }, []);

  // ─── fetch sales staff ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/users/sales-list`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setSalesList(d.data || []))
      .catch(() => { });
  }, []);


  const stages = [
    { id: "contacted", title: "ติดต่อแล้ว", color: "bg-blue-500" },
    { id: "negotiation", title: "เจรจาต่อรอง", color: "bg-yellow-500" },
    { id: "quotation", title: "เสนอราคา", color: "bg-purple-500" },
    { id: "closed", title: "ปิดการขายสำเร็จ", color: "bg-green-500" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleOpenDialog = (deal: Deal, stage: Deal["stage"]) => {

    setSelectedDeal({ ...deal });
    setCurrentStage(stage);
    setIsDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === Number(event.active.id));
    setActiveDeal(deal || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) { setActiveDeal(null); return; }

    const dealId = Number(active.id);
    const newStage = over.id as Deal["stage"];

    if (!["contacted", "negotiation", "quotation", "closed"].includes(newStage)) {
      setActiveDeal(null);
      return;
    }

    const moving = deals.find(d => d.id === dealId);
    if (!moving || moving.stage === newStage) { setActiveDeal(null); return; }

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
    setDeals(p => p.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    toast.success(`ย้ายดีลไปยัง ${stages.find(s => s.id === newStage)?.title} เรียบร้อย`);
    setActiveDeal(null);

    try {
      const res = await fetch(`${API_BASE}/api/pipeline/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ customerId: moving.customerId, toStatus: uiToApi(newStage) }),
      });
      if (!res.ok) throw new Error("Move failed");
      await fetchBoard();
    } catch (e: any) {
      toast.error("ย้าย Stage ไม่สำเร็จ");
      setDeals(prev);
    }
  };


  const handleSaveChanges = async () => {
    if (!selectedDeal) return;

    // บันทึก quotationFiles ลง localStorage
    if (selectedDeal.quotationFiles) {
      localStorage.setItem(`quotationFiles_${selectedDeal.customerId}`, JSON.stringify(selectedDeal.quotationFiles));
    } else {
      localStorage.removeItem(`quotationFiles_${selectedDeal.customerId}`);
    }

    // อัปเดต local state ทันที
    setDeals(p => p.map(d => d.id === selectedDeal.id ? selectedDeal : d));

    try {
      // 1. อัปเดตข้อมูลลูกค้า (ชื่อ, เบอร์, อสังหา, งบประมาณ, เซลล์)
      const saleObj = salesList.find(s => s.name === selectedDeal.assignedSales);
      await fetch(`${API_BASE}/api/customers/${selectedDeal.customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: selectedDeal.customerName,
          phone: selectedDeal.phone,
          productType: selectedDeal.propertyType,
          budget: selectedDeal.budget,
          saleId: saleObj ? saleObj.id : undefined,
        }),
      });

      // 2. sync stage กับ backend พร้อมรายละเอียด (ปิดดีล, etc.)
      const movePayload: any = {
        customerId: selectedDeal.customerId,
        toStatus: uiToApi(currentStage),
      };

      // เพิ่ม details ตาม stage
      if (currentStage === "closed") {
        movePayload.closedResult = selectedDeal.dealStatus === "won" ? "WON" : "LOST";
        movePayload.finalValue = selectedDeal.finalValue;
        // remark: Note is not saved properly in original UI, using fallback or empty
      }

      const res = await fetch(`${API_BASE}/api/pipeline/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(movePayload),
      });
      
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");

      toast.success("บันทึกข้อมูลสำเร็จ");
      fetchBoard(); // Reload board to get exact dates and values
    } catch (e: any) {
      console.error(e);
      toast.error("บันทึกไม่สำเร็จ");
    }

    setIsDialogOpen(false);
  };


  const DealCard = ({ deal }: { deal: Deal }) => {
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    // ✅ แปลง enum ภาษาอังกฤษจาก backend เป็นภาษาไทย
    const statusToThai = (status: string | undefined, stage: string): string => {
      const map: Record<string, string> = {
        // Contacted
        "FOLLOWING_UP": "กำลังติดตาม",
        "WAITING_REPLY": "รอลูกค้าตอบกลับ",
        "APPOINTED": "นัดพบแล้ว",
        "NOT_INTERESTED": "ลูกค้าไม่สนใจ",
        // Negotiation
        "NEGOTIATING": "อยู่ระหว่างเจรจา",
        "WAITING_CONFIRM": "รอลูกค้ายืนยัน",
        "COUNTER_OFFER": "ลูกค้าต่อราคา",
        "PAUSED": "ชะลอการเจรจา",
        // Closed
        "WON": "ปิดการขายสำเร็จ",
        "LOST": "ปิดการขายไม่สำเร็จ",
        "CLOSED": "ปิดการขายแล้ว",
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
      contacted: ["กำลังติดตาม", "รอลูกค้าตอบกลับ", "นัดพบแล้ว", "ลูกค้าไม่สนใจ"],
      negotiation: ["อยู่ระหว่างเจรจา", "รอลูกค้ายืนยัน", "ลูกค้าต่อราคา", "ชะลอการเจรจา"],
      quotation: ["ส่งใบเสนอราคาแล้ว", "ลูกค้ากำลังพิจารณา", "ลูกค้าขอปรับราคา", "รอผู้จัดการอนุมัติ"],
      closed: ["ปิดการขายสำเร็จ", "ปิดการขายไม่สำเร็จ"]
    };

    const handleStatusChange = (newStatus: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeals(deals.map(d =>
        d.id === deal.id ? { ...d, status: newStatus } : d
      ));
      setIsStatusOpen(false);
      toast.success(`เปลี่ยนสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    };

    const getStatusBadge = () => {
      const currentStatus = statusToThai(deal.status, deal.stage);

      const getStatusColor = () => {
        if (currentStatus.includes("สำเร็จ") || currentStatus.includes("นัดหมาย")) {
          return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50";
        }
        if (currentStatus.includes("รอ") || currentStatus.includes("พิจารณา")) {
          return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50";
        }
        if (currentStatus.includes("ไม่สำเร็จ") || currentStatus.includes("ยกเลิก") || currentStatus.includes("ไม่ได้")) {
          return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50";
        }
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50";
      };

      return (
        <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer",
              getStatusColor()
            )}>
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
                    deal.status === status && "bg-accent text-accent-foreground font-medium"
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
        className="group p-4 bg-gradient-to-br from-card to-card/80 rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer backdrop-blur-sm"
        onClick={() => handleOpenDialog(deal, deal.stage)}
      >
        <div className="space-y-3">
          {/* Header with status badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {deal.customerName}
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
              <span className="text-muted-foreground font-normal">งบประมาณ:</span>
              <span>{deal.budget > 0 ? formatCurrency(deal.budget) : "-"}</span>
            </div>
          </div>

          {/* Start Date - Common to Dialog */}
          {deal.startDate && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              วันที่เริ่มต้น: {format(deal.startDate, "dd MMM yyyy", { locale: th })}
            </div>
          )}

          {/* Assigned Sales - Only Negotiation+ (Match Dialog visibility) */}
          {(deal.stage === "negotiation" || deal.stage === "quotation" || deal.stage === "closed") && deal.assignedSales && (
            <div className="text-xs">
              <span className="text-muted-foreground">พนักงานขายที่ดูแล:</span>{" "}
              <span className="font-medium text-foreground">{deal.assignedSales}</span>
            </div>
          )}

          {/* Quotation Stage Details (Match Dialog visibility) */}
          {deal.stage === "quotation" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {deal.priceOffered ? (
                <div className="text-xs">
                  <span className="text-muted-foreground">ราคาที่เสนอ:</span>{" "}
                  <span className="font-semibold text-primary">{formatCurrency(deal.priceOffered)}</span>
                </div>
              ) : null}

              {deal.quotationFiles && deal.quotationFiles.length > 0 && (
                <div className="space-y-1">
                  {deal.quotationFiles.map((qf, i) => (
                    <div key={i} className="text-[10px] text-primary bg-primary/5 px-2 py-1 rounded-md inline-flex items-center gap-1 mr-1">
                      <Upload className="w-3 h-3" />
                      {qf}
                    </div>
                  ))}
                </div>
              )}

              {deal.terms && (
                <div className="text-xs">
                  <span className="text-muted-foreground">เงื่อนไขเพิ่มเติม:</span>{" "}
                  <span className="text-foreground line-clamp-1">{deal.terms}</span>
                </div>
              )}
              {/* {deal.files && deal.files.length > 0 && (
                <div className="text-[10px] text-primary bg-primary/5 px-2 py-1 rounded-md inline-flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  แนบไฟล์แล้ว {deal.files.length} รายการ
                </div>
              )} */}
            </div>
          )}

          {/* Closed Deal Stage Details (Match Dialog visibility) */}
          {deal.stage === "closed" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {deal.finalValue && (
                <div className="text-xs">
                  <span className="text-muted-foreground">มูลค่าสุดท้าย:</span>{" "}
                  <span className="font-bold text-primary">{formatCurrency(deal.finalValue)}</span>
                </div>
              )}
              {deal.dealStatus && (
                <div className="text-xs">
                  <span className="text-muted-foreground">สถานะดีล:</span>{" "}
                  <span className={cn(
                    "font-semibold",
                    deal.dealStatus === "won" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {deal.dealStatus === "won" ? "สำเร็จ" : "ไม่สำเร็จ"}
                  </span>
                </div>
              )}
              {deal.closingDate && (
                <div className="text-xs">
                  <span className="text-muted-foreground">วันที่ปิดการขาย:</span>{" "}
                  <span className="font-medium text-foreground">{format(deal.closingDate, "dd MMM yyyy", { locale: th })}</span>
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
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold">Pipeline</h1>

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center">กำลังโหลด...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map((stage) => (
              <Card key={stage.id} className="shadow-card">
                <CardHeader className={`${stage.color} text-white rounded-t-lg`}>
                  <CardTitle className="flex items-center justify-between">
                    <span>{stage.title}</span>
                    <span className="text-sm font-normal">
                      {deals.filter((d) => d.stage === stage.id).length} ดีล
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <DroppableStageColumn id={stage.id}>
                    {deals
                      .filter((d) => d.stage === stage.id)
                      .map((deal) => (
                        <DraggableDealCard key={deal.id} id={deal.id}>
                          <DealCard deal={deal} />
                        </DraggableDealCard>
                      ))}
                  </DroppableStageColumn>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DragOverlay>
          {activeDeal ? <DealCard deal={activeDeal} /> : null}
        </DragOverlay>


        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>รายละเอียดขั้นตอน: {stages.find(s => s.id === currentStage)?.title}</DialogTitle>
              <DialogDescription>
                {selectedDeal?.customerName}
              </DialogDescription>
            </DialogHeader>

            {/* ─── Pipeline Progress Stepper ─── */}
            <div className="py-2">
              <div className="flex items-center w-full">
                {[
                  { id: "contacted", label: "ติดต่อแล้ว", step: 1 },
                  { id: "negotiation", label: "เจรจาต่อรอง", step: 2 },
                  { id: "quotation", label: "เสนอราคา", step: 3 },
                  { id: "closed", label: "ปิดการขาย", step: 4 },
                ].map((s, idx, arr) => {
                  const stageOrder = ["contacted", "negotiation", "quotation", "closed"];
                  const currentIdx = stageOrder.indexOf(currentStage);
                  const thisIdx = stageOrder.indexOf(s.id);
                  const isDone = thisIdx < currentIdx;
                  const isActive = thisIdx === currentIdx;

                  return (
                    <div key={s.id} className="flex items-center flex-1 min-w-0">
                      {/* Step circle + label */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                          isDone ? "bg-primary border-primary text-white" :
                            isActive ? "bg-primary/20 border-primary text-primary" :
                              "bg-muted border-border text-muted-foreground"
                        )}>
                          {isDone ? "✓" : s.step}
                        </div>
                        <span className={cn(
                          "text-[10px] mt-1 font-medium text-center leading-tight",
                          isActive ? "text-primary" : isDone ? "text-primary/70" : "text-muted-foreground"
                        )}>
                          {s.label}
                        </span>
                      </div>
                      {/* Connector line */}
                      {idx < arr.length - 1 && (
                        <div className={cn(
                          "h-0.5 flex-1 mx-1 rounded transition-all",
                          thisIdx < currentIdx ? "bg-primary" : "bg-border"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 py-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ชื่อลูกค้า</Label>
                  <Input
                    value={selectedDeal?.customerName || ""}
                    onChange={(e) => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, customerName: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>เบอร์โทร</Label>
                  <Input
                    value={selectedDeal?.phone || ""}
                    onChange={(e) => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, phone: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>ประเภทอสังหา</Label>
                  <Input
                    value={selectedDeal?.propertyType || ""}
                    onChange={(e) => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, propertyType: e.target.value });
                    }}
                  />
                </div>
                <div>
                  <Label>งบประมาณ</Label>
                  <Input
                    type="number"
                    value={selectedDeal?.budget || ""}
                    onChange={(e) => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, budget: Number(e.target.value) });
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
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDeal?.startDate ? format(selectedDeal.startDate, "PPP", { locale: th }) : "เลือกวันที่"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDeal?.startDate}
                        onSelect={(date) => {
                          if (selectedDeal && date) {
                            setSelectedDeal({ ...selectedDeal, startDate: date });
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
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDeal?.endDate ? format(selectedDeal.endDate, "PPP", { locale: th }) : "เลือกวันที่"}
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
              {(currentStage === "negotiation" || currentStage === "quotation" || currentStage === "closed") && (
                <div>
                  <Label>พนักงานขายที่ดูแล</Label>
                  <Select 
                    disabled={role === "SALE"}
                    value={selectedDeal?.assignedSales} 
                    onValueChange={(value) => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, assignedSales: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกพนักงานขาย" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesList.length > 0 ? (
                        salesList.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>ไม่พบข้อมูลเซลล์</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}


              {/* Quotation Stage */}
              {(currentStage === "quotation" || currentStage === "closed") && (
                <>

                  <div>
                    <Label>แนบไฟล์ใบเสนอราคา</Label>
                    <div className="space-y-2">
                      {selectedDeal?.quotationFiles && selectedDeal.quotationFiles.length > 0 && (
                        <div className="space-y-1">
                          {selectedDeal.quotationFiles.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-muted rounded-md text-sm">
                              <span className="truncate text-foreground">{f}</span>
                              <button
                                onClick={() => {
                                  if (selectedDeal) {
                                    setSelectedDeal({ ...selectedDeal, quotationFiles: selectedDeal.quotationFiles?.filter((_, i) => i !== idx) });
                                  }
                                }}
                                className="ml-2 text-muted-foreground hover:text-destructive"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.multiple = true;
                          input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.avi,.mkv,.txt,.zip,.rar";
                          input.onchange = (e) => {
                            const picked = Array.from((e.target as HTMLInputElement).files || []);
                            if (selectedDeal) {
                              setSelectedDeal({
                                ...selectedDeal,
                                quotationFiles: [...(selectedDeal.quotationFiles || []), ...picked.map(f => f.name)],
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
                  <div>
                    <Label>ราคาที่เสนอ (บาท)</Label>
                    <Input
                      type="number"
                      value={selectedDeal?.priceOffered || ""}
                      onChange={(e) => {
                        if (selectedDeal) setSelectedDeal({ ...selectedDeal, priceOffered: Number(e.target.value) });
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>เงื่อนไขเพิ่มเติม (Terms)</Label>
                    <Textarea
                      value={selectedDeal?.terms || ""}
                      onChange={(e) => {
                        if (selectedDeal) setSelectedDeal({ ...selectedDeal, terms: e.target.value });
                      }}
                      placeholder="ระบุเงื่อนไขการชำระเงิน..."
                    />
                  </div>
                </>
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
                        if (selectedDeal) setSelectedDeal({ ...selectedDeal, finalValue: Number(e.target.value) });
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>สถานะดีล (Deal Status)</Label>
                    <Select value={selectedDeal?.dealStatus} onValueChange={(value: "won" | "lost") => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, dealStatus: value });
                    }}>
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
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDeal?.closingDate ? format(selectedDeal.closingDate, "PPP", { locale: th }) : "เลือกวันที่"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDeal?.closingDate}
                          onSelect={(date) => {
                            if (selectedDeal && date) {
                              setSelectedDeal({ ...selectedDeal, closingDate: date });
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
                        const icon =
                          ["mp3", "wav", "m4a", "aac", "ogg"].includes(ext) ? "🎧" :
                            ["mp4", "mov", "avi", "mkv"].includes(ext) ? "🎥" :
                              ["jpg", "jpeg", "png", "gif"].includes(ext) ? "🖼️" :
                                ["pdf"].includes(ext) ? "📄" :
                                  ["doc", "docx"].includes(ext) ? "📝" :
                                    ["xls", "xlsx"].includes(ext) ? "📊" :
                                      ["zip", "rar"].includes(ext) ? "🗂️" : "📁";
                        return (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 bg-muted rounded-md text-sm">
                            <span className="flex items-center gap-2 truncate">
                              <span>{icon}</span>
                              <span className="truncate text-foreground">{f}</span>
                            </span>
                            <button
                              onClick={() => {
                                if (selectedDeal) {
                                  setSelectedDeal({ ...selectedDeal, files: selectedDeal.files?.filter((_, i) => i !== idx) });
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
                      input.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.avi,.mkv,.txt,.zip,.rar";
                      input.onchange = (e) => {
                        const picked = Array.from((e.target as HTMLInputElement).files || []);
                        if (selectedDeal) {
                          setSelectedDeal({
                            ...selectedDeal,
                            files: [...(selectedDeal.files || []), ...picked.map(f => f.name)],
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
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleSaveChanges} className="gradient-primary text-white">บันทึกการเปลี่ยนแปลง</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
};

export default StageBased;