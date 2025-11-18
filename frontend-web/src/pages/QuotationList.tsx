import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Search, Eye, Edit, Download, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Quotation {
  id: number;
  quotationNumber: string;
  customerName: string;
  date: Date;
  total: number;
  status: "draft" | "sent" | "approved" | "rejected";
  items: number;
}

const QuotationList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // --- [START] การเปลี่ยนแปลง ---
  const [quotations] = useState<Quotation[]>([
    {
      id: 1,
      quotationNumber: "QUE-20250115-001", // แก้ไขจาก QT-2025-001
      customerName: "คุณสมศักดิ์ เจริญสุข",
      date: new Date(2025, 0, 15),
      total: 3500000,
      status: "sent",
      items: 1,
    },
    {
      id: 2,
      quotationNumber: "QUE-20250118-002", // แก้ไขจาก QT-2025-002
      customerName: "คุณวิภา สวยงาม",
      date: new Date(2025, 0, 18),
      total: 8500000,
      status: "approved",
      items: 2,
    },
    {
      id: 3,
      quotationNumber: "QUE-20250120-003", // แก้ไขจาก QT-2025-003
      customerName: "คุณประเสริฐ มั่งคั่ง",
      date: new Date(2025, 0, 20),
      total: 4200000,
      status: "draft",
      items: 1,
    },
  ]);
  // --- [END] การเปลี่ยนแปลง ---

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (status: Quotation["status"]) => {
    const statusConfig = {
      draft: { label: "แบบร่าง", className: "bg-gray-500" },
      sent: { label: "ส่งแล้ว", className: "bg-blue-500" },
      approved: { label: "อนุมัติแล้ว", className: "bg-green-500" },
      rejected: { label: "ปฏิเสธ", className: "bg-red-500" },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredQuotations = quotations.filter(
    (q) =>
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    navigate("/quotation");
  };

  const handleEdit = (id: number) => {
    navigate(`/quotation?edit=${id}`);
  };

  const handleDownload = (quotationNumber: string) => {
    toast.success(`กำลังดาวน์โหลด ${quotationNumber}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          รายการใบเสนอราคา
        </h1>
        <Button onClick={handleCreateNew} className="gradient-primary text-white hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          สร้างใบเสนอราคาใหม่
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotations.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              แบบร่าง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {quotations.filter((q) => q.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ส่งแล้ว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {quotations.filter((q) => q.status === "sent").length}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              อนุมัติแล้ว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {quotations.filter((q) => q.status === "approved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>รายการใบเสนอราคาทั้งหมด</CardTitle>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาเลขที่ใบเสนอราคา หรือ ชื่อลูกค้า"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่ใบเสนอราคา</TableHead>
                  <TableHead>ชื่อลูกค้า</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                  <TableHead className="text-center">จำนวนรายการ</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">
                      {quotation.quotationNumber}
                    </TableCell>
                    <TableCell>{quotation.customerName}</TableCell>
                    <TableCell>{formatDate(quotation.date)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(quotation.total)}
                    </TableCell>
                    <TableCell className="text-center">{quotation.items}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(quotation.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(quotation.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(quotation.quotationNumber)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredQuotations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">ไม่พบใบเสนอราคา</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotationList;
