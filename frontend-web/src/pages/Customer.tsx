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

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  propertyType?: string;
  budget?: number;
  status: "new" | "contacted" | "negotiating" | "closed";
  assignedTo?: string;
}

interface SaleUser {
  id: number;
  name: string;
}

// ===== helper แปลงข้อมูลจาก backend → Customer ของ UI =====
const mapApiCustomerToUi = (c: any): Customer => {
  const rawStatus = (c.status || "NEW").toString().toLowerCase();

  let status: Customer["status"] = "new";
  if (rawStatus.startsWith("contact")) status = "contacted";
  else if (rawStatus.startsWith("negotiat")) status = "negotiating";
  else if (rawStatus.startsWith("close")) status = "closed";

  return {
    id: c.id,
    name: c.name,
    phone: c.tol,
    email: c.email,
    propertyType: c.productType ?? undefined,
    budget: c.priceBudget ? Number(c.priceBudget) : undefined,
    status,
    assignedTo: c.sale?.name ?? undefined,
  };
};

const SalesProcess = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);

  // ✅ ทีมเซลล์จาก DB
  const [salesTeam, setSalesTeam] = useState<SaleUser[]>([]);

  // ลูกค้าทั้งหมด
  const [customers, setCustomers] = useState<Customer[]>([]);

  // =============== 1) โหลดลูกค้าจาก backend ตอนเปิดหน้า ===============
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:3000/api/customers", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!res.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลลูกค้าได้");
        }
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

  // =============== 1.5) โหลดรายชื่อเซลล์จาก DB ===============
  useEffect(() => {
  const fetchSales = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3000/api/users/sales", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!res.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลพนักงานขายได้");
      }

      const json = await res.json();
      // json = { data: [...], page, pageSize, ... }

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

  // =============== 2) connect WebSocket ฟังลูกค้าใหม่จากแอป ===============
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket: Socket = io("http://localhost:3000", {
      transports: ["websocket"],
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    socket.emit("join-role", { role: "MANAGER" });

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

    return () => {
      socket.disconnect();
    };
  }, []);

  const newCustomers = customers.filter((c) => c.status === "new");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: Customer["status"]) => {
    const statusConfig = {
      new: {
        label: "ใหม่",
        className: "bg-blue-500",
      },
      contacted: {
        label: "ติดต่อแล้ว",
        className: "bg-yellow-500",
      },
      negotiating: {
        label: "เจรจา",
        className: "bg-purple-500",
      },
      closed: {
        label: "ปิดการขาย",
        className: "bg-green-500",
      },
    };
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // ✅ มอบหมายเซลล์: ยิงเข้า backend → backend ส่ง WS ไปให้ app 
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
        const errorBody = await res.json().catch(() => ({}));
        console.error("assign-sale error:", errorBody);
        toast.error(
          errorBody?.message || "มอบหมายพนักงานขายไม่สำเร็จ (backend)"
        );
        return;
      }

      const data = await res.json();
      const mapped = mapApiCustomerToUi(data);

      setCustomers((prev) =>
        prev.map((c) => (c.id === mapped.id ? mapped : c))
      );

      const sale = salesTeam.find((s) => s.id === saleId);
      toast.success(
        `มอบหมายลูกค้าให้ ${sale?.name || "พนักงานขาย"} เรียบร้อยแล้ว`
      );
    } catch (err) {
      console.error(err);
      toast.error("มอบหมายพนักงานขายไม่สำเร็จ (network)");
    }
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const customer: Customer = {
      id: customers.length ? customers[customers.length - 1].id + 1 : 1,
      ...newCustomer,
      status: "new",
    };

    setCustomers((prev) => [...prev, customer]);
    setNewCustomer({
      name: "",
      phone: "",
      email: "",
    });
    setIsAddDialogOpen(false);
    toast.success("เพิ่มลูกค้าใหม่สำเร็จ (ยังไม่บันทึกเข้า backend)");
  };

  const handleUpdateCustomer = () => {
    if (!editCustomer) return;

    const wasNew = editCustomer.status === "new";

    const updatedCustomer: Customer = {
      ...editCustomer,
      status: editCustomer.status === "new" ? "contacted" : editCustomer.status,
    };

    setCustomers((prev) =>
      prev.map((c) => (c.id === editCustomer.id ? updatedCustomer : c))
    );
    setIsEditDialogOpen(false);
    setEditCustomer(null);

    if (wasNew) {
      const pipelineDeals = JSON.parse(
        localStorage.getItem("pipelineDeals") || "[]"
      );
      const newDeal = {
        id: Date.now(),
        customerId: updatedCustomer.id,
        customerName: updatedCustomer.name,
        phone: updatedCustomer.phone,
        propertyType: updatedCustomer.propertyType || "ไม่ระบุ",
        budget: updatedCustomer.budget || 0,
        stage: "contacted",
        status: "กำลังติดต่อ",
        startDate: new Date(),
        assignedSales: updatedCustomer.assignedTo,
      };
      pipelineDeals.push(newDeal);
      localStorage.setItem("pipelineDeals", JSON.stringify(pipelineDeals));
      toast.success("อัพเดทข้อมูลลูกค้าและเพิ่มไปยัง Pipeline สำเร็จ");
    } else {
      toast.success("อัพเดทข้อมูลลูกค้าสำเร็จ");
    }
  };

  // ======================== UI ========================
  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
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
                        className="font-bold text-lg cursor-pointer hover:text-primary transition-colors"
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
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="text-sm">{customer.email}</span>
                    </div>
                    {customer.propertyType && (
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-sm">{customer.propertyType}</span>
                      </div>
                    )}
                    {customer.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(customer.budget)}
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
                  <TableHead>สถานะ</TableHead>
                  <TableHead>พนักงานที่ดูแล</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.propertyType ? (
                        <div className="flex items-center gap-2">
                          <Home className="w-3 h-3 text-primary" />
                          {customer.propertyType}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.budget ? (
                        <div className="flex items-center gap-2 font-semibold text-primary">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(customer.budget)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      {customer.assignedTo ? (
                        customer.assignedTo
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
                            {salesTeam.map((sales) => (
                              <SelectItem
                                key={sales.id}
                                value={String(sales.id)}
                              >
                                {sales.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
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
                  <span className="font-medium">{selectedCustomer?.phone}</span>
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
                    {selectedCustomer?.propertyType || "-"}
                  </span>
                </div>
              </div>
              <div>
                <Label>งบประมาณ</Label>
                <div className="flex items-center gap-2 mt-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">
                    {selectedCustomer?.budget
                      ? formatCurrency(selectedCustomer.budget)
                      : "-"}
                  </span>
                </div>
              </div>
              <div>
                <Label>สถานะ</Label>
                <div className="mt-2">
                  {selectedCustomer && getStatusBadge(selectedCustomer.status)}
                </div>
              </div>
              <div>
                <Label>พนักงานที่ดูแล</Label>
                <div className="mt-2">
                  <span className="font-medium">
                    {selectedCustomer?.assignedTo || "ยังไม่ได้มอบหมาย"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog เพิ่มลูกค้าใหม่ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มลูกค้าใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลลูกค้าใหม่</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>ชื่อลูกค้า</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    name: e.target.value,
                  })
                }
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    phone: e.target.value,
                  })
                }
                placeholder="0XX-XXX-XXXX"
              />
            </div>
            <div>
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    email: e.target.value,
                  })
                }
                placeholder="email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleAddCustomer}
              className="gradient-primary text-white hover:opacity-90"
            >
              เพิ่มลูกค้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog แก้ไขข้อมูลลูกค้า */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลลูกค้า</DialogTitle>
            <DialogDescription>
              เพิ่มข้อมูลความต้องการของลูกค้า
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
                      ? {
                          ...editCustomer,
                          name: e.target.value,
                        }
                      : null
                  )
                }
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={editCustomer?.phone || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                          ...editCustomer,
                          phone: e.target.value,
                        }
                      : null
                  )
                }
                placeholder="0XX-XXX-XXXX"
              />
            </div>
            <div>
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={editCustomer?.email || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                          ...editCustomer,
                          email: e.target.value,
                        }
                      : null
                  )
                }
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>ประเภทอสังหา</Label>
              <Select
                value={editCustomer?.propertyType || ""}
                onValueChange={(value) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                          ...editCustomer,
                          propertyType: value,
                        }
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
                value={editCustomer?.budget || ""}
                onChange={(e) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                          ...editCustomer,
                          budget: Number(e.target.value),
                        }
                      : null
                  )
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label>พนักงานที่ดูแล</Label>
              <Select
                value={editCustomer?.assignedTo || ""}
                onValueChange={(value) =>
                  setEditCustomer(
                    editCustomer
                      ? {
                          ...editCustomer,
                          assignedTo: value,
                        }
                      : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกพนักงาน" />
                </SelectTrigger>
                <SelectContent>
                  {salesTeam.map((sales) => (
                    <SelectItem key={sales.id} value={sales.name}>
                      {sales.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleUpdateCustomer}
              className="gradient-primary text-white hover:opacity-90"
            >
              บันทึกข้อมูล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesProcess;
