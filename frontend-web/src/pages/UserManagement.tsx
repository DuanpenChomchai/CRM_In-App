import { useState } from "react";
import { UserPlus, Shield, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type UserRole = "admin" | "manager" | "sale";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  password?: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "สมชาย ใจดี",
      email: "somchai@company.com",
      role: "admin",
      phone: "081-234-5678",
    },
    {
      id: 2,
      name: "สมหญิง รักสวย",
      email: "somying@company.com",
      role: "manager",
      phone: "082-345-6789",
    },
    {
      id: 3,
      name: "ประยุทธ์ ขยัน",
      email: "prayut@company.com",
      role: "sale",
      phone: "083-456-7890",
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "sale" as UserRole,
    phone: "",
    password: "",
  });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    const user: User = {
      id: users.length + 1,
      ...newUser,
    };

    setUsers([...users, user]);
    setNewUser({ name: "", email: "", role: "sale", phone: "", password: "" });
    setIsAddDialogOpen(false);
    toast.success("เพิ่มผู้ใช้งานสำเร็จ");
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { label: "ผู้ดูแลระบบ", variant: "destructive" as const, icon: Shield },
      manager: { label: "ผู้จัดการ", variant: "default" as const, icon: Briefcase },
      sale: { label: "พนักงานขาย", variant: "secondary" as const, icon: Users },
    };

    const config = roleConfig[role];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">จัดการผู้ใช้งาน</h1>
          <p className="text-muted-foreground mt-1">
            เพิ่มและจัดการผู้ใช้งานในระบบ
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          เพิ่มผู้ใช้งาน
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ผู้ดูแลระบบ</CardTitle>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "admin").length}
            </div>
            <p className="text-xs text-muted-foreground">คน</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ผู้จัดการ</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "manager").length}
            </div>
            <p className="text-xs text-muted-foreground">คน</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">พนักงานขาย</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "sale").length}
            </div>
            <p className="text-xs text-muted-foreground">คน</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้งาน</CardTitle>
          <CardDescription>จัดการข้อมูลผู้ใช้งานทั้งหมดในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>บทบาท</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้งานใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลผู้ใช้งานใหม่ที่ต้องการเพิ่มเข้าระบบ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>ชื่อ-นามสกุล</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="เช่น สมชาย ใจดี"
              />
            </div>

            <div>
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="081-234-5678"
              />
            </div>

            <div>
              <Label>รหัสผ่าน</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
              />
            </div>

            <div>
              <Label>บทบาท</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole) =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">พนักงานขาย</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleAddUser}>เพิ่มผู้ใช้งาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;