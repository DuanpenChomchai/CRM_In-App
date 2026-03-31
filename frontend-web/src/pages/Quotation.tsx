import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, List, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

type QuotationStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED";

type CustomerLite = {
  id: number;
  name: string;
  email: string;
  tol?: string | null;
};

type PropertyLite = {
  id: number;
  name: string;
  price: number;
};

type QuotationItemUI = {
  uiId: number;
  propertyId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

type QuotationDetail = {
  id: number;
  quotationNumber: string;
  status: QuotationStatus;
  customerId: number;
  totalAmount: number;
  items: Array<{
    id: number;
    propertyId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    lineTotal: number;
    property?: { id: number; name: string; price: any };
  }>;
  customer?: { id: number; name: string; email: string; tol?: string | null };
};

const valToInt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(value);

const calcLineTotal = (unitPrice: number, qty: number, discountPct: number) => {
  const subtotal = unitPrice * qty;
  return subtotal - (subtotal * discountPct) / 100;
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

const normalizeArray = (v: any) => {
  if (Array.isArray(v)) return v;
  return v?.data ?? v?.customers ?? v?.properties ?? v?.items ?? [];
};

const Quotation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const editIdRaw = searchParams.get("edit");
  const editQuotationId = editIdRaw ? valToInt(editIdRaw) : 0;
  const isEditMode = !!editQuotationId;

  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [properties, setProperties] = useState<PropertyLite[]>([]);

  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [quotationNumber, setQuotationNumber] = useState<string>("");

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", address: "" });

  const [status, setStatus] = useState<QuotationStatus>("DRAFT");
  const [items, setItems] = useState<QuotationItemUI[]>([]);

  // ล็อกฟอร์มถ้าใบเสนอราคาถูก Manager อนุมัติ/ปฏิเสธแล้ว
  const isLocked = status === "APPROVED" || status === "REJECTED";

  const [newItem, setNewItem] = useState({
    propertyId: "",
    quantity: 1,
    discount: 0,
  });

  const grandTotal = useMemo(
    () => items.reduce((sum, it) => sum + calcLineTotal(it.unitPrice, it.quantity, it.discount), 0),
    [items]
  );

  useEffect(() => {
    const run = async () => {
      setLoadingPage(true);
      try {
        const storedUser = localStorage.getItem("user");
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        const role = userObj?.role || "GUEST";
        const userId = userObj?.id;

        const customerEndpoint = role === "SALE" 
          ? `/api/customers/sale/${userId}` 
          : `/api/customers`;

        const [cResRaw, pResRaw] = await Promise.all([
          apiFetch<any>(customerEndpoint),
          // ✅ ใช้ endpoint เบาๆ สำหรับ dropdown สินค้าในใบเสนอราคา
          apiFetch<any>("/api/properties/simple"),
        ]);

        const cRes = normalizeArray(cResRaw) as CustomerLite[];
        const pRes = normalizeArray(pResRaw) as any[];

        const mappedProps: PropertyLite[] = (pRes || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: toNumber(p.price),
        }));

        setCustomers(cRes || []);
        setProperties(mappedProps || []);

        if (isEditMode) {
          const q = await apiFetch<QuotationDetail>(`/api/quotations/${editQuotationId}`);

          setQuotationId(q.id);
          setQuotationNumber(q.quotationNumber || "");
          setStatus(q.status || "DRAFT");

          setCustomerId(q.customerId);

          const c = q.customer || cRes.find((x) => x.id === q.customerId);
          setCustomerForm({
            name: c?.name || "",
            email: c?.email || "",
            phone: c?.tol || "",
            address: "",
          });

          setItems(
            (q.items || []).map((it) => ({
              uiId: Date.now() + it.id,
              propertyId: it.propertyId,
              name: it.name,
              quantity: toNumber(it.quantity) || 1,
              unitPrice: toNumber(it.unitPrice),
              discount: toNumber(it.discount),
            }))
          );
        } else {
          setQuotationId(null);
          setQuotationNumber("กำลังสร้าง...");
          setStatus("DRAFT");
          setItems([]);
          setCustomerId(null);
          setCustomerForm({ name: "", email: "", phone: "", address: "" });
        }
      } catch (err: any) {
        toast.error(err?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoadingPage(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editQuotationId]);

  const handleSelectCustomer = (value: string) => {
    const cid = valToInt(value);
    setCustomerId(cid);

    const c = customers.find((x) => x.id === cid);
    if (c) {
      setCustomerForm((prev) => ({
        ...prev,
        name: c.name || "",
        email: c.email || "",
        phone: c.tol || "",
      }));
    }
  };

  const handleAddItem = () => {
    const pid = newItem.propertyId ? valToInt(newItem.propertyId) : 0;
    const p = properties.find((x) => x.id === pid);
    if (!p) {
      toast.error("กรุณาเลือกสินค้าให้ถูกต้อง");
      return;
    }

    const qty = clamp(valToInt(newItem.quantity), 1, 999999);
    const discount = clamp(toNumber(newItem.discount), 0, 100);

    const unitPrice = toNumber(p.price);
    if (unitPrice <= 0) {
      toast.error("ราคาสินค้าไม่ถูกต้อง");
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        uiId: Date.now(),
        propertyId: p.id,
        name: p.name,
        quantity: qty,
        unitPrice,
        discount,
      },
    ]);

    setNewItem({ propertyId: "", quantity: 1, discount: 0 });
    toast.success("เพิ่มรายการสินค้าแล้ว");
  };

  const handleRemoveItem = (uiId: number) => {
    setItems((prev) => prev.filter((x) => x.uiId !== uiId));
    toast.success("ลบรายการแล้ว");
  };

  const handleSubmit = async () => {
    try {
      if (!customerId) return toast.error("กรุณาเลือกลูกค้า");
      if (items.length === 0) return toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");

      setLoading(true);

      const mainPropertyId = items[0].propertyId;

      const payload = {
        customerId,
        propertyId: mainPropertyId,
        status,
        customer: {
          name: customerForm.name,
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address,
        },
        items: items.map((it) => ({
          name: it.name,
          propertyId: it.propertyId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
        })),
      };

      // ✅ EDIT ต้อง PATCH (Backend เป็น router.patch)
      if (isEditMode && quotationId) {
        const updated = await apiFetch<QuotationDetail>(`/api/quotations/${quotationId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success(`อัปเดตใบเสนอราคา ${updated.quotationNumber} สำเร็จ`);
        navigate("/quotationlist");
        return;
      }

      const created = await apiFetch<QuotationDetail>("/api/quotations", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(`สร้างใบเสนอราคา ${created.quotationNumber} สำเร็จ`);
      navigate("/quotationlist");
    } catch (err: any) {
      toast.error(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-muted-foreground">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          {isEditMode ? `แก้ไขใบเสนอราคา #${quotationNumber}` : "สร้างใบเสนอราคา"}
        </h1>

        <Button variant="outline" onClick={() => navigate("/quotationlist")}>
          <List className="w-4 h-4 mr-2" />
          ดูรายการทั้งหมด
        </Button>
      </div>

      {/* Customer */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>ข้อมูลลูกค้าและเอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>เลขที่ใบเสนอราคา *</Label>
              <Input value={quotationNumber} disabled placeholder="กำลังสร้าง..." />
            </div>

            <div>
              <Label>เลือกลูกค้า *</Label>
              <Select value={customerId ? String(customerId) : ""} onValueChange={handleSelectCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกลูกค้า" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>สถานะใบเสนอราคา</Label>
              {isLocked ? (
                // APPROVED / REJECTED — แสดง badge อ่านอย่างเดียว (Manager เท่านั้นที่เปลี่ยนได้)
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={status === "APPROVED" ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                    {status === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Manager อนุมัติแล้ว
                  </span>
                </div>
              ) : (
                // DRAFT / SENT — เซลล์เลือกได้
                <Select value={status} onValueChange={(v) => setStatus(v as QuotationStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">แบบร่าง</SelectItem>
                    <SelectItem value="SENT">ส่งแล้ว</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>ชื่อลูกค้า *</Label>
              <Input value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <Label>อีเมล *</Label>
              <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <Label>เบอร์โทรศัพท์ *</Label>
              <Input value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div className="md:col-span-2">
              <Label>ที่อยู่</Label>
              <Input value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Item */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>เพิ่มรายการสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <Label>สินค้า</Label>
              <Select value={newItem.propertyId} onValueChange={(v) => setNewItem((p) => ({ ...p, propertyId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>จำนวน</Label>
              <Input type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem((p) => ({ ...p, quantity: valToInt(e.target.value) || 1 }))} />
            </div>

            <div>
              <Label>ส่วนลด (%)</Label>
              <Input type="number" min="0" max="100" value={newItem.discount} onChange={(e) => setNewItem((p) => ({ ...p, discount: toNumber(e.target.value) || 0 }))} />
            </div>

            <Button onClick={handleAddItem} className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              เพิ่ม
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>รายการสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>ยังไม่มีรายการสินค้า</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead className="text-right">ราคา/หน่วย</TableHead>
                    <TableHead className="text-center">ส่วนลด</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.uiId}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-center">{it.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.unitPrice)}</TableCell>
                      <TableCell className="text-center">
                        {it.discount > 0 ? <Badge variant="destructive">{it.discount}%</Badge> : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(calcLineTotal(it.unitPrice, it.quantity, it.discount))}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(it.uiId)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>ยอดรวมทั้งหมด:</span>
                    <span className="font-bold text-2xl text-primary">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate("/quotationlist")} disabled={loading}>
          {isLocked ? "กลับ" : "ยกเลิก"}
        </Button>

        {!isLocked && (
          <Button className="gradient-primary text-white" onClick={handleSubmit} disabled={loading}>
            {isEditMode ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                บันทึกการแก้ไข
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                สร้างใบเสนอราคา
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Quotation;
