import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell, User, Phone, Mail, Home, DollarSign, UserPlus, Search } from "lucide-react";
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
  propertyType: string;
  budget: number;
  status: "new" | "contacted" | "negotiating" | "closed";
  assignedTo?: string;
}

const CustomerOverview = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    propertyType: "",
    budget: 0,
  });

  const salesTeam = [
    "สมชาย ใจดี",
    "สมหญิง รักงาน",
    "ประยุทธ์ ขยัน",
    "วิไล มานะ",
    "สุนทร พยายาม",
  ];

  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 1,
      name: "คุณสมศักดิ์ เจริญสุข",
      phone: "081-234-5678",
      email: "somsak@email.com",
      propertyType: "คอนโด",
      budget: 3500000,
      status: "new",
    },
    {
      id: 2,
      name: "คุณวิภา สวยงาม",
      phone: "082-345-6789",
      email: "wipa@email.com",
      propertyType: "บ้านเดี่ยว",
      budget: 8500000,
      status: "contacted",
      assignedTo: "สมชาย ใจดี",
    },
    {
      id: 3,
      name: "คุณประเสริฐ มั่งคั่ง",
      phone: "083-456-7890",
      email: "prasert@email.com",
      propertyType: "ทาวน์เฮ้าส์",
      budget: 4200000,
      status: "new",
    },
  ]);

  const newCustomers = customers.filter((c) => c.status === "new");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: Customer["status"]) => {
    const statusConfig = {
      new: { label: "ใหม่", className: "bg-blue-500" },
      contacted: { label: "ติดต่อแล้ว", className: "bg-yellow-500" },
      negotiating: { label: "เจรจา", className: "bg-purple-500" },
      closed: { label: "ปิดการขาย", className: "bg-green-500" },
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleAssignSales = (customerId: number, salesName: string) => {
    setCustomers(prev =>
      prev.map(c =>
        c.id === customerId ? { ...c, assignedTo: salesName } : c
      )
    );
    toast.success(`มอบหมายลูกค้าให้ ${salesName} เรียบร้อยแล้ว`);
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.email) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const customer: Customer = {
      id: customers.length + 1,
      ...newCustomer,
      status: "new",
    };

    setCustomers([...customers, customer]);
    setNewCustomer({
      name: "",
      phone: "",
      email: "",
      propertyType: "",
      budget: 0,
    });
    setIsAddDialogOpen(false);
    toast.success("เพิ่มลูกค้าใหม่สำเร็จ");
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ลูกค้า</h1>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="gradient-primary text-white hover:opacity-90"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          เพิ่มลูกค้าใหม่
        </Button>
      </div>

      {/* การแจ้งเตือนลูกค้าใหม่ */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center">
           
              
            </div>
            <div>
              <CardTitle className="text-2xl">การแจ้งเตือนลูกค้าใหม่</CardTitle>
              <p className="text-muted-foreground mt-1">
                มีลูกค้าใหม่ {newCustomers.length} รายรอการติดต่อ
              </p>
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
                  <Badge className="bg-accent text-accent-foreground">ลูกค้าใหม่</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="text-sm">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" />
                    <span className="text-sm">{customer.propertyType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">{formatCurrency(customer.budget)}</span>
                  </div>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
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
                      <div className="flex items-center gap-2">
                        <Home className="w-3 h-3 text-primary" />
                        {customer.propertyType}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(customer.budget)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      {customer.assignedTo || (
                        <Select onValueChange={(value) => handleAssignSales(customer.id, value)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="เลือกพนักงาน" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesTeam.map((sales) => (
                              <SelectItem key={sales} value={sales}>
                                {sales}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
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
            <DialogDescription>
              ข้อมูลทั้งหมดของลูกค้า
            </DialogDescription>
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
                  <span className="font-medium">{selectedCustomer?.propertyType}</span>
                </div>
              </div>
              <div>
                <Label>งบประมาณ</Label>
                <div className="flex items-center gap-2 mt-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">
                    {selectedCustomer ? formatCurrency(selectedCustomer.budget) : ""}
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
                  <span className="font-medium">{selectedCustomer?.assignedTo || "ยังไม่ได้มอบหมาย"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDetailDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog เพิ่มลูกค้าใหม่ */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มลูกค้าใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลลูกค้าใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>ชื่อลูกค้า</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="0XX-XXX-XXXX"
              />
            </div>
            <div>
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>ประเภทอสังหา</Label>
              <Select
                value={newCustomer.propertyType}
                onValueChange={(value) => setNewCustomer({ ...newCustomer, propertyType: value })}
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
                value={newCustomer.budget || ""}
                onChange={(e) => setNewCustomer({ ...newCustomer, budget: Number(e.target.value) })}
                placeholder="0"
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
    </div>
  );
};

export default CustomerOverview;