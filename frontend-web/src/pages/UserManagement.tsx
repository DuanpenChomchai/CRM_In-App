import { useState, useEffect } from "react";
import { UserPlus, Shield, Users, Briefcase, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// ---------- Types ----------
type UserRole = "admin" | "manager" | "sale";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
}

// ---------- Map Role (กันพัง 100%) ----------
const mapRole = (r: string | undefined): UserRole => {
  if (!r) return "sale"; // default กันพัง
  const lower = r.toLowerCase();

  if (lower === "admin") return "admin";
  if (lower === "manager") return "manager";
  if (lower === "sale") return "sale";

  // กัน CUSTOMER หรือ undefined
  return "sale";
};

// ---------- Component ----------
const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "sale" as UserRole,
    phone: "",
    password: "",
  });

  const [editData, setEditData] = useState({
    name: "",
    email: "",
    role: "" as UserRole,
    phone: "",
  });

  // ---------- Load Users (GET) ----------
  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3000/api/users", {
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          const mapped = data.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.tol,
            role: mapRole(u.role),
          }));
          setUsers(mapped);
        }
      })
      .catch(() => toast.error("โหลดข้อมูลผู้ใช้ล้มเหลว"));
  }, []);

  // ---------- Add User (POST) ----------
  const handleAddUser = async () => {
    if (
      !newUser.name ||
      !newUser.email ||
      !newUser.phone ||
      !newUser.password
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (newUser.password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:3000/api/users?role=NOT_CUSTOMER", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          tol: newUser.phone,
          role: newUser.role.toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "เพิ่มผู้ใช้งานล้มเหลว");
        return;
      }

      const formatted = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.tol,
        role: mapRole(data.role),
      };

      setUsers((prev) => [...prev, formatted]);

      toast.success("เพิ่มผู้ใช้งานสำเร็จ");

      setNewUser({
        name: "",
        email: "",
        role: "sale",
        phone: "",
        password: "",
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ---------- Edit User ----------
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:3000/api/users/${editingUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            name: editData.name,
            email: editData.email,
            tol: editData.phone,
            role: editData.role.toUpperCase(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "อัปเดตข้อมูลล้มเหลว");
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: editData.name,
                email: editData.email,
                phone: editData.phone,
                role: editData.role,
              }
            : u
        )
      );

      toast.success("แก้ไขข้อมูลสำเร็จ");
      setIsEditDialogOpen(false);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ---------- Delete User ----------
  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `http://localhost:3000/api/users/${deleteUserId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "ลบผู้ใช้ล้มเหลว");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));

      toast.success("ลบผู้ใช้สำเร็จ");
      setIsDeleteDialogOpen(false);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ---------- Badge UI ----------
  const getRoleBadge = (role: UserRole) => {
    const roleConfig: Record<UserRole, any> = {
      admin: { label: "ผู้ดูแลระบบ", variant: "destructive", icon: Shield },
      manager: { label: "ผู้จัดการ", variant: "default", icon: Briefcase },
      sale: { label: "พนักงานขาย", variant: "secondary", icon: Users },
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
      {/* HEADER */}
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

      {/* SUMMARY CARDS */}
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

      {/* USER TABLE */}
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
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>

                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeleteUserId(user.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

     
      {/* ADD USER DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg w-full rounded-xl">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้งานใหม่</DialogTitle>
            <DialogDescription>
              กรอกข้อมูลผู้ใช้งานใหม่ที่ต้องการเพิ่มเข้าระบบ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* ชื่อ */}
            <div>
              <Label>ชื่อ-นามสกุล</Label>
              <Input
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                placeholder="เช่น สมชาย ใจดี"
              />
            </div>

            {/* อีเมล */}
            <div>
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>

            {/* เบอร์โทร */}
            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={newUser.phone}
                onChange={(e) =>
                  setNewUser({ ...newUser, phone: e.target.value })
                }
                placeholder="081-234-5678"
              />
            </div>

            {/* รหัสผ่าน */}
            <div>
              <Label>รหัสผ่าน</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
              />
            </div>

            {/* บทบาท */}
            <div>
              <Label>บทบาท</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole) =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาทผู้ใช้งาน" />
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

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลผู้ใช้งาน</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>ชื่อ</Label>
              <Input
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label>อีเมล</Label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) =>
                  setEditData({ ...editData, email: e.target.value })
                }
              />
            </div>

            <div>
              <Label>เบอร์โทร</Label>
              <Input
                value={editData.phone}
                onChange={(e) =>
                  setEditData({ ...editData, phone: e.target.value })
                }
              />
            </div>

            <div>
              <Label>บทบาท</Label>
              <Select
                value={editData.role}
                onValueChange={(value: UserRole) =>
                  setEditData({ ...editData, role: value })
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
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleEditUser}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              ลบผู้ใช้แล้วไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              ลบผู้ใช้งาน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
