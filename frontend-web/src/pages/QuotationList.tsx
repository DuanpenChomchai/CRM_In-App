import { useEffect, useMemo, useState } from "react";
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
import { FileText, Search, Edit, Download, Plus, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

type QuotationStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

type QuotationRow = {
  id: number;
  quotationNumber: string;
  customerName: string;
  propertyName: string;
  stateDate: string;
  totalAmount: number;
  status: QuotationStatus;
  itemsCount: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const parseJwt = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
};

async function apiFetch<T>(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status}) ${res.statusText}`;
    throw new Error(msg);
  }
  return data as T;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(value);

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));

const getStatusBadge = (status: QuotationStatus) => {
  const config: Record<QuotationStatus, { label: string; className: string }> = {
    DRAFT: { label: "แบบร่าง", className: "bg-gray-500 text-white" },
    SENT: { label: "ส่งแล้ว", className: "bg-blue-500 text-white" },
    APPROVED: { label: "อนุมัติแล้ว", className: "bg-green-500 text-white" },
    REJECTED: { label: "ปฏิเสธ", className: "bg-red-500 text-white" },
  };
  const c = config[status];
  return <Badge className={c.className}>{c.label}</Badge>;
};

// ─── component ────────────────────────────────────────────────────────────────
const QuotationList = () => {
  const navigate = useNavigate();

  // role detection from JWT
  const userRole = useMemo(() => {
    const token = localStorage.getItem("token") || "";
    return parseJwt(token)?.role as string | undefined;
  }, []);
  const canApprove = userRole === "MANAGER" || userRole === "ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<QuotationRow[]>([]);

  // approve confirm dialog
  const [approveTarget, setApproveTarget] = useState<QuotationRow | null>(null);
  const [approving, setApproving] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any[]>("/api/quotations");
      const mapped: QuotationRow[] = (res || []).map((q) => ({
        id: q.id,
        quotationNumber: q.quotationNumber,
        customerName: q.customer?.name || "-",
        propertyName: q.items?.[0]?.property?.name || q.items?.[0]?.name || "-",
        stateDate: q.startDate || q.stateDate || q.createdAt,
        totalAmount: Number(q.totalAmount || 0),
        status: q.status as QuotationStatus,
        itemsCount: q._count?.items ?? q.items?.length ?? 0,
      }));
      setRows(mapped);
    } catch (err: any) {
      toast.error(err?.message || "โหลดรายการใบเสนอราคาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.quotationNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.propertyName.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const countAll = rows.length;
  const countDraft = rows.filter((x) => x.status === "DRAFT").length;
  const countSent = rows.filter((x) => x.status === "SENT").length;
  const countApproved = rows.filter((x) => x.status === "APPROVED").length;

  const handleCreateNew = () => navigate("/quotation");
  const handleEdit = (id: number) => navigate(`/quotation?edit=${id}`);

  const handleDownload = async (quotation: QuotationRow) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/quotations/${quotation.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        let msg = `โหลด PDF ไม่สำเร็จ (${res.status})`;
        try { const d = await res.json(); msg = d?.message || d?.error || msg; } catch { }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ใบเสนอราคา-${quotation.quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`ดาวน์โหลด ${quotation.quotationNumber} สำเร็จ`);
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาดในการโหลด PDF");
    }
  };

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await apiFetch(`/api/quotations/${approveTarget.id}/approve`, { method: "POST" });
      toast.success(`อนุมัติใบเสนอราคา ${approveTarget.quotationNumber} สำเร็จ`);
      setApproveTarget(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err?.message || "อนุมัติไม่สำเร็จ");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "ทั้งหมด", value: countAll, color: "" },
          { label: "แบบร่าง", value: countDraft, color: "text-gray-600" },
          { label: "ส่งแล้ว", value: countSent, color: "text-blue-600" },
          { label: "อนุมัติแล้ว", value: countApproved, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label} className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>รายการใบเสนอราคาทั้งหมด</CardTitle>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาเลขที่ใบเสนอราคา / ลูกค้า / อสังหาฯ"
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
                  <TableHead>อสังหาฯ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                  <TableHead className="text-center">จำนวนรายการ</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.quotationNumber}</TableCell>
                      <TableCell>{r.customerName}</TableCell>
                      <TableCell>{r.propertyName}</TableCell>
                      <TableCell>{formatDate(r.stateDate)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(r.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">{r.itemsCount}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit */}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(r.id)} title="แก้ไข">
                            <Edit className="w-4 h-4" />
                          </Button>

                          {/* Download PDF */}
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(r)} title="ดาวน์โหลด PDF">
                            <Download className="w-4 h-4" />
                          </Button>

                          {/* Approve — เฉพาะ MANAGER/ADMIN และสถานะ DRAFT/SENT */}
                          {canApprove && (r.status === "DRAFT" || r.status === "SENT") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setApproveTarget(r)}
                              title="อนุมัติใบเสนอราคา"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">ไม่พบใบเสนอราคา</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirm Dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              ยืนยันการอนุมัติ
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการอนุมัติใบเสนอราคา{" "}
              <span className="font-semibold text-foreground">{approveTarget?.quotationNumber}</span>{" "}
              ของลูกค้า <span className="font-semibold text-foreground">{approveTarget?.customerName}</span> ใช่หรือไม่?
              <br />
              <span className="text-sm text-muted-foreground">หลังอนุมัติแล้วจะไม่สามารถแก้ไขสถานะกลับได้</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApproveConfirm}
              disabled={approving}
            >
              {approving ? "กำลังอนุมัติ..." : "อนุมัติ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuotationList;
