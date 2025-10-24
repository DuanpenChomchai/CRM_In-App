import { useState } from "react";
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
  priceOffered?: number;
  terms?: string;
  quotationNumbers?: string[];
  finalValue?: number;
  dealStatus?: "won" | "lost";
  closingDate?: Date;
}

const Pipeline = () => {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<Deal["stage"]>("contacted");

  const [deals, setDeals] = useState<Deal[]>([
    {
      id: 1,
      customerId: 1,
      customerName: "คุณสมศักดิ์ เจริญสุข",
      phone: "081-234-5678",
      propertyType: "คอนโด",
      budget: 3500000,
      stage: "contacted",
      status: "กำลังติดต่อ",
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
      status: "เจรจาต่อรอง",
      startDate: new Date(2024, 0, 10),
      endDate: new Date(2024, 0, 25),
      assignedSales: "สมชาย ใจดี",
    },
    {
      id: 3,
      customerId: 3,
      customerName: "Naruemon",
      phone: "089-xxx-xxxx",
      propertyType: "House",
      budget: 350000000,
      stage: "quotation",
      startDate: new Date(2025, 8, 17),
      assignedSales: "Duanpen",
      priceOffered: 3450000,
      terms: "15 y",
      quotationNumbers: ["KT-2025-045", "KT-2025-046"],
    },
    {
      id: 4,
      customerId: 4,
      customerName: "Naruemon",
      phone: "089-xxx-xxxx",
      propertyType: "House",
      budget: 350000000,
      stage: "closed",
      startDate: new Date(2025, 8, 18),
      assignedSales: "Duanpen",
      priceOffered: 3450000,
      terms: "15 y",
      quotationNumbers: ["KT-2025-045"],
      finalValue: 3400000,
      dealStatus: "lost",
      closingDate: new Date(2025, 8, 20),
    },
  ]);

  const stages = [
    { id: "contacted", title: "Contacted", color: "bg-blue-500" },
    { id: "negotiation", title: "Negotiation", color: "bg-yellow-500" },
    { id: "quotation", title: "Quotation", color: "bg-purple-500" },
    { id: "closed", title: "Closed Deal", color: "bg-green-500" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleOpenDialog = (deal: Deal, stage: Deal["stage"]) => {
    setSelectedDeal(deal);
    setCurrentStage(stage);
    setIsDialogOpen(true);
  };

  const DealCard = ({ deal }: { deal: Deal }) => {
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    const statusOptions = {
      contacted: ["กำลังติดต่อ", "รอการตอบกลับ", "นัดหมายแล้ว", "ติดต่อไม่ได้"],
      negotiation: ["เจรจาต่อรอง", "รอการตัดสินใจ", "กำลังพิจารณา", "เตรียมส่งใบเสนอราคา"],
      quotation: ["รอการตอบกลับ", "กำลังพิจารณาใบเสนอราคา", "ต้องการปรับราคา", "รออนุมัติ"],
      closed: ["ปิดการขายสำเร็จ", "ไม่สำเร็จ", "ยกเลิก", "รอเซ็นสัญญา"]
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
      const currentStatus = deal.status || (
        deal.stage === "contacted" ? "กำลังติดต่อ" :
        deal.stage === "negotiation" ? "เจรจาต่อรอง" :
        deal.stage === "quotation" ? "รอการตอบกลับ" :
        deal.stage === "closed" && deal.dealStatus === "won" ? "ปิดการขายสำเร็จ" :
        "ไม่สำเร็จ"
      );

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
              <div>
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Name: {deal.customerName}
                </div>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Contact & Property Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>Contact: {deal.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Home className="w-3.5 h-3.5 text-primary" />
              <span>Property: {deal.propertyType}</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Budget: {formatCurrency(deal.budget)}</span>
            </div>
          </div>

          {/* Date and Sales Info */}
          {deal.startDate && (
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              State date: {format(deal.startDate, "dd MMM yyyy", { locale: th })}
            </div>
          )}
          {deal.assignedSales && (
            <div className="text-xs">
              <span className="text-muted-foreground">Sale:</span>{" "}
              <span className="font-medium text-foreground">{deal.assignedSales}</span>
            </div>
          )}

          {/* Quotation Stage Details */}
          {deal.stage === "quotation" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {deal.quotationNumbers && deal.quotationNumbers.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground">เลขใบเสนอราคา:</span>{" "}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {deal.quotationNumbers.map((num, idx) => (
                      <span key={idx} className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {deal.priceOffered && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Price Offered:</span>{" "}
                  <span className="font-semibold text-primary">{formatCurrency(deal.priceOffered)}</span>
                </div>
              )}
              {deal.terms && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Terms:</span>{" "}
                  <span className="font-medium text-foreground">{deal.terms}</span>
                </div>
              )}
            </div>
          )}

          {/* Closed Deal Stage Details */}
          {deal.stage === "closed" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {deal.quotationNumbers && deal.quotationNumbers.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground">เลขใบเสนอราคา:</span>{" "}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {deal.quotationNumbers.map((num, idx) => (
                      <span key={idx} className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        {num}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {deal.priceOffered && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Price Offered:</span>{" "}
                  <span className="font-semibold">{formatCurrency(deal.priceOffered)}</span>
                </div>
              )}
              {deal.terms && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Terms:</span>{" "}
                  <span className="font-medium text-foreground">{deal.terms}</span>
                </div>
              )}
              {deal.finalValue && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Final Value:</span>{" "}
                  <span className="font-bold text-primary">{formatCurrency(deal.finalValue)}</span>
                </div>
              )}
              {deal.dealStatus && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Deal Status:</span>{" "}
                  <span className={cn(
                    "font-semibold",
                    deal.dealStatus === "won" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {deal.dealStatus === "won" ? "Won" : "Lost"}
                  </span>
                </div>
              )}
              {deal.closingDate && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Closing Date:</span>{" "}
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
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold">Pipeline</h1>

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

      {/* Dialog สำหรับแก้ไขข้อมูล */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียด {stages.find(s => s.id === currentStage)?.title}</DialogTitle>
            <DialogDescription>
              {selectedDeal?.customerName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* ข้อมูลพื้นฐาน */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ชื่อลูกค้า</Label>
                <Input value={selectedDeal?.customerName} disabled />
              </div>
              <div>
                <Label>เบอร์โทร</Label>
                <Input value={selectedDeal?.phone} disabled />
              </div>
              <div>
                <Label>ประเภทอสังหา</Label>
                <Input value={selectedDeal?.propertyType} disabled />
              </div>
              <div>
                <Label>งบประมาณ</Label>
                <Input value={selectedDeal ? formatCurrency(selectedDeal.budget) : ""} disabled />
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
                <Select value={selectedDeal?.assignedSales} onValueChange={(value) => {
                  if (selectedDeal) setSelectedDeal({ ...selectedDeal, assignedSales: value });
                }}>
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
             {/* Quotation Stage */}
            {(currentStage === "quotation" || currentStage === "closed") && (
              <>
                <div>
                  <Label>เลขใบเสนอราคา (Quotation Numbers)</Label>
                  <div className="space-y-2">
                    {selectedDeal?.quotationNumbers?.map((num, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={num}
                          onChange={(e) => {
                            if (selectedDeal) {
                              const newNumbers = [...(selectedDeal.quotationNumbers || [])];
                              newNumbers[idx] = e.target.value;
                              setSelectedDeal({ ...selectedDeal, quotationNumbers: newNumbers });
                            }
                          }}
                          placeholder="เช่น KT-2025-045"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (selectedDeal) {
                              const newNumbers = selectedDeal.quotationNumbers?.filter((_, i) => i !== idx);
                              setSelectedDeal({ ...selectedDeal, quotationNumbers: newNumbers });
                            }
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedDeal) {
                          setSelectedDeal({
                            ...selectedDeal,
                            quotationNumbers: [...(selectedDeal.quotationNumbers || []), ""]
                          });
                        }
                      }}
                      className="w-full"
                    >
                      + เพิ่มเลขใบเสนอราคา
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>ราคาที่เสนอ (Price Offered)</Label>
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
                  <Label>เงื่อนไข (Terms)</Label>
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

            {/* แนบไฟล์ */}
            <div>
              <Label>แนบไฟล์</Label>
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                อัพโหลดไฟล์
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              className="gradient-primary text-white hover:opacity-90"
              onClick={() => {
                toast.success("บันทึกข้อมูลสำเร็จ");
                setIsDialogOpen(false);
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