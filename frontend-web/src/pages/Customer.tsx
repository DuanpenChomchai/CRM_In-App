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
  Trash2,
  Users,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

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

const getMainStatusColor = (status: string) => {
  const map: Record<string, string> = {
    CONTACTED: "bg-blue-100 text-blue-700",
    NEGOTIATING: "bg-yellow-100 text-yellow-700",
    QUOTATION: "bg-purple-100 text-purple-700",
    CLOSED: "bg-green-100 text-green-700",
  };
  return map[(status || "").toUpperCase()] || "bg-gray-100 text-gray-700";
};

const getMainStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    CONTACTED: "ติดต่อแล้ว",
    NEGOTIATING: "เจรจาต่อรอง",
    QUOTATION: "เสนอราคา",
    CLOSED: "ปิดการขาย",
  };
  return map[(status || "").toUpperCase()] || "ไม่ระบุ";
};

const mapApiCustomerToUi = (c: any): Customer => {
  return {
    id: c.id,
    name: c.name,
    tol: c.tol,
    email: c.email,
    productType: c.productType ?? null,
    priceBudget: c.priceBudget ? Number(c.priceBudget) : null,
    saleId: c.saleId ?? null,
    saleName: c.sale?.name ?? c.saleName ?? null,
    mainStatus: c.mainStatus ?? "CONTACTED",
  };
};

const Customer = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [salesTeam, setSalesTeam] = useState<SaleUser[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const role = String(user?.role || "GUEST").toUpperCase();
  const isSale = role === "SALE";
  const isAdmin = role === "ADMIN";
  const mySaleId = Number(user?.id || 0);
  const mySaleName = user?.name || "";

  const openEditCustomerDialog = (customer: Customer) => {
    if (isSale) {
      setEditCustomer({
        ...customer,
        saleId: mySaleId || customer.saleId,
        saleName: mySaleName || customer.saleName,
      });
    } else {
      setEditCustomer(customer);
    }
    setIsEditDialogOpen(true);
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
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

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/properties/simple`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.data || [];
        setProperties(list.map((p: any) => ({ id: p.id, name: p.name })));
      } catch { /* silently fail */ }
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/sales-list`, {
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

  useEffect(() => {
    const socket: Socket = io(API_BASE, {
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
      setCustomers((prev) => prev.map((c) => (c.id === mapped.id ? mapped : c)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const newCustomers = customers.filter((c) => {
    if (role === "ADMIN" || role === "MANAGER") {
      return !c.saleId;
    }
    if (role === "SALE") {
      return (
        String(c.mainStatus || "").toUpperCase() === "CONTACTED" &&
        Number(c.saleId) === Number(mySaleId)
      );
    }
    return false;
  });

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

  const handleAssignSales = async (customerId: number, saleId: number) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}/assign-sale`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ saleId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "มอบหมายเซลล์ไม่สำเร็จ");
        return;
      }
      const updated = await res.json();
      const mapped = mapApiCustomerToUi(updated);
      setCustomers((prev) => prev.map((c) => (c.id === mapped.id ? mapped : c)));
      const sale = salesTeam.find((s) => s.id === saleId);
      toast.success(`มอบหมายลูกค้าให้ ${sale?.name || "พนักงานขาย"}`);
    } catch (err) {
      console.error(err);
      toast.error("มอบหมายพนักงานขายไม่สำเร็จ (network)");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer) return;
    try {
      const payload: any = {
        name: editCustomer.name,
        phone: editCustomer.tol,
        email: editCustomer.email,
        productType: editCustomer.productType,
        budget: editCustomer.priceBudget,
      };
      if (isAdmin) {
        payload.saleId = editCustomer.saleId ?? null;
      }
      const res = await fetch(`${API_BASE}/api/customers/${editCustomer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "อัปเดทข้อมูลลูกค้าไม่สำเร็จ");
        return;
      }
      const updated = await res.json();
      const mapped = mapApiCustomerToUi(updated);
      setCustomers((prev) => prev.map((c) => (c.id === mapped.id ? mapped : c)));
      toast.success("อัปเดทข้อมูลลูกค้าสำเร็จ");
      setIsEditDialogOpen(false);
      setEditCustomer(null);
    } catch (err) {
      console.error(err);
      toast.error("อัปเดทข้อมูลลูกค้าไม่สำเร็จ (network)");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "ลบลูกค้าไม่สำเร็จ");
        return;
      }
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast.success(`ลบลูกค้า ${deleteTarget.name} สำเร็จ`);
    } catch (err) {
      console.error(err);
      toast.error("ลบลูกค้าไม่สำเร็จ (network)");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ลูกค้า</h1>
      </div>

      {/* New Customer Notifications */}
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
                  <Badge className="bg-accent text-accent-foreground">ลูกค้าใหม่</Badge>
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
                    onClick={() => openEditCustomerDialog(customer)}
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

      {/* All Customers Table */}
      <Card className="shadow-card">
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              รายชื่อลูกค้าทั้งหมด
            </CardTitle>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหาชื่อ, เบอร์โทร, อีเมล..."
                className="pl-10 h-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-2">
          <div className="border-t md:border md:rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="min-w-[150px]">ชื่อลูกค้า</TableHead>
                  <TableHead className="min-w-[120px]">เบอร์โทร</TableHead>
                  <TableHead className="min-w-[180px]">อีเมล</TableHead>
                  <TableHead className="min-w-[150px]">พนักงานดูแล</TableHead>
                  <TableHead className="min-w-[120px] text-center">สถานะปัจจุบัน</TableHead>
                  <TableHead className="text-center min-w-[140px]">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-sm">{customer.name}</TableCell>
                      <TableCell className="text-sm">{customer.tol}</TableCell>
                      <TableCell className="text-sm truncate max-w-[180px]">{customer.email}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            defaultValue={String(customer.saleId || "")}
                            onValueChange={(val) => handleAssignSales(customer.id, Number(val))}
                          >
                            <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm bg-muted/20 border-none hover:bg-muted/40 transition-all">
                              <SelectValue placeholder="ระบุพนักงาน" />
                            </SelectTrigger>
                            <SelectContent>
                              {salesTeam.map((sale) => (
                                <SelectItem key={sale.id} value={String(sale.id)}>
                                  {sale.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                            <User className="w-3 h-3" />
                            {customer.saleName || "ไม่ระบุ"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "px-2 py-0.5 text-[10px] md:text-xs font-bold uppercase tracking-wider",
                            getMainStatusColor(customer.mainStatus || "")
                          )}
                        >
                          {getMainStatusLabel(customer.mainStatus || "")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditCustomerDialog(customer)}
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setDeleteTarget(customer)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                      ไม่พบข้อมูลลูกค้าที่ค้นหา...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดลูกค้า</DialogTitle>
            <DialogDescription>ข้อมูลทั้งหมดของลูกค้า</DialogDescription>
          </DialogHeader>

          <div className="py-2 overflow-x-auto">
            <div className="flex items-center w-full min-w-[400px]">
              {[
                { id: "CONTACTED", label: "ติดต่อแล้ว", step: 1 },
                { id: "NEGOTIATING", label: "เจรจาต่อรอง", step: 2 },
                { id: "QUOTATION", label: "เสนอราคา", step: 3 },
                { id: "CLOSED", label: "ปิดการขาย", step: 4 },
              ].map((s, idx, arr) => {
                const order = ["CONTACTED", "NEGOTIATING", "QUOTATION", "CLOSED"];
                const currentIdx = order.indexOf(selectedCustomer?.mainStatus || "CONTACTED");
                const thisIdx = order.indexOf(s.id);
                const isDone = thisIdx < currentIdx;
                const isActive = thisIdx === currentIdx;

                return (
                  <div key={s.id} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={[
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                          isDone
                            ? "bg-primary border-primary text-white"
                            : isActive
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-muted border-border text-muted-foreground",
                        ].join(" ")}
                      >
                        {isDone ? "✓" : s.step}
                      </div>
                      <span
                        className={[
                          "text-[10px] mt-1 font-medium text-center leading-tight",
                          isActive
                            ? "text-primary"
                            : isDone
                            ? "text-primary/70"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div
                        className={[
                          "h-0.5 flex-1 mx-1 rounded transition-all",
                          thisIdx < currentIdx ? "bg-primary" : "bg-border",
                        ].join(" ")}
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
                  <span className="font-medium">{selectedCustomer?.productType || "-"}</span>
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

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-0 border-none">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" />
              แก้ไขข้อมูลลูกค้า
            </DialogTitle>
            <DialogDescription>
              อัปเดตข้อมูลความต้องการของลูกค้าให้เป็นปัจจุบัน
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 p-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">ชื่อลูกค้า *</Label>
              <Input
                value={editCustomer?.name || ""}
                onChange={(e) =>
                  setEditCustomer((prev) => prev ? { ...prev, name: e.target.value } : prev)
                }
                className="h-10 md:h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">เบอร์โทรศัพท์ *</Label>
              <Input
                value={editCustomer?.tol || ""}
                onChange={(e) =>
                  setEditCustomer((prev) => prev ? { ...prev, tol: e.target.value } : prev)
                }
                className="h-10 md:h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">อีเมล *</Label>
              <Input
                value={editCustomer?.email || ""}
                onChange={(e) =>
                  setEditCustomer((prev) => prev ? { ...prev, email: e.target.value } : prev)
                }
                className="h-10 md:h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">อสังหาริมทรัพย์ที่สนใจ</Label>
              <Select
                value={editCustomer?.productType || ""}
                onValueChange={(v) =>
                  setEditCustomer((prev) => prev ? { ...prev, productType: v } : prev)
                }
              >
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue placeholder="เลือกอสังหาฯ ที่สนใจ" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">งบประมาณ (บาท)</Label>
              <Input
                type="number"
                value={editCustomer?.priceBudget === null ? "" : editCustomer?.priceBudget}
                onChange={(e) =>
                  setEditCustomer((prev) =>
                    prev ? { ...prev, priceBudget: e.target.value ? Number(e.target.value) : null } : prev
                  )
                }
                className="h-10 md:h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">พนักงานดูแล</Label>
              <Select
                disabled={!isAdmin}
                value={String(editCustomer?.saleId || "")}
                onValueChange={(val) =>
                  setEditCustomer((prev) =>
                    prev
                      ? { ...prev, saleId: Number(val), saleName: salesTeam.find((s) => s.id === Number(val))?.name || null }
                      : prev
                  )
                }
              >
                <SelectTrigger className="h-10 md:h-11 bg-muted/20">
                  <SelectValue placeholder="เลือกพนักงานขาย" />
                </SelectTrigger>
                <SelectContent>
                  {salesTeam.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 p-6 border-t bg-muted/10">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdateCustomer} className="gradient-primary text-white">
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบลูกค้า</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบลูกค้า <strong>{deleteTarget?.name}</strong> ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบลูกค้า
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customer;