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
import { FileText, Search, Edit, Download, Plus, CheckCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE 

type QuotationStatus = "DRAFT" | "WAIT_APPROVAL" | "SENT" | "APPROVED" | "REJECTED";

type QuotationRow = {
  id: number;
  quotationNumber: string;
  customerName: string;
  propertyName: string;
  stateDate: string;
  totalAmount: number;
  status: QuotationStatus;
  itemsCount: number;
  customerStatus?: string; // ✅ เพื่อเช็คว่าปิดดีลแล้วหรือยัง
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
    WAIT_APPROVAL: { label: "รออนุมัติ", className: "bg-yellow-500 text-white" },
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

  // delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<QuotationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/quotations/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`ลบใบเสนอราคา ${deleteTarget.quotationNumber} สำเร็จ`);
      setDeleteTarget(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err?.message || "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

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
        customerStatus: q.customer?.mainStatus ?? undefined, // ✅
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

  const handleCreateNew = () => navigate("/quotation", { replace: true });
  const handleEdit = (id: number) => navigate(`/quotation?edit=${id}`, { replace: true });
  const handleView = (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    window.open(`${API_BASE}/api/quotations/${id}/pdf?t=${encodeURIComponent(token)}`, "_blank");
  };

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
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg gradient-primary text-white shadow-md shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold leading-tight truncate">รายการใบเสนอราคา</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">จัดการเอกสารทั้งหมดในระบบ</p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="gradient-primary text-white hover:opacity-90 shrink-0 h-9 md:h-10 px-3 md:px-4 text-xs md:text-sm">
          <Plus className="w-4 h-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">สร้างใบเสนอราคาใหม่</span>
          <span className="sm:hidden">สร้างใหม่</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "ทั้งหมด", value: countAll, color: "text-foreground", border: "border-l-primary", bg: "" },
          { label: "แบบร่าง", value: countDraft, color: "text-gray-600", border: "border-l-gray-400", bg: "" },
          { label: "ส่งแล้ว", value: countSent, color: "text-blue-600", border: "border-l-blue-500", bg: "" },
          { label: "อนุมัติแล้ว", value: countApproved, color: "text-green-600", border: "border-l-green-500", bg: "" },
        ].map((s) => (
          <Card key={s.label} className={`overflow-hidden border-l-4 ${s.border}`}>
            <CardContent className="p-3 md:p-4">
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
              <div className={`text-2xl md:text-3xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>รายการใบเสนอราคาทั้งหมด</CardTitle>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาเลขที่ใบเสนอราคา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 md:p-6 pt-0">
          <div className="border-t md:border md:rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[150px]">เลขที่ใบเสนอราคา</TableHead>
                  <TableHead className="min-w-[150px]">ชื่อลูกค้า</TableHead>
                  <TableHead className="min-w-[150px]">อสังหาฯ</TableHead>
                  <TableHead className="min-w-[120px]">วันที่</TableHead>
                  <TableHead className="text-right min-w-[120px]">ยอดรวม</TableHead>
                  <TableHead className="text-center min-w-[100px]">จำนวนรายการ</TableHead>
                  <TableHead className="text-center min-w-[100px]">สถานะ</TableHead>
                  <TableHead className="text-center min-w-[120px]">จัดการ</TableHead>
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
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleView(r.id)}
                          className="text-primary hover:underline hover:text-primary/80 transition-all font-bold text-sm"
                          title="คลิกเพื่อดูใบเสนอราคา"
                        >
                          {r.quotationNumber}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{r.customerName}</TableCell>
                      <TableCell className="text-sm">{r.propertyName}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(r.stateDate)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary text-sm whitespace-nowrap">
                        {formatCurrency(r.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center text-sm">{r.itemsCount}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit — ซ่อนถ้าลูกค้าปิดดีลแล้ว */}
                          {r.customerStatus !== "CLOSED" && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(r.id)} title="แก้ไข" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                          )}

                          {/* Download PDF */}
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(r)} title="ดาวน์โหลด PDF" className="h-8 w-8 p-0">
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

                          {/* Delete — เฉพาะ DRAFT/SENT เท่านั้น */}
                          {(r.status === "DRAFT" || r.status === "SENT") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteTarget(r)}
                              title="ลบใบเสนอราคา"
                            >
                              <Trash2 className="w-4 h-4" />
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
      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              ยืนยันการลบ
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบใบเสนอราคา{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.quotationNumber}</span>{" "}
              ของลูกค้า <span className="font-semibold text-foreground">{deleteTarget?.customerName}</span> ใช่หรือไม่?
              <br />
              <span className="text-sm text-red-500">การลบไม่สามารถย้อนกลับได้</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuotationList;
