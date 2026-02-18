import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  User,
  Phone,
  Mail,
  Home,
  DollarSign,
  UserPlus,
  Search,
  Edit,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ==========================
// TYPE ตรงกับ backend 100%
// ==========================
interface Customer {
  id: number;
  name: string;
  tol: string;
  email: string;
  productType?: string | null;
  priceBudget?: number | null;
  saleId?: number | null;
  saleName?: string | null;
  mainStatus?: string | null;
}

interface SaleUser {
  id: number;
  name: string;
}

// ===== helper แปลงข้อมูลจาก backend → UI =====
const mapApiCustomerToUi = (c: any): Customer => {
  return {
    id: c.id,
    name: c.name,
    tol: c.tol,
    email: c.email,
    productType: c.productType ?? null,
    priceBudget: c.priceBudget ? Number(c.priceBudget) : null,
    saleId: c.saleId ?? null,
    saleName: c.sale?.name ?? null,
    mainStatus: c.mainStatus ?? "CONTACTED",
  };
};

// ==============================
// Component หลัก
// ==============================
const Customer = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    tol: "",
    email: "",
  });

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  const [salesTeam, setSalesTeam] = useState<SaleUser[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // =============== โหลดลูกค้าจาก backend ===============
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/api/customers", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!res.ok) throw new Error("โหลดลูกค้าไม่ได้");

        const data = await res.json();
        const mapped: Customer[] = data.map(mapApiCustomerToUi);
        setCustomers(mapped);
      } catch (err) {
        console.error(err);
        toast.error("โหลดข้อมูลลูกค้าจากระบบไม่สำเร็จ");
      }
    };

    fetchCustomers();
  }, []);

  // =============== โหลดเซลล์ ===============
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/api/users/sales", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!res.ok) throw new Error("โหลดเซลล์ไม่ได้");

        const json = await res.json();

        const mapped: SaleUser[] = (json.data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
        }));

        setSalesTeam(mapped);
      } catch (err) {
        console.error(err);
        toast.error("โหลดรายชื่อพนักงานขายไม่สำเร็จ");
      }
    };

    fetchSales();
  }, []);

  // =============== WebSocket ===============
  useEffect(() => {
    const token = localStorage.getItem("token");

    const socket: Socket = io("http://localhost:3000", {
      transports: ["websocket"],
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    socket.on("customer:new", (payload: any) => {
      const mapped = mapApiCustomerToUi(payload);
      setCustomers((prev) => {
        if (prev.some((c) => c.id === mapped.id)) return prev;
        return [mapped, ...prev];
      });
      toast.success(`มีลูกค้าใหม่จากแอป: ${mapped.name}`);
    });

    socket.on("customer:assigned", (payload: any) => {
      const mapped = mapApiCustomerToUi(payload);
      setCustomers((prev) =>
        prev.map((c) => (c.id === mapped.id ? mapped : c))
      );
    });

    return () => { socket.disconnect(); };
  }, []);

  // ================================
  // คำนวณลูกค้าใหม่ (ยังไม่ assign)
  // ================================
  const newCustomers = customers.filter((c) => !c.saleId);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.tol.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  // ================================
  // มอบหมายเซลล์ (Assign Sales)
  // ================================
  const handleAssignSales = async (customerId: number, saleId: number) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:3000/api/customers/${customerId}/assign-sale`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ saleId }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "มอบหมายเซลล์ไม่สำเร็จ");
        return;
      }

      const updated = await res.json();
      const mapped = mapApiCustomerToUi(updated);

      setCustomers((prev) =>
        prev.map((c) => (c.id === mapped.id ? mapped : c))
      );

      const sale = salesTeam.find((s) => s.id === saleId);
      toast.success(`มอบหมายลูกค้าให้ ${sale?.name || "พนักงานขาย"}`);
    } catch (err) {
      console.error(err);
      toast.error("มอบหมายพนักงานขายไม่สำเร็จ (network)");
    }
  };

  // ===================================
  // เพิ่มลูกค้าใหม่ → ยิง POST จริง
  // ===================================
  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.tol || !newCustomer.email) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3000/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          name: newCustomer.name,
          phone: newCustomer.tol,
          email: newCustomer.email,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || "เพิ่มลูกค้าใหม่ไม่สำเร็จ");
        return;
      }

      const created = await res.json();
      const mapped = mapApiCustomerToUi(created);

      setCustomers((prev) => [mapped, ...prev]);
      setNewCustomer({ name: "", tol: "", email: "" });
      setIsAddDialogOpen(false);

      toast.success("เพิ่มลูกค้าใหม่สำเร็จ");
    } catch (err) {
      console.error(err);
      toast.error("เพิ่มลูกค้าใหม่ไม่สำเร็จ (network)");
    }
  };

  // ============================================
  // แก้ไขข้อมูลลูกค้า → ยิง PUT /api/customers/:id
  // ============================================
  const handleUpdateCustomer = async () => {
    if (!editCustomer) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `http://localhost:3000/api/customers/${editCustomer.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            name: editCustomer.name,
            phone: editCustomer.tol,
            email: editCustomer.email,
            productType: editCustomer.productType,
            budget: editCustomer.priceBudget,
            saleId: editCustomer.saleId ?? null,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "อัปเดทข้อมูลลูกค้าไม่สำเร็จ");
        return;
      }

      const updated = await res.json();
      const mapped = mapApiCustomerToUi(updated);

      setCustomers((prev) =>
        prev.map((c) => (c.id === mapped.id ? mapped : c))
      );

      toast.success("อัปเดทข้อมูลลูกค้าสำเร็จ");

      setIsEditDialogOpen(false);
      setEditCustomer(null);
    } catch (err) {
      console.error(err);
      toast.error("อัปเดทข้อมูลลูกค้าไม่สำเร็จ (network)");
    }
  };
  // ======================== UI ========================
  return (
    <div className="container mx-auto p-6 space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ลูกค้า</h1>
      </div>

      {/* การแจ้งเตือนลูกค้าใหม่ */}
      <Card className="shadow-elegant border-l-4 border-l-accent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full gradient-primary animate-pulse">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">การแจ้งเตือนลูกค้าใหม่</CardTitle>
              <p className="text-muted-foreground mt-1">
                มีลูกค้าใหม่ {newCustomers.length} รายรอการติดต่อ
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4">
            {newCustomers.map((customer) => (
              <div
                key={customer.id}
                className="p-6 rounded-xl border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent hover:shadow-card transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full gradient-primary">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>

                    <div>
                      <h3
                        className="font-bold text-lg cursor-pointer hover:text-primary"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setIsDetailDialogOpen(true);
                        }}
                      >
                        {customer.name}
                      </h3>
                    </div>
                  </div>

                  <Badge className="bg-accent text-accent-foreground">
                    ลูกค้าใหม่
                  </Badge>
                </div>

                <div className="flex items-start justify-between gap-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      <span className="text-sm">{customer.tol}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-sm">{customer.email}</span>
                    </div>

                    {customer.productType && (
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-sm">{customer.productType}</span>
                      </div>
                    )}

                    {customer.priceBudget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(customer.priceBudget)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditCustomer(customer);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    แก้ไขข้อมูล
                  </Button>
                </div>
              </div>
            ))}

            {newCustomers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">ไม่มีลูกค้าใหม่ในขณะนี้</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* รายชื่อลูกค้าทั้งหมด */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>รายชื่อลูกค้าทั้งหมด</CardTitle>

            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาลูกค้า (ชื่อ, เบอร์โทร, อีเมล)"
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
                  <TableHead>ชื่อลูกค้า</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>ประเภทอสังหา</TableHead>
                  <TableHead>งบประมาณ</TableHead>
                  <TableHead>พนักงานที่ดูแล</TableHead>
                  <TableHead>สถานะ Pipeline</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.name}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-primary" />
                        {customer.tol}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-primary" />
                        {customer.email}
                      </div>
                    </TableCell>

                    <TableCell>
                      {customer.productType || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {customer.priceBudget ? (
                        <div className="flex items-center gap-2 font-semibold text-primary">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(customer.priceBudget)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {customer.saleId ? (
                        customer.saleName
                      ) : (
                        <Select
                          onValueChange={(value) =>
                            handleAssignSales(customer.id, Number(value))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="เลือกพนักงาน" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesTeam.map((sale) => (
                              <SelectItem key={sale.id} value={String(sale.id)}>
                                {sale.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Pipeline Status */}
                    <TableCell>
                      {(() => {
                        const s = customer.mainStatus || "CONTACTED";
                        const map: Record<string, { label: string; color: string }> = {
                          CONTACTED: { label: "Contacted", color: "bg-blue-100 text-blue-700" },
                          NEGOTIATING: { label: "Negotiation", color: "bg-yellow-100 text-yellow-700" },
                          QUOTATION: { label: "Quotation", color: "bg-purple-100 text-purple-700" },
                          CLOSED: { label: "Closed Deal", color: "bg-green-100 text-green-700" },
                        };
                        const info = map[s] || map["CONTACTED"];
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${info.color}`}>
                            {info.label}
                          </span>
                        );
                      })()}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditCustomer(customer);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">ไม่พบข้อมูลลูกค้า</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog รายละเอียดลูกค้า */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รายละเอียดลูกค้า</DialogTitle>
            <DialogDescription>ข้อมูลทั้งหมดของลูกค้า</DialogDescription>
          </DialogHeader>

          {/* Pipeline Progress Stepper */}
          <div className="py-2">
            <div className="flex items-center w-full">
              {[
                { id: "CONTACTED", label: "Contacted", step: 1 },
                { id: "NEGOTIATING", label: "Negotiation", step: 2 },
                { id: "QUOTATION", label: "Quotation", step: 3 },
                { id: "CLOSED", label: "Closed Deal", step: 4 },
              ].map((s, idx, arr) => {
                const order = ["CONTACTED", "NEGOTIATING", "QUOTATION", "CLOSED"];
                const currentIdx = order.indexOf(selectedCustomer?.mainStatus || "CONTACTED");
                const thisIdx = order.indexOf(s.id);
                const isDone = thisIdx < currentIdx;
                const isActive = thisIdx === currentIdx;
                return (
                  <div key={s.id} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={[
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                        isDone ? "bg-primary border-primary text-white" :
                          isActive ? "bg-primary/20 border-primary text-primary" :
                            "bg-muted border-border text-muted-foreground"
                      ].join(" ")}>
                        {isDone ? "✓" : s.step}
                      </div>
                      <span className={[
                        "text-[10px] mt-1 font-medium text-center leading-tight",
                        isActive ? "text-primary" : isDone ? "text-primary/70" : "text-muted-foreground"
                      ].join(" ")}>
                        {s.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className={[
                        "h-0.5 flex-1 mx-1 rounded transition-all",
                        thisIdx < currentIdx ? "bg-primary" : "bg-border"
                      ].join(" ")} />
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
                <div className="flex items-center gap-2 mt-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedCustomer?.name}</span>
                </div>
              </div>

              <div>
                <Label>เบอร์โทร</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedCustomer?.tol}</span>
                </div>
              </div>

              <div>
                <Label>อีเมล</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="font-medium">{selectedCustomer?.email}</span>
                </div>
              </div>

              <div>
                <Label>ประเภทอสังหา</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Home className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {selectedCustomer?.productType || "-"}
                  </span>
                </div>
              </div>

              <div>
                <Label>งบประมาณ</Label>
                <div className="flex items-center gap-2 mt-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">
                    {selectedCustomer?.priceBudget
                      ? formatCurrency(selectedCustomer.priceBudget)
                      : "-"}
                  </span>
                </div>
              </div>

              <div>
                <Label>พนักงานที่ดูแล</Label>
                <div className="mt-2">
                  {selectedCustomer?.saleName || "ยังไม่ได้มอบหมาย"}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog แก้ไขลูกค้า */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลลูกค้า</DialogTitle>
            <DialogDescription>
              อัปเดตข้อมูลความต้องการของลูกค้า
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">

            <div>
              <Label>ชื่อลูกค้า</Label>
              <Input
                value={editCustomer?.name || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? { ...editCustomer, name: e.target.value }
                      : null
                  )
                }
              />
            </div>

            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={editCustomer?.tol || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? { ...editCustomer, tol: e.target.value }
                      : null
                  )
                }
              />
            </div>

            <div>
              <Label>อีเมล</Label>
              <Input
                value={editCustomer?.email || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? { ...editCustomer, email: e.target.value }
                      : null
                  )
                }
              />
            </div>

            <div>
              <Label>ประเภทอสังหา</Label>
              <Select
                value={editCustomer?.productType || ""}
                onValueChange={(value) =>
                  setEditCustomer(
                    editCustomer
                      ? { ...editCustomer, productType: value }
                      : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="คอนโด">คอนโด</SelectItem>
                  <SelectItem value="บ้านเดี่ยว">บ้านเดี่ยว</SelectItem>
                  <SelectItem value="ทาวน์เฮ้าส์">ทาวน์เฮ้าส์</SelectItem>
                  <SelectItem value="ที่ดิน">ที่ดิน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>งบประมาณ</Label>
              <Input
                type="number"
                value={editCustomer?.priceBudget || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                        ...editCustomer,
                        priceBudget: Number(e.target.value),
                      }
                      : null
                  )
                }
              />
            </div>

            <div>
              <Label>พนักงานที่ดูแล</Label>
              <Select
                value={String(editCustomer?.saleId || "")}
                onValueChange={(value) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                        ...editCustomer,
                        saleId: Number(value),
                        saleName:
                          salesTeam.find((s) => s.id === Number(value))
                            ?.name || null,
                      }
                      : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกพนักงาน" />
                </SelectTrigger>

                <SelectContent>
                  {salesTeam.map((sale) => (
                    <SelectItem key={sale.id} value={String(sale.id)}>
                      {sale.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>

            <Button
              onClick={handleUpdateCustomer}
              className="gradient-primary text-white"
            >
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Customer;
