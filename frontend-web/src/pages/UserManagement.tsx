import { useState, useEffect } from "react";
import { UserPlus, Shield, Users, Briefcase, Edit, Trash2, UserX } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

const API_BASE = import.meta.env.VITE_API_BASE 

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

// ---------- Team Types ----------
interface SaleUser {
  id: number;
  name: string;
  email: string;
  tol?: string;
  img?: string | null;
  role: string;
}

interface ManagerTeam {
  id: number;
  name: string;
  email: string;
  tol?: string;
  img?: string | null;
  role: string;
  team: SaleUser[];
}

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

  // ---------- Team Management State ----------
  const [managers, setManagers] = useState<ManagerTeam[]>([]);
  const [unassignedSales, setUnassignedSales] = useState<SaleUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchTeams = async () => {
    setTeamLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/managers-with-teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("โหลดทีมไม่สำเร็จ");
      const data = await res.json();
      setManagers(data.managers || []);
      setUnassignedSales(data.unassignedSales || []);
    } catch {
      toast.error("โหลดข้อมูลทีมไม่สำเร็จ");
    } finally {
      setTeamLoading(false);
    }
  };

  const handleAssignManager = async (saleId: number, managerId: number | null) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/sales/${saleId}/assign-manager`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ managerId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message || "กำหนดผู้จัดการไม่สำเร็จ");
        return;
      }
      toast.success(managerId ? "เพิ่มเซลล์เข้าทีมสำเร็จ" : "นำเซลล์ออกจากทีมสำเร็จ");
      fetchTeams();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // ---------- Load Users (GET) ----------
  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE}/api/users`, {
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

  useEffect(() => {
    fetchTeams();
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

      const res = await fetch(`${API_BASE}/api/users?role=NOT_CUSTOMER`, {
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
        `${API_BASE}/api/users/${editingUser.id}`,
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
        `${API_BASE}/api/users/${deleteUserId}`,
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
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 gradient-primary text-white hover:opacity-90">
          <UserPlus className="h-4 w-4 " />
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

      {/* TABS: รายชื่อผู้ใช้ / จัดทีม */}
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            รายชื่อผู้ใช้งาน
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Briefcase className="h-4 w-4" />
            จัดทีม Manager
          </TabsTrigger>
        </TabsList>

        {/* TAB: รายชื่อผู้ใช้งาน */}
        <TabsContent value="users">
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
        </TabsContent>

        {/* TAB: จัดทีม Manager */}
        <TabsContent value="teams">
          <div className="space-y-6">
            {/* เซลล์ยังไม่มีทีม */}
            {unassignedSales.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-800 shadow-sm overflow-hidden border-l-4">
                <CardHeader className="pb-3 bg-orange-50/30">
                  <div className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-base text-orange-800 dark:text-orange-400 font-bold">
                      พนักงานขายที่ยังไม่มีทีม ({unassignedSales.length} คน)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">เซลล์เหล่านี้ยังไม่ถูกจัดสรรให้ผู้จัดการคนใด</CardDescription>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="space-y-3">
                    {unassignedSales.map((sale) => (
                      <div key={sale.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-xl bg-orange-50/50 border border-orange-100 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-sm font-bold text-orange-800">
                            {sale.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm md:text-base truncate">{sale.name}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground truncate">{sale.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/60 p-1.5 px-3 rounded-lg border border-orange-200 w-full sm:w-auto overflow-hidden">
                          <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tighter whitespace-nowrap">มอบหมายให้:</span>
                          <Select onValueChange={(val) => handleAssignManager(sale.id, Number(val))}>
                            <SelectTrigger className="flex-1 sm:w-[150px] h-8 text-[11px] border-none bg-transparent shadow-none focus:ring-0">
                              <SelectValue placeholder="เลือก Manager" />
                            </SelectTrigger>
                            <SelectContent className="max-w-[200px]">
                              {managers.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manager Cards พร้อมทีม */}
            {teamLoading ? (
              <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
            ) : managers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>ยังไม่มีผู้จัดการในระบบ</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {managers.map((manager) => (
                  <Card key={manager.id} className="shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {manager.name.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{manager.name}</CardTitle>
                          <CardDescription className="text-xs">{manager.email}</CardDescription>
                        </div>
                        <Badge variant="default" className="ml-auto gap-1">
                          <Briefcase className="h-3 w-3" />
                          ผู้จัดการ
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            ทีมพนักงานขาย ({manager.team.length} คน)
                          </span>
                          {/* เพิ่มเซลล์เข้าทีม */}
                          {unassignedSales.length > 0 && (
                            <Select onValueChange={(val) => handleAssignManager(Number(val), manager.id)}>
                              <SelectTrigger className="w-[140px] h-7 text-xs">
                                <SelectValue placeholder="+ เพิ่มเซลล์" />
                              </SelectTrigger>
                              <SelectContent>
                                {unassignedSales.map((s) => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {manager.team.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-xs border-2 border-dashed rounded-lg">
                            ยังไม่มีพนักงานขายในทีม
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {manager.team.map((sale) => (
                              <div key={sale.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">
                                    {sale.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium">{sale.name}</div>
                                    <div className="text-xs text-muted-foreground">{sale.email}</div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="นำออกจากทีม"
                                  onClick={() => handleAssignManager(sale.id, null)}
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ADD USER DIALOG */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg w-full rounded-xl ">
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
            <Button onClick={handleAddUser} className="gradient-primary text-white hover:opacity-90">
              เพิ่มผู้ใช้งาน
            </Button>
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
