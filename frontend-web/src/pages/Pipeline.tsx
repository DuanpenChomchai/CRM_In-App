import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Upload, User, Phone, Home, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Deal {
  id: number;
  customerId: number;
  customerName: string;
  phone: string;
  propertyType: string;
  budget: number;
  stage: "contacted" | "negotiation" | "quotation" | "closed";
  startDate?: Date;
  endDate?: Date;
  assignedSales?: string;
  files?: string[];
  priceOffered?: number;
  terms?: string;
  quotationFile?: string;
  finalValue?: number;
  dealStatus?: "won" | "lost";
  closingDate?: Date;
}

const Pipeline = () => {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<Deal["stage"]>("contacted");

  // NEW: สถานะ & ข้อมูลของ View (อ่านอย่างเดียว)
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);

  const [deals] = useState<Deal[]>([
    {
      id: 1,
      customerId: 1,
      customerName: "คุณสมศักดิ์ เจริญสุข",
      phone: "081-234-5678",
      propertyType: "คอนโด",
      budget: 3500000,
      stage: "contacted",
      startDate: new Date(2024, 0, 15),
      endDate: new Date(2024, 0, 20),
    },
    {
      id: 2,
      customerId: 2,
      customerName: "คุณวิภา สวยงาม",
      phone: "082-345-6789",
      propertyType: "บ้านเดี่ยว",
      budget: 8500000,
      stage: "negotiation",
      startDate: new Date(2024, 0, 10),
      endDate: new Date(2024, 0, 25),
      assignedSales: "สมชาย ใจดี",
    },
  ]);

  const stages = [
    { id: "contacted", title: "Contacted", color: "bg-blue-500" },
    { id: "negotiation", title: "Negotiation", color: "bg-yellow-500" },
    { id: "quotation", title: "Quotation", color: "bg-purple-500" },
    { id: "closed", title: "Closed Deal", color: "bg-green-500" },
  ] as const;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);

  // เปิด dialog แก้ไข (คลิกที่การ์ด)
  const openEdit = (deal: Deal, stage: Deal["stage"]) => {
    setSelectedDeal(deal);
    setCurrentStage(stage);
    setIsEditOpen(true);
  };

  // NEW: เปิด dialog อ่านอย่างเดียว (คลิกที่ชื่อ)
  const openView = (deal: Deal) => {
    setViewDeal(deal);
    setIsViewOpen(true);
  };

  const DealCard = ({ deal }: { deal: Deal }) => (
    <div
      className="p-4 bg-card rounded-lg border shadow-sm hover:shadow-card transition-all cursor-pointer"
      onClick={() => openEdit(deal, deal.stage)}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          {/* ชื่อเป็นปุ่ม/ลิงก์ คลิกแล้วเปิด View; stopPropagation กันไม่ให้เปิด Edit */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openView(deal);
            }}
            className="text-primary underline underline-offset-4 hover:opacity-80"
            title="ดูรายละเอียด"
          >
            {deal.customerName}
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-3 h-3" />
          <span>{deal.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Home className="w-3 h-3 text-primary" />
          <span>{deal.propertyType}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <DollarSign className="w-3 h-3" />
          <span>{formatCurrency(deal.budget)}</span>
        </div>

        {deal.startDate && deal.endDate && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {format(deal.startDate, "dd MMM", { locale: th })} -{" "}
            {format(deal.endDate, "dd MMM yyyy", { locale: th })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Pipeline</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <Card key={stage.id} className="shadow-card">
            <CardHeader className={`${stage.color} text-white rounded-t-lg`}>
              <CardTitle className="flex items-center justify-between">
                <span>{stage.title}</span>
                <span className="text-sm font-normal">
                  {deals.filter((d) => d.stage === stage.id).length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 min-h-[400px]">
              {deals
                .filter((d) => d.stage === stage.id)
                .map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ================= VIEW DIALOG (อ่านอย่างเดียว) ================= */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              รายละเอียด {viewDeal ? stages.find(s => s.id === viewDeal.stage)?.title : ""}
            </DialogTitle>
            <DialogDescription>{viewDeal?.customerName}</DialogDescription>
          </DialogHeader>

          {/* ฟอร์มอ่านอย่างเดียวหน้าตาแบบรูปที่ 2 */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <Label>ชื่อลูกค้า</Label>
              <Input value={viewDeal?.customerName ?? ""} disabled />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input value={viewDeal?.phone ?? ""} disabled />
            </div>
            <div>
              <Label>ประเภทอสังหา</Label>
              <Input value={viewDeal?.propertyType ?? ""} disabled />
            </div>
            <div>
              <Label>งบประมาณ</Label>
              <Input
                value={viewDeal ? formatCurrency(viewDeal.budget) : ""}
                disabled
              />
            </div>
            <div>
              <Label>วันที่เริ่มต้น</Label>
              <div className="flex items-center">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {viewDeal?.startDate
                    ? format(viewDeal.startDate, "d MMMM yyyy", { locale: th })
                    : "-"}
                </Button>
              </div>
            </div>
            <div>
              <Label>วันที่สิ้นสุด</Label>
              <div className="flex items-center">
                <Button variant="outline" className="w-full justify-start" disabled>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {viewDeal?.endDate
                    ? format(viewDeal.endDate, "d MMMM yyyy", { locale: th })
                    : "-"}
                </Button>
              </div>
            </div>

            {/* แสดงข้อมูลเพิ่มเติมตาม Stage ให้ดูอย่างเดียว */}
            {viewDeal?.stage === "negotiation" && (
              <div className="col-span-2">
                <Label>พนักงานขายที่ดูแล</Label>
                <Input value={viewDeal.assignedSales ?? "-"} disabled />
              </div>
            )}

            {viewDeal?.stage !== "contacted" && (
              <>
                <div className="col-span-2">
                  <Label>ไฟล์แนบ</Label>
                  <Button variant="outline" className="w-full" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    อัพโหลดไฟล์
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= EDIT DIALOG (แก้ไข – คลิกที่การ์ด) ================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              แก้ไข {stages.find((s) => s.id === currentStage)?.title}
            </DialogTitle>
            <DialogDescription>{selectedDeal?.customerName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* ข้อมูลพื้นฐาน */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ชื่อลูกค้า</Label>
                <Input value={selectedDeal?.customerName ?? ""} disabled />
              </div>
              <div>
                <Label>เบอร์โทร</Label>
                <Input value={selectedDeal?.phone ?? ""} disabled />
              </div>
              <div>
                <Label>ประเภทอสังหา</Label>
                <Input value={selectedDeal?.propertyType ?? ""} disabled />
              </div>
              <div>
                <Label>งบประมาณ</Label>
                <Input
                  value={selectedDeal ? formatCurrency(selectedDeal.budget) : ""}
                  disabled
                />
              </div>
            </div>

            {/* วันที่เริ่มต้น/สิ้นสุด */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>วันที่เริ่มต้น</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDeal?.startDate
                        ? format(selectedDeal.startDate, "PPP", { locale: th })
                        : "เลือกวันที่"}
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>วันที่สิ้นสุด</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start")}>
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* ฟิลด์เฉพาะสเตจ */}
            {(currentStage === "negotiation" ||
              currentStage === "quotation" ||
              currentStage === "closed") && (
              <div>
                <Label>พนักงานขายที่ดูแล</Label>
                <Select
                  value={selectedDeal?.assignedSales}
                  onValueChange={(value) => {
                    if (selectedDeal) setSelectedDeal({ ...selectedDeal, assignedSales: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกพนักงานขาย" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="สมชาย ใจดี">สมชาย ใจดี</SelectItem>
                    <SelectItem value="สมหญิง รักงาน">สมหญิง รักงาน</SelectItem>
                    <SelectItem value="ประยุทธ์ ขยัน">ประยุทธ์ ขยัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(currentStage === "quotation" || currentStage === "closed") && (
              <>
                <div>
                  <Label>ราคาที่เสนอ (Price Offered)</Label>
                  <Input
                    type="number"
                    value={selectedDeal?.priceOffered ?? ""}
                    onChange={(e) =>
                      selectedDeal &&
                      setSelectedDeal({ ...selectedDeal, priceOffered: Number(e.target.value) })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>เงื่อนไข (Terms)</Label>
                  <Textarea
                    value={selectedDeal?.terms ?? ""}
                    onChange={(e) =>
                      selectedDeal && setSelectedDeal({ ...selectedDeal, terms: e.target.value })
                    }
                    placeholder="ระบุเงื่อนไขการชำระเงิน..."
                  />
                </div>
              </>
            )}

            {currentStage === "closed" && (
              <>
                <div>
                  <Label>มูลค่าสุดท้าย (Final Value)</Label>
                  <Input
                    type="number"
                    value={selectedDeal?.finalValue ?? ""}
                    onChange={(e) =>
                      selectedDeal &&
                      setSelectedDeal({ ...selectedDeal, finalValue: Number(e.target.value) })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>สถานะดีล (Deal Status)</Label>
                  <Select
                    value={selectedDeal?.dealStatus}
                    onValueChange={(value: "won" | "lost") => {
                      if (selectedDeal) setSelectedDeal({ ...selectedDeal, dealStatus: value });
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
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDeal?.closingDate
                          ? format(selectedDeal.closingDate, "PPP", { locale: th })
                          : "เลือกวันที่"}
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div>
              <Label>แนบไฟล์</Label>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                อัพโหลดไฟล์
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              className="gradient-primary text-white hover:opacity-90"
              onClick={() => {
                toast.success("บันทึกข้อมูลสำเร็จ");
                setIsEditOpen(false);
              }}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pipeline;
