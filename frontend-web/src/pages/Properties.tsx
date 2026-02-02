import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Building2,
  MapPin,
  Bath,
  Bed,
  Maximize2,
  Building,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** =========================
 * CONFIG
 * ========================= */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  "";

/** =========================
 * Helpers
 * ========================= */
const toImgUrl = (img?: string | null) => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  if (img.startsWith("/")) return `${API_BASE}${img}`;

  return `${API_BASE}/api/properties/img?key=${encodeURIComponent(img)}`;
};

type PropertyStatusUI = "available" | "reserved" | "sold";
type PropertyTypeUI = "บ้านเดี่ยว" | "คอนโด" | "ทาวน์เฮ้าส์";

const typeToUI = (t: any): PropertyTypeUI => {
  if (t === "HOUSE") return "บ้านเดี่ยว";
  if (t === "CONDO") return "คอนโด";
  if (t === "TOWNHOME") return "ทาวน์เฮ้าส์";
  if (t === "บ้านเดี่ยว" || t === "คอนโด" || t === "ทาวน์เฮ้าส์") return t;
  return "บ้านเดี่ยว";
};

const statusToUI = (s: any): PropertyStatusUI => {
  if (s === "AVAILABLE") return "available";
  if (s === "RESERVED") return "reserved";
  if (s === "SOLD") return "sold";
  if (s === "available" || s === "reserved" || s === "sold") return s;
  return "available";
};

const formatPrice = (price: number) => (price / 1_000_000).toFixed(1) + "M ฿";

const statusBadge = (status: PropertyStatusUI) => {
  switch (status) {
    case "available":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          พร้อมขาย
        </Badge>
      );
    case "reserved":
      return (
        <Badge className="bg-pink-100 text-pink-700 border-pink-200">จอง</Badge>
      );
    case "sold":
      return (
        <Badge className="bg-gray-200 text-gray-600 border-gray-300">
          ขายแล้ว
        </Badge>
      );
    default:
      return null;
  }
};

/** =========================
 * Types from Backend
 * ========================= */
type PropertyDb = {
  id: number;
  name: string;
  type: string; // HOUSE/CONDO/TOWNHOME
  location: string;
  address?: string | null;
  price: any; // Decimal from prisma -> may be string
  bedrooms: number;
  bathrooms: number;
  size: number;
  status: string; // AVAILABLE/RESERVED/SOLD
  description?: string | null;
  img?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PropertyUI = {
  id: number;
  name: string;
  type: PropertyTypeUI;
  location: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  status: PropertyStatusUI;
  description: string;
  img?: string | null;
};

const normalizeDbToUI = (p: PropertyDb): PropertyUI => ({
  id: p.id,
  name: p.name,
  type: typeToUI(p.type),
  location: p.location,
  address: (p.address ?? "") as string,
  price: Number(p.price ?? 0),
  bedrooms: Number(p.bedrooms ?? 0),
  bathrooms: Number(p.bathrooms ?? 0),
  size: Number(p.size ?? 0),
  status: statusToUI(p.status),
  description: (p.description ?? "") as string,
  img: p.img ?? null,
});

/** =========================
 * Form
 * ========================= */
type PropertyForm = {
  name: string;
  type: PropertyTypeUI;
  location: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  status: PropertyStatusUI;
  description: string;
  imageFile: File | null; // อัปโหลดเข้า MinIO
};

const initialForm: PropertyForm = {
  name: "",
  type: "บ้านเดี่ยว",
  location: "",
  address: "",
  price: 0,
  bedrooms: 1,
  bathrooms: 1,
  size: 0,
  status: "available",
  description: "",
  imageFile: null,
};

export default function Properties() {
  /** =========================
   * Filters + pagination
   * ========================= */
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | PropertyTypeUI>("all");
  const [filterStatus, setFilterStatus] =
    useState<"all" | PropertyStatusUI>("all");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  /** =========================
   * Data
   * ========================= */
  const [items, setItems] = useState<PropertyUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  /** =========================
   * Dialogs
   * ========================= */
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PropertyUI | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PropertyForm>(initialForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  // ✅ ย้ายมาไว้ใน component (เพราะใช้ form)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (!form.imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(form.imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  const authHeaders = useMemo(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  /** =========================
   * Fetch list (DB + pagination + search)
   * ========================= */
  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("q", search.trim());
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(
        `${API_BASE}/api/properties?${params.toString()}`,
        {
          headers: {
            ...authHeaders,
          },
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "โหลดรายการไม่สำเร็จ");

      const list: PropertyDb[] = json.data || [];
      setItems(list.map(normalizeDbToUI));
      setTotalPages(Number(json.totalPages || 1));
      setTotal(Number(json.total || 0));
    } catch (e: any) {
      toast.error(e?.message || "โหลดอสังหาฯไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchList();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /** =========================
   * Form handlers
   * ========================= */
  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "price" ||
        name === "bedrooms" ||
        name === "bathrooms" ||
        name === "size"
          ? Number(value)
          : value,
    }));
  };

  const handleSelectChange = (name: keyof PropertyForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [name]: value as any,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm((prev) => ({ ...prev, imageFile: f }));
  };

  const openCreate = () => {
    setMode("create");
    setEditId(null);
    setForm(initialForm);
    setFormOpen(true);
  };

  const openEdit = (p: PropertyUI) => {
    setMode("edit");
    setEditId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      location: p.location,
      address: p.address,
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      size: p.size,
      status: p.status,
      description: p.description,
      imageFile: null,
    });
    setFormOpen(true);
  };

  /** =========================
   * Create / Update + Upload image (MinIO)
   * ========================= */
  const saveProperty = async () => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("ไม่มี token (กรุณา login)");
        return;
      }

      if (!form.name.trim() || !form.location.trim() || !form.type) {
        toast.error("กรอก ชื่อ / ทำเล / ประเภท ให้ครบ");
        return;
      }
      if (!form.price || form.price <= 0) {
        toast.error("กรอกราคาให้ถูกต้อง");
        return;
      }

      let id = editId;

      if (mode === "create") {
        const res = await fetch(`${API_BASE}/api/properties`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            name: form.name,
            type: form.type,
            location: form.location,
            address: form.address,
            price: form.price,
            bedrooms: form.bedrooms,
            bathrooms: form.bathrooms,
            size: form.size,
            status: form.status,
            description: form.description,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "สร้างไม่สำเร็จ");
        id = json.id;
      } else {
        if (!editId) throw new Error("ไม่มี id สำหรับแก้ไข");

        const res = await fetch(`${API_BASE}/api/properties/${editId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            name: form.name,
            type: form.type,
            location: form.location,
            address: form.address,
            price: form.price,
            bedrooms: form.bedrooms,
            bathrooms: form.bathrooms,
            size: form.size,
            status: form.status,
            description: form.description,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "แก้ไขไม่สำเร็จ");
      }

      if (id && form.imageFile) {
        const fd = new FormData();
        fd.append("img", form.imageFile);

        const up = await fetch(`${API_BASE}/api/properties/${id}/image`, {
          method: "POST",
          headers: {
            ...authHeaders,
          },
          body: fd,
        });

        const upJson = await up.json();
        if (!up.ok) throw new Error(upJson?.message || "อัปโหลดรูปไม่สำเร็จ");
      }

      toast.success(mode === "create" ? "เพิ่มอสังหาฯสำเร็จ" : "แก้ไขสำเร็จ");
      setFormOpen(false);
      setForm(initialForm);

      setPage(1);
      await fetchList();
    } catch (e: any) {
      toast.error(e?.message || "บันทึกไม่สำเร็จ");
    }
  };

  /** =========================
   * Delete
   * ========================= */
  const confirmDelete = (p: PropertyUI) => {
    setDeleteId(p.id);
    setDeleteName(p.name);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    try {
      if (!deleteId) return;

      const res = await fetch(`${API_BASE}/api/properties/${deleteId}`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "ลบไม่สำเร็จ");

      toast.success("ลบสำเร็จ");
      setDeleteOpen(false);
      setDeleteId(null);
      setDeleteName("");

      setPage(1);
      await fetchList();
    } catch (e: any) {
      toast.error(e?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">อสังหาริมทรัพย์</h1>
          <p className="text-muted-foreground">จัดการรายการอสังหาริมทรัพย์ของคุณ</p>
        </div>
        <Button
          onClick={openCreate}
           className="gradient-primary text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มอสังหาฯ
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>กรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">ค้นหา</label>
              <Input
                placeholder="ชื่อ / ทำเล / ที่อยู่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">ประเภท</label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="บ้านเดี่ยว">บ้านเดี่ยว</SelectItem>
                  <SelectItem value="คอนโด">คอนโด</SelectItem>
                  <SelectItem value="ทาวน์เฮ้าส์">ทาวน์เฮ้าส์</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">สถานะ</label>
              <Select
                value={filterStatus}
                onValueChange={(v) => setFilterStatus(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="available">พร้อมขาย</SelectItem>
                  <SelectItem value="reserved">จอง</SelectItem>
                  <SelectItem value="sold">ขายแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {loading ? "กำลังโหลด..." : `ทั้งหมด ${total} รายการ`}
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Card key={p.id} className="shadow-card hover:shadow-lg transition">
            <img
              src={toImgUrl(p.img)}
              alt={p.name}
              className="w-full h-48 object-cover rounded-t-md"
            />

            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {p.type === "คอนโด" ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Home className="h-4 w-4 text-primary" />
                  )}
                  <Badge variant="outline">{p.type}</Badge>
                </div>
                {statusBadge(p.status)}
              </div>
              <CardTitle className="text-lg font-semibold">{p.name}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1 text-primary" /> {p.location}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-muted/40">
                  <Bed className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">ห้องนอน</p>
                  <p className="font-medium">{p.bedrooms}</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <Bath className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">ห้องน้ำ</p>
                  <p className="font-medium">{p.bathrooms}</p>
                </div>
                <div className="p-2 rounded bg-muted/40">
                  <Maximize2 className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">พื้นที่</p>
                  <p className="font-medium">{p.size} ตร.ม.</p>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ราคา</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(p.price)}
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button
                className="flex-1 gradient-primary text-white hover:opacity-90"
                onClick={() => {
                  setSelected(p);
                  setDetailOpen(true);
                }}
              >
                ดูรายละเอียด
              </Button>

              <Button variant="outline" onClick={() => openEdit(p)} title="แก้ไข">
                <Pencil className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => confirmDelete(p)}
                title="ลบ"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          ก่อนหน้า
        </Button>
        <span className="text-sm text-muted-foreground">
          หน้า {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          ถัดไป
        </Button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selected?.name}
            </DialogTitle>
            <DialogDescription>
              {selected?.type} • {selected?.location}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-6">
              <div className="relative h-80 rounded-xl overflow-hidden">
                <img
                  src={toImgUrl(selected.img)}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4">
                  {statusBadge(selected.status)}
                </div>
              </div>

              <div className="text-center py-4 bg-gradient-to-r from-green-100 to-pink-100 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">ราคา</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-500 to-pink-500 bg-clip-text text-transparent">
                  {formatPrice(selected.price)}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-card rounded-lg border text-center">
                  <Maximize2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">ขนาด</p>
                  <p className="font-bold">{selected.size} ตร.ม.</p>
                </div>
                <div className="p-4 bg-card rounded-lg border text-center">
                  <Home className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">ห้องนอน</p>
                  <p className="font-bold">{selected.bedrooms} ห้อง</p>
                </div>
                <div className="p-4 bg-card rounded-lg border text-center">
                  <Building className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">ห้องน้ำ</p>
                  <p className="font-bold">{selected.bathrooms} ห้อง</p>
                </div>
                <div className="p-4 bg-card rounded-lg border text-center">
                  <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">ประเภท</p>
                  <p className="font-bold">{selected.type}</p>
                </div>
              </div>

              <div className="p-4 bg-card rounded-lg border">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold mb-1">ที่อยู่</p>
                    <p className="text-muted-foreground leading-relaxed">
                      {selected.address || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-card rounded-lg border">
                <p className="font-semibold mb-2">รายละเอียด</p>
                <p className="text-muted-foreground leading-relaxed">
                  {selected.description || "-"}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDetailOpen(false)}
                >
                  ปิด
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    openEdit(selected);
                    setDetailOpen(false);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  แก้ไข
                </Button>

                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    confirmDelete(selected);
                    setDetailOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {mode === "create" ? "เพิ่มอสังหาริมทรัพย์ใหม่" : "แก้ไขอสังหาริมทรัพย์"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "กรอกข้อมูลเพื่อเพิ่มรายการอสังหาฯ ใหม่"
                : "แก้ไขข้อมูลอสังหาฯ ของคุณ"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">ชื่ออสังหาฯ</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleTextChange}
                  placeholder="เช่น คอนโด ใกล้ BTS..."
                />
              </div>

              <div>
                <Label htmlFor="type">ประเภท</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => handleSelectChange("type", v)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="บ้านเดี่ยว">บ้านเดี่ยว</SelectItem>
                    <SelectItem value="คอนโด">คอนโด</SelectItem>
                    <SelectItem value="ทาวน์เฮ้าส์">ทาวน์เฮ้าส์</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">สถานะ</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => handleSelectChange("status", v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">พร้อมขาย</SelectItem>
                    <SelectItem value="reserved">จอง</SelectItem>
                    <SelectItem value="sold">ขายแล้ว</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">ราคา (บาท)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={form.price}
                  onChange={handleTextChange}
                />
              </div>

              <div>
                <Label htmlFor="size">ขนาด (ตร.ม.)</Label>
                <Input
                  id="size"
                  name="size"
                  type="number"
                  value={form.size}
                  onChange={handleTextChange}
                />
              </div>

              <div>
                <Label htmlFor="bedrooms">ห้องนอน</Label>
                <Input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  min={0}
                  value={form.bedrooms}
                  onChange={handleTextChange}
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">ห้องน้ำ</Label>
                <Input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  min={0}
                  value={form.bathrooms}
                  onChange={handleTextChange}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="location">ทำเล (ย่าน)</Label>
                <Input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleTextChange}
                  placeholder="เช่น สุขุมวิท, รัตนาธิเบศร์"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">ที่อยู่ (เต็ม)</Label>
                <Input
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleTextChange}
                  placeholder="123/45 ถนน..."
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="image">แนบรูปภาพ</Label>

                <Input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;

                    const dt = new DataTransfer();
                    dt.items.add(file);
                    const input = fileInputRef.current;
                    if (input) {
                      input.files = dt.files;
                      const evt = new Event("change", { bubbles: true });
                      input.dispatchEvent(evt);
                    }
                  }}
                  className={[
                    "mt-2 rounded-xl border border-dashed p-4",
                    "bg-background/40",
                    "transition-colors",
                    form.imageFile
                      ? "border-emerald-300"
                      : "border-muted-foreground/30 hover:border-emerald-300",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {form.imageFile ? "เลือกไฟล์แล้ว" : "ลากรูปมาวาง หรือกดเลือกไฟล์"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {form.imageFile
                          ? `ไฟล์: ${form.imageFile.name}`
                          : "รองรับ JPG/PNG/WEBP (แนะนำไม่เกิน 5MB)"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        เลือกไฟล์
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={!form.imageFile}
                        onClick={() => {
                          setForm((p) => ({ ...p, imageFile: null }));
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        title="ลบไฟล์"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        ลบไฟล์
                      </Button>
                    </div>
                  </div>

                  {previewUrl && (
                    <div className="mt-3">
                      <div className="rounded-xl overflow-hidden border bg-background">
                        <img
                          src={previewUrl}
                          alt="preview"
                          className="h-48 w-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground mt-2">
                  {form.imageFile ? "พร้อมอัปโหลดเมื่อกดบันทึก" : "ยังไม่ได้เลือกไฟล์"}
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleTextChange}
                  placeholder="อธิบายเกี่ยวกับอสังหาฯ นี้..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={saveProperty}
              className="gradient-primary text-white hover:opacity-90"
            >
              {mode === "create" ? "บันทึก" : "อัปเดต"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              ต้องการลบ <b>{deleteName}</b> ใช่ไหม?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={doDelete}>
              ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
