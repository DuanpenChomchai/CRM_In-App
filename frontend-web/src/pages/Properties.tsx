import { useState } from "react";
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const properties = [
  {
    id: 1,
    name: "บ้านเดี่ยว 2 ชั้น หมู่บ้านสีเขียว",
    type: "บ้านเดี่ยว",
    location: "กรุงเทพฯ",
    address: "123/45 หมู่บ้านสีเขียว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ",
    price: 7500000,
    bedrooms: 4,
    bathrooms: 3,
    size: 250,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    description:
      "บ้านเดี่ยว 2 ชั้นสไตล์โมเดิร์น พื้นที่กว้างขวาง พร้อมสวนหลังบ้านและที่จอดรถ 2 คัน.",
  },
  {
    id: 2,
    name: "คอนโด ใกล้ BTS อโศก",
    type: "คอนโด",
    location: "สุขุมวิท",
    address: "สุขุมวิท 21 เขตวัฒนา กรุงเทพฯ",
    price: 4200000,
    bedrooms: 2,
    bathrooms: 2,
    size: 65,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
    description:
      "คอนโดทำเลทอง ใจกลางสุขุมวิท เดินทางสะดวก ใกล้รถไฟฟ้าและศูนย์การค้า.",
  },
  {
    id: 3,
    name: "ทาวน์เฮ้าส์ 3 ชั้น",
    type: "ทาวน์เฮ้าส์",
    location: "นนทบุรี",
    address: "ถนนรัตนาธิเบศร์ ต.บางกระสอ อ.เมือง จ.นนทบุรี",
    price: 5800000,
    bedrooms: 3,
    bathrooms: 3,
    size: 180,
    status: "reserved",
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80",
    description:
      "ทาวน์เฮ้าส์ 3 ชั้นสไตล์มินิมอล พร้อมเฟอร์นิเจอร์ครบ ทำเลใกล้ MRT.",
  },
];

const formatPrice = (price: number) => (price / 1000000).toFixed(1) + "M ฿";

const statusBadge = (status: string) => {
  switch (status) {
    case "available":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          พร้อมขาย
        </Badge>
      );
    case "reserved":
      return (
        <Badge className="bg-pink-100 text-pink-700 border-pink-200">
          จอง
        </Badge>
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

export default function Properties() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const filtered = properties.filter((p) => {
    const matchType = filterType === "all" || p.type === filterType;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">อสังหาริมทรัพย์</h1>
        <p className="text-muted-foreground mt-1">
          รายการบ้านและคอนโดทั้งหมด
        </p>
      </div>

      {/* 🔍 Filter */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>กรองข้อมูล</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">ค้นหา</label>
              <Input
                placeholder="ชื่อหรือสถานที่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">ประเภท</label>
              <Select value={filterType} onValueChange={setFilterType}>
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
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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
        </CardContent>
      </Card>

      {/* 🏡 Property Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="shadow-card hover:shadow-lg transition">
            <img
              src={p.image}
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

            <CardFooter>
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  setSelected(p);
                  setOpen(true);
                }}
              >
                ดูรายละเอียด
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 🪟 Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
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
                  src={selected.image}
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

              {/* รายละเอียด */}
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

              {/* ที่อยู่ */}
              <div className="p-4 bg-card rounded-lg border">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold mb-1">ที่อยู่</p>
                    <p className="text-muted-foreground leading-relaxed">
                      {selected.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* รายละเอียด */}
              <div className="p-4 bg-card rounded-lg border">
                <p className="font-semibold mb-2">รายละเอียด</p>
                <p className="text-muted-foreground leading-relaxed">
                  {selected.description}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  ปิด
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-400 to-pink-400 text-white hover:opacity-90"
                  onClick={() => {
                    toast.success("ส่งข้อมูลติดต่อสำเร็จ");
                    setOpen(false);
                  }}
                >
                  สนใจติดต่อ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
