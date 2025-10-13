import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, Mail, Phone, MapPin, Home, DollarSign, Search, User } from "lucide-react";

type Status = "new" | "contacted" | "negotiating" | "closed";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  propertyType: string;
  budget: number;
  status: Status;
  interested: string;
  assignedTo?: string;
  isNew?: boolean;
}

const salesTeam = ["สมชาย ใจดี", "สมหญิง รักงาน", "ประยุทธ์ ขยัน", "วิไล มานะ", "สุนทร พยายาม"];

export default function SalesProcess() {
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 1,
      name: "คุณสมศักดิ์ เจริญสุข",
      email: "somsak@email.com",
      phone: "081-234-5678",
      location: "กรุงเทพฯ",
      propertyType: "คอนโด",
      budget: 3500000,
      status: "new",
      interested: "คอนโดทำเลดี",
      isNew: true,
    },
    {
      id: 2,
      name: "คุณวิภา สวยงาม",
      email: "wipa@email.com",
      phone: "082-345-6789",
      location: "กรุงเทพฯ",
      propertyType: "บ้านเดี่ยว",
      budget: 8500000,
      status: "contacted",
      interested: "บ้านเดี่ยว 2 ชั้น",
      assignedTo: "สมชาย ใจดี",
    },
    {
      id: 3,
      name: "คุณประเสริฐ มั่งคั่ง",
      email: "prasert@email.com",
      phone: "083-456-7890",
      location: "นนทบุรี",
      propertyType: "ทาวน์เฮ้าส์",
      budget: 4200000,
      status: "new",
      interested: "ทาวน์เฮ้าส์",
      isNew: true,
    },
  ]);

  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  const newCustomers = useMemo(() => customers.filter((c) => c.isNew), [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, query]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(v);

  const statusBadge = (s: Status) => {
    if (s === "new") return <Badge className="bg-blue-500">ใหม่</Badge>;
    if (s === "contacted") return <Badge className="bg-amber-500">ติดต่อแล้ว</Badge>;
    if (s === "negotiating") return <Badge className="bg-purple-500">เจรจา</Badge>;
    return <Badge className="bg-green-600">ปิดการขาย</Badge>;
  };

  const handleAssign = (id: number, value: string) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, assignedTo: value } : c)));
  };

  const openDetailDialog = (c: Customer) => {
    setSelectedCustomer(c);
    setOpenDetail(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">ขั้นตอนการขาย</h1>

      {/* 🔔 การแจ้งเตือนลูกค้าใหม่ (เวอร์ชันที่คุณชอบ) */}
      {newCustomers.length > 0 && (
        <Card className="border-primary/50 bg-primary/5 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary animate-pulse" />
              <span>การแจ้งเตือนลูกค้าใหม่</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {newCustomers.map((customer) => (
                <Button
                  key={customer.id}
                  variant="ghost"
                  className="w-full justify-start hover:bg-primary/10"
                  onClick={() => openDetailDialog(customer)}
                >
                  <span className="font-semibold">{customer.name}</span>
                  <span className="ml-2 text-muted-foreground">- สนใจ {customer.interested}</span>
                  <Badge className="ml-auto bg-pink-400 text-white">ใหม่</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📋 รายชื่อลูกค้าทั้งหมด — แบบ “ตาราง + ค้นหา + มอบหมาย” */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-2xl">รายชื่อลูกค้าทั้งหมด</CardTitle>
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาลูกค้า (ชื่อ, เบอร์โทร, อีเมล)"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
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
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetailDialog(c)}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        {c.phone}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {c.email}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Home className="w-3 h-3 text-primary" />
                        {c.propertyType}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        <DollarSign className="w-3 h-3" />
                        {formatCurrency(c.budget)}
                      </div>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>{statusBadge(c.status)}</TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {c.assignedTo ? (
                        <span>{c.assignedTo}</span>
                      ) : (
                        <Select onValueChange={(v) => handleAssign(c.id, v)}>
                          <SelectTrigger className="w-[190px]">
                            <SelectValue placeholder="เลือกพนักงาน" />
                          </SelectTrigger>
                          <SelectContent>
                            {salesTeam.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
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
        </CardContent>
      </Card>

      {/* 🔍 Dialog รายละเอียดลูกค้า (แบบการ์ดสวย ๆ) */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>รายละเอียดลูกค้า</DialogTitle>
            <DialogDescription>ข้อมูลเต็มของลูกค้า</DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                {statusBadge(selectedCustomer.status)}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">อีเมล</p>
                    <p className="font-medium">{selectedCustomer.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">เบอร์โทรศัพท์</p>
                    <p className="font-medium">{selectedCustomer.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">ที่อยู่</p>
                    <p className="font-medium">{selectedCustomer.location}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">สนใจ</p>
                  <p className="font-semibold text-primary">{selectedCustomer.interested}</p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/5 border border-secondary/20">
                  <p className="text-sm text-muted-foreground">งบประมาณ</p>
                  <p className="font-semibold">{formatCurrency(selectedCustomer.budget)}</p>
                </div>
              </div>

              <Button className="w-full" onClick={() => setOpenDetail(false)}>
                ปิด
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
