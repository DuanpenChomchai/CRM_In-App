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
  Search,
  DollarSign,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE || ;

const parseJwt = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

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

type PropertyDb = {
  id: number;
  name: string;
  type: string;
  location: string;
  address?: string | null;
  price: any;
  bedrooms: number;
  bathrooms: number;
  size: number;
  status: string;
  description?: string | null;
  img?: string | null;
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

type PropertyForm = {
  name: string;
  type: PropertyTypeUI;
  location: string;
  address: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  size: string;
  status: PropertyStatusUI;
  description: string;
  imageFile: File | null;
};

const initialForm: PropertyForm = {
  name: "",
  type: "บ้านเดี่ยว",
  location: "",
  address: "",
  price: "",
  bedrooms: "1",
  bathrooms: "1",
  size: "",
  status: "available",
  description: "",
  imageFile: null,
};

export default function Properties() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | PropertyTypeUI>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | PropertyStatusUI>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [items, setItems] = useState<PropertyUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<PropertyUI | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PropertyForm>(initialForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PropertyUI | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [existingImgUrl, setExistingImgUrl] = useState<string>("");

  useEffect(() => {
    if (!form.imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(form.imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.imageFile]);

  const token = getToken();

  const isAdmin = useMemo(() => {
    const decoded = parseJwt(token);
    return decoded?.role === "ADMIN";
  }, [token]);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search.trim()) params.set("q", search.trim());
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`${API_BASE}/api/properties?${params.toString()}`, {
        headers: { ...authHeaders },
      });

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
  }, [page, filterType, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchList();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof PropertyForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value as any }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm((prev) => ({ ...prev, imageFile: f }));
  };

  const openCreate = () => {
    if (!isAdmin) return toast.error("สิทธิ์ไม่พอ (Admin เท่านั้น)");
    setMode("create");
    setEditId(null);
    setForm(initialForm);
    setExistingImgUrl("");
    setFormOpen(true);
  };

  const openEdit = (p: PropertyUI) => {
    if (!isAdmin) return toast.error("สิทธิ์ไม่พอ (Admin เท่านั้น)");
    setMode("edit");
    setEditId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      location: p.location,
      address: p.address,
      price: String(p.price),
      bedrooms: String(p.bedrooms),
      bathrooms: String(p.bathrooms),
      size: String(p.size),
      status: p.status,
      description: p.description,
      imageFile: null,
    });
    setExistingImgUrl(toImgUrl(p.img));
    setFormOpen(true);
  };

  const saveProperty = async () => {
    try {
      if (!form.name.trim() || !form.location.trim() || !form.type) {
        toast.error("กรอก ชื่อ / ทำเล / ประเภท ให้ครบ");
        return;
      }
      const priceNum = Number(form.price);
      if (!priceNum || priceNum <= 0) {
        toast.error("กรอกราคาให้ถูกต้อง");
        return;
      }

      let id = editId;

      if (mode === "create") {
        const res = await fetch(`${API_BASE}/api/properties`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            name: form.name,
            type: form.type,
            location: form.location,
            address: form.address,
            price: Number(form.price) || 0,
            bedrooms: Number(form.bedrooms) || 0,
            bathrooms: Number(form.bathrooms) || 0,
            size: Number(form.size) || 0,
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
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            name: form.name,
            type: form.type,
            location: form.location,
            address: form.address,
            price: Number(form.price) || 0,
            bedrooms: Number(form.bedrooms) || 0,
            bathrooms: Number(form.bathrooms) || 0,
            size: Number(form.size) || 0,
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
          headers: { ...authHeaders },
          body: fd,
        });
        if (!up.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
      }

      toast.success(mode === "create" ? "เพิ่มสำเร็จ" : "แก้ไขสำเร็จ");
      setFormOpen(false);
      setPage(1);
      fetchList();
    } catch (e: any) {
      toast.error(e?.message || "บันทึกไม่สำเร็จ");
    }
  };

  const doDelete = async () => {
    try {
      if (!deleteTarget) return;
      const res = await fetch(`${API_BASE}/api/properties/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      toast.success("ลบสำเร็จ");
      setDeleteOpen(false);
      setPage(1);
      fetchList();
    } catch (e: any) {
      toast.error(e?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Building className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            อสังหาริมทรัพย์
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            จัดการรายการอสังหาริมทรัพย์และห้องชุด
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gradient-primary text-white hover:shadow-lg w-full sm:w-auto h-10 md:h-11">
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มอสังหาฯ
          </Button>
        )}
      </div>

      <Card className="shadow-elegant overflow-hidden">
        <CardHeader className="p-4 md:p-6 bg-muted/20">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            ตัวกรองค้นหา
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">ค้นหาชื่อ/ทำเล</Label>
              <Input
                placeholder="ระบุชื่อหรือทำเล..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ประเภท</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="บ้านเดี่ยว">บ้านเดี่ยว</SelectItem>
                  <SelectItem value="คอนโด">คอนโด</SelectItem>
                  <SelectItem value="ทาวน์เฮ้าส์">ทาวน์เฮ้าส์</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">สถานะการขาย</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="ทุกสถานะ" />
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
          <div className="mt-4 text-xs text-muted-foreground italic">
            พบทั้งหมด {total} รายการ
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Card key={p.id} className="shadow-card hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden group">
            <div className="relative h-48 md:h-56 shrink-0 overflow-hidden">
              <img
                src={toImgUrl(p.img)}
                alt={p.name}
                className="w-full h-full object-cover bg-muted group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=No+Image";
                }}
              />
              <div className="absolute top-3 right-3">{statusBadge(p.status)}</div>
            </div>

            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight">{p.type}</Badge>
              </div>
              <CardTitle className="text-base md:text-lg font-bold line-clamp-1">{p.name}</CardTitle>
            </CardHeader>

            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between space-y-4">
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
                <span className="truncate">{p.location}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2">
                <div className="p-2 rounded-lg bg-muted/30 text-center">
                  <Bed className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-[10px] text-muted-foreground">ห้องนอน</p>
                  <p className="text-xs font-bold">{p.bedrooms}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 text-center">
                  <Bath className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-[10px] text-muted-foreground">ห้องน้ำ</p>
                  <p className="text-xs font-bold">{p.bathrooms}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30 text-center">
                  <Maximize2 className="h-4 w-4 mx-auto text-primary mb-1" />
                  <p className="text-[10px] text-muted-foreground">พื้นที่</p>
                  <p className="text-xs font-bold">{p.size}<span className="text-[8px] ml-0.5">m²</span></p>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-dashed">
                <span className="text-xs text-muted-foreground">ราคาขาย</span>
                <span className="text-xl font-bold text-primary">{formatPrice(p.price)}</span>
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs font-bold"
                onClick={() => { setSelected(p); setDetailOpen(true); }}
              >
                ดูรายละเอียด
              </Button>
              {isAdmin && (
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 md:gap-4 py-8">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="h-9">ก่อนหน้า</Button>
        <span className="text-xs font-bold bg-muted px-4 py-1.5 rounded-full">หน้า {page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="h-9">ถัดไป</Button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl p-0 border-none shadow-2xl">
          {selected && (
            <div className="space-y-0">
              <div className="relative h-64 md:h-96 w-full">
                <img src={toImgUrl(selected.img)} alt={selected.name} className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4">{statusBadge(selected.status)}</div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <Badge className="mb-2 bg-primary/80">{selected.type}</Badge>
                  <h2 className="text-2xl md:text-3xl font-bold">{selected.name}</h2>
                  <p className="flex items-center gap-1 text-sm opacity-90 mt-1"><MapPin className="w-4 h-4" /> {selected.location}</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-muted/30 rounded-xl text-center">
                    <Maximize2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">พื้นที่</p>
                    <p className="text-lg font-bold">{selected.size} ตร.ม.</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl text-center">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">ห้องนอน</p>
                    <p className="text-lg font-bold">{selected.bedrooms} ห้อง</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl text-center">
                    <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">ห้องน้ำ</p>
                    <p className="text-lg font-bold">{selected.bathrooms} ห้อง</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-xl text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">ราคา</p>
                    <p className="text-lg font-bold text-primary">{formatPrice(selected.price)}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-dashed">
                    <h3 className="font-bold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> ที่อยู่</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.address || "ไม่มีข้อมูลที่อยู่โดยละเอียด"}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-dashed">
                    <h3 className="font-bold mb-2 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> รายละเอียดเพิ่มเติม</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.description || "ไม่มีรายละเอียดเพิ่มเติมสำหรับอสังหาริมทรัพย์นี้"}</p>
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                  <Button variant="outline" onClick={() => setDetailOpen(false)} className="w-full sm:w-auto">ปิดหน้าต่าง</Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl md:text-2xl font-bold">{mode === "create" ? "เพิ่มอสังหาริมทรัพย์ใหม่" : "แก้ไขข้อมูลอสังหาริมทรัพย์"}</DialogTitle>
          </DialogHeader>

          <div className="p-4 md:p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-bold">รูปภาพหลัก</Label>
              <div
                className="relative h-48 md:h-64 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/10 transition-colors overflow-hidden group"
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl || existingImgUrl ? (
                  <>
                    <img src={previewUrl || existingImgUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold bg-primary px-4 py-2 rounded-full">เปลี่ยนรูป</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">คลิกเพื่ออัปโหลดรูปภาพ</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-bold">ชื่อโครงการ / ชื่อทรัพย์ *</Label>
                <Input name="name" value={form.name} onChange={handleTextChange} placeholder="ระบุชื่อเรียก..." className="h-10 md:h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">ประเภท *</Label>
                <Select value={form.type} onValueChange={(v) => handleSelectChange("type", v)}>
                  <SelectTrigger className="h-10 md:h-11"><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="บ้านเดี่ยว">บ้านเดี่ยว</SelectItem>
                    <SelectItem value="คอนโด">คอนโด</SelectItem>
                    <SelectItem value="ทาวน์เฮ้าส์">ทาวน์เฮ้าส์</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">สถานะ *</Label>
                <Select value={form.status} onValueChange={(v) => handleSelectChange("status", v)}>
                  <SelectTrigger className="h-10 md:h-11"><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">พร้อมขาย</SelectItem>
                    <SelectItem value="reserved">จอง</SelectItem>
                    <SelectItem value="sold">ขายแล้ว</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">ทำเล *</Label>
                <Input name="location" value={form.location} onChange={handleTextChange} placeholder="ระบุย่าน/ทำเล..." className="h-10 md:h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">ราคาขาย (บาท) *</Label>
                <Input name="price" type="number" value={form.price} onChange={handleTextChange} placeholder="0" className="h-10 md:h-11 font-bold text-primary" />
              </div>
              <div className="grid grid-cols-3 gap-3 md:col-span-2">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">ห้องนอน</Label>
                  <Input name="bedrooms" type="number" value={form.bedrooms} onChange={handleTextChange} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">ห้องน้ำ</Label>
                  <Input name="bathrooms" type="number" value={form.bathrooms} onChange={handleTextChange} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">พื้นที่ (ตร.ม.)</Label>
                  <Input name="size" type="number" value={form.size} onChange={handleTextChange} className="h-10" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-bold">ที่อยู่โดยละเอียด</Label>
                <Input name="address" value={form.address} onChange={handleTextChange} placeholder="ระบุที่อยู่..." className="h-10" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-bold">รายละเอียด</Label>
                <Textarea name="description" value={form.description} onChange={handleTextChange} rows={4} placeholder="ระบุรายละเอียดเพิ่มเติม..." className="resize-none" />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t flex-col sm:flex-row gap-3 bg-muted/10">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="w-full sm:w-auto h-11 order-2 sm:order-1">ยกเลิก</Button>
            <Button onClick={saveProperty} className="w-full sm:w-auto h-11 gradient-primary text-white order-1 sm:order-2 shadow-lg font-bold">
              <Plus className="w-4 h-4 mr-2" />
              {mode === "create" ? "เพิ่มทรัพย์" : "บันทึกการแก้ไข"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl max-w-[90vw] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              ยืนยันการลบทรัพย์
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              คุณแน่ใจหรือไม่ว่าต้องการลบ <span className="font-bold text-foreground">"{deleteTarget?.name}"</span>?
              <br />ข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบออกจากระบบเป็นการถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="w-full sm:w-auto h-10 md:h-11">ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto h-10 md:h-11">ยืนยันการลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
