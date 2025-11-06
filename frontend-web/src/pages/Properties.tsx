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
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  {
      id: 4,
      name: "The Emerald Condo",
      type: "คอนโด",
      price: 3500000,
      discount: 5,
      size: 45,
      location: "สุขุมวิท 77, กรุงเทพฯ",
      bedrooms: 2,
      bathrooms: 1,
      description: "คอนโดหรูใจกลางเมือง พร้อมสระว่ายน้ำและฟิตเนส วิวสวยงาม ทำเลดีเยี่ยม ใกล้ BTS",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
      status: "available",
    },
    {
      id: 5,
      name: "Luxury Villa Paradise",
      type: "บ้านเดี่ยว",
      price: 15800000,
      discount: 10,
      size: 250,
      location: "บางนา-ตราด กม.12",
      bedrooms: 4,
      bathrooms: 3,
      description: "บ้านเดี่ยวหรูหรา 2 ชั้น พร้อมสวนส่วนตัว จอดรถได้ 3 คัน ออกแบบโดยสถาปนิกชั้นนำ",
      image: "https://i.pinimg.com/originals/e2/f6/f0/e2f6f0e0f6db2ac806ef4a55ee4192bc.png",
      status: "available",
    },
    {
      id: 6,
      name: "Silk Residence",
      type: "คอนโด",
      price: 2800000,
      discount: 0,
      size: 32,
      location: "รามอินทรา กม.8",
      bedrooms: 1,
      bathrooms: 1,
      description: "คอนโดใหม่ใจกลางรามอินทรา ราคาสบายกระเป๋า ใกล้ห้างสรรพสินค้า โรงพยาบาล",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      status: "available",
    },
    {
      id: 7,
      name: "Golden House",
      type: "บ้านเดี่ยว",
      price: 8900000,
      discount: 8,
      size: 180,
      location: "ปิ่นเกล้า-พุทธมณฑล",
      bedrooms: 3,
      bathrooms: 2,
      description: "บ้านเดี่ยวสไตล์โมเดิร์น พร้อมลานจอดรถกว้างขวาง สวนหน้าบ้านสวยงาม",
      image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
      status: "available",
    },
    {
      id: 8,
      name: "Modern Townhome",
      type: "ทาวน์เฮ้าส์",
      price: 4200000,
      discount: 5,
      size: 120,
      location: "รังสิต-นครนายก กม.5",
      bedrooms: 3,
      bathrooms: 2,
      description: "ทาวน์เฮ้าส์ 3 ชั้น ออกแบบทันสมัย พื้นที่ใช้สอยเยอะ ใกล้โรงเรียนนานาชาติ",
      image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      status: "available",
    },
    {
      id: 9,
      name: "Sky View Residence",
      type: "คอนโด",
      price: 5500000,
      discount: 12,
      size: 65,
      location: "ลาดพร้าว 101",
      bedrooms: 2,
      bathrooms: 2,
      description: "คอนโดหรู วิวเมืองสวยงาม ตกแต่งครบพร้อมอยู่ ระบบรักษาความปลอดภัยดีเยี่ยม",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      status: "reserved",
    },
    {
      id: 10,
      name: "Green Valley House",
      type: "บ้านเดี่ยว",
      price: 12500000,
      discount: 15,
      size: 220,
      location: "เชียงใหม่ ดอยสะเก็ด",
      bedrooms: 4,
      bathrooms: 3,
      description: "บ้านเดี่ยวท่ามกลางธรรมชาติ วิวภูเขา อากาศดี เหมาะสำหรับครอบครัว",
      image: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800",
      status: "available",
    },
    {
      id: 11,
      name: "Smart Townhouse",
      type: "ทาวน์เฮ้าส์",
      price: 3800000,
      discount: 7,
      size: 100,
      location: "ถนนกาญจนาภิเษก",
      bedrooms: 2,
      bathrooms: 2,
      description: "ทาวน์เฮ้าส์สมาร์ทโฮม ระบบอัตโนมัติ ประหยัดพลังงาน เข้า-ออกสะดวก",
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      status: "available",
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

const initialNewPropertyState = {
  name: "",
  type: "บ้านเดี่ยว",
  location: "",
  address: "",
  price: 0,
  bedrooms: 1,
  bathrooms: 1,
  size: 0,
  status: "available",
  image: "",
  description: "",
  discount: 0,
};

export default function Properties() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProperty, setNewProperty] = useState(initialNewPropertyState);

  const filtered = properties.filter((p) => {
    const matchType = filterType === "all" || p.type === filterType;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProperty((prev) => ({
      ...prev,
      [name]: name === 'price' || name === 'bedrooms' || name === 'bathrooms' || name === 'size' || name === 'discount' 
               ? Number(value) 
               : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewProperty((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProperty = () => {
    toast.success(`เพิ่ม ${newProperty.name} สำเร็จ!`);
    setIsAddModalOpen(false);
    setNewProperty(initialNewPropertyState);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">อสังหาริมทรัพย์</h1>
          <p className="text-muted-foreground mt-1">
            รายการบ้านและคอนโดทั้งหมด
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          เพิ่มอสังหาฯ
        </Button>
      </div>
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
                      {selected.address}
                    </p>
                  </div>
                </div>
              </div>

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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              เพิ่มอสังหาริมทรัพย์ใหม่
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">ชื่ออสังหาฯ</Label>
                <Input id="name" name="name" value={newProperty.name} onChange={handleInputChange} placeholder="เช่น คอนโด ใกล้ BTS..." />
              </div>
              
              <div>
                <Label htmlFor="type">ประเภท</Label>
                <Select name="type" value={newProperty.type} onValueChange={(value) => handleSelectChange('type', value)}>
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
                <Select name="status" value={newProperty.status} onValueChange={(value) => handleSelectChange('status', value)}>
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
                <Input id="price" name="price" type="number" value={newProperty.price} onChange={handleInputChange} />
              </div>

              <div>
                <Label htmlFor="size">ขนาด (ตร.ม.)</Label>
                <Input id="size" name="size" type="number" value={newProperty.size} onChange={handleInputChange} />
              </div>

              <div>
                <Label htmlFor="bedrooms">ห้องนอน</Label>
                <Input id="bedrooms" name="bedrooms" type="number" min="0" value={newProperty.bedrooms} onChange={handleInputChange} />
              </div>

              <div>
                <Label htmlFor="bathrooms">ห้องน้ำ</Label>
                <Input id="bathrooms" name="bathrooms" type="number" min="0" value={newProperty.bathrooms} onChange={handleInputChange} />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="location">ทำเล (ย่าน)</Label>
                <Input id="location" name="location" value={newProperty.location} onChange={handleInputChange} placeholder="เช่น สุขุมวิท, รัตนาธิเบศร์" />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">ที่อยู่ (เต็ม)</Label>
                <Input id="address" name="address" value={newProperty.address} onChange={handleInputChange} placeholder="123/45 ถนน..." />
              </div>

     
              <div className="md:col-span-2">
                <Label htmlFor="image">แนบรูปภาพ</Label>
                <Input id="image" name="image" type="file" onChange={handleInputChange} />
              </div>
              

              <div className="md:col-span-2">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea id="description" name="description" value={newProperty.description} onChange={handleInputChange} placeholder="อธิบายเกี่ยวกับอสังหาฯ นี้..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSaveProperty} className="bg-green-600 hover:bg-green-700 text-white">
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};