import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, FileText, Download, List, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

interface QuotationItem {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}


const dummyQuotationDatabase = [
  {
    id: 1,
    quotationNumber: "QT-2025-001",
    customer: { name: "คุณสมศักดิ์ เจริญสุข", email: "somsak@example.com", phone: "081-234-5678", address: "123/45 กทม." },
    items: [
      { id: 101, productName: "Silk Residence", quantity: 1, price: 3500000, discount: 0 }
    ],
  },
  {
    id: 2,
    quotationNumber: "QT-2025-002",
    customer: { name: "คุณวิภา สวยงาม", email: "vipa@example.com", phone: "082-345-6789", address: "567 นนทบุรี" },
    items: [
      { id: 102, productName: "Luxury Villa Paradise", quantity: 1, price: 8500000, discount: 10 }
    ],
  },
  {
    id: 3,
    quotationNumber: "QT-2025-003",
    customer: { name: "คุณประเสริฐ มั่งคั่ง", email: "prasert@example.com", phone: "083-456-7890", address: "890 ปทุมธานี" },
    items: [
      { id: 103, productName: "Modern Townhome", quantity: 1, price: 4200000, discount: 5 }
    ],
  },
];


const Quotation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [quotationNumber, setQuotationNumber] = useState("");

  const [newItem, setNewItem] = useState({
    productName: "",
    quantity: 1,
    price: 0,
    discount: 0,
  });

  const availableProducts = [
    { name: "The Emerald Condo", price: 3500000, discount: 5 },
    { name: "Luxury Villa Paradise", price: 15800000, discount: 10 },
    { name: "Silk Residence", price: 2800000, discount: 0 },
    { name: "Golden House", price: 8900000, discount: 8 },
    { name: "Modern Townhome", price: 4200000, discount: 5 },
    { name: "Sky View Residence", price: 5500000, discount: 12 },
    { name: "Green Valley House", price: 12500000, discount: 15 },
    { name: "Smart Townhouse", price: 3800000, discount: 7 },
  ];

  
  useEffect(() => {
    if (editId) {
      // โหมดแก้ไข: โหลดข้อมูลเดิม
      const dataToEdit = dummyQuotationDatabase.find(q => q.id === Number(editId));
      if (dataToEdit) {
        setQuotationNumber(dataToEdit.quotationNumber);
        setCustomer(dataToEdit.customer);
        setItems(dataToEdit.items);
      } else {
        toast.error("ไม่พบใบเสนอราคาที่ต้องการแก้ไข");
        navigate("/quotationlist");
      }
    } else {
      // โหมดสร้างใหม่: สร้างเลขที่เอกสารอัตโนมัติ
      const generateQuotationNumber = () => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0'); // เดือนเริ่มที่ 0
        const d = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${y}${m}${d}`;
        
        // หมายเหตุ: ในแอปจริง ควรดึงลำดับล่าสุดจากฐานข้อมูล
        // ในตัวอย่างนี้ เราจะใช้จำนวนข้อมูลที่มีอยู่ + 1
        const nextSequence = String(dummyQuotationDatabase.length + 1).padStart(3, '0');
        
        return `QUE-${formattedDate}-${nextSequence}`;
      };

      setQuotationNumber(generateQuotationNumber());
    }
  }, [editId, navigate]);
  

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateItemTotal = (price: number, quantity: number, discount: number) => {
    const subtotal = price * quantity;
    return subtotal - (subtotal * discount / 100);
  };

  const calculateGrandTotal = () => {
    return items.reduce((total, item) => {
      return total + calculateItemTotal(item.price, item.quantity, item.discount);
    }, 0);
  };

  const handleAddItem = () => {
    if (!newItem.productName || newItem.price <= 0) {
      toast.error("กรุณาเลือกสินค้าและระบุราคา");
      return;
    }

    const item: QuotationItem = {
      id: Date.now(),
      ...newItem,
    };

    setItems([...items, item]);
    setNewItem({ productName: "", quantity: 1, price: 0, discount: 0 });
    toast.success("เพิ่มรายการสินค้าแล้ว");
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    toast.success("ลบรายการแล้ว");
  };

  const handleProductSelect = (productName: string) => {
      setNewItem({
        ...newItem,
        productName: productName, // อัปเดตเฉพาะชื่อสินค้า
        price: 0, // รีเซ็ตราคาเป็น 0
        discount: 0, // รีเซ็ตส่วนลดเป็น 0
      });
  };

  const handleGenerateQuotation = () => {
    if (!customer.name || !customer.email || !customer.phone) {
      toast.error("กรุณากรอกข้อมูลลูกค้าให้ครบถ้วน");
      return;
    }
 
    if (!quotationNumber) {
      toast.error("กรุณาระบุเลขที่ใบเสนอราคา");
      return;
    }

    if (items.length === 0) {
      toast.error("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    if (editId) {
      toast.success(`อัปเดตใบเสนอราคา ${quotationNumber} สำเร็จ`);

    } else {
      toast.success(`สร้างใบเสนอราคา ${quotationNumber} สำเร็จ`);
     
    }
    navigate("/quotationlist"); 
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          {editId ? `แก้ไขใบเสนอราคา #${quotationNumber}` : "สร้างใบเสนอราคา"}
        </h1>
        <Button variant="outline" onClick={() => navigate("/quotationlist")}>
          <List className="w-4 h-4 mr-2" />
          ดูรายการทั้งหมด
        </Button>
      </div>

      {/* Customer Information */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>ข้อมูลลูกค้าและเอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
     
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div>
              <Label>เลขที่ใบเสนอราคา *</Label>
              <Input
                value={quotationNumber}
                disabled 
                placeholder="กำลังสร้าง..." 
              />
            </div>
            
            <div>
              <Label>ชื่อลูกค้า *</Label>
              <Input
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="ระบุชื่อลูกค้า"
              />
            </div>
            <div>
              <Label>อีเมล *</Label>
              <Input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label>เบอร์โทรศัพท์ *</Label>
              <Input
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                placeholder="0xx-xxx-xxxx"
              />
            </div>
            <div className="md:col-span-2">
              <Label>ที่อยู่</Label>
              <Input
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                placeholder="ที่อยู่ลูกค้า"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Product */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>เพิ่มรายการสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <Label>สินค้า</Label>
              <Select 
                value={newItem.productName} 
                onValueChange={handleProductSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.name} value={product.name}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>จำนวน</Label>
              <Input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div>
              <Label>ราคา (บาท)</Label>
              <Input
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>ส่วนลด (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newItem.discount}
                onChange={(e) => setNewItem({ ...newItem, discount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <Button 
              onClick={handleAddItem}
              className="gradient-primary text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่ม
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quotation Items */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>รายการสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>ยังไม่มีรายการสินค้า</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-center">จำนวน</TableHead>
                    <TableHead className="text-right">ราคา/หน่วย</TableHead>
                    <TableHead className="text-center">ส่วนลด</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-center">
                        {item.discount > 0 ? (
                          <Badge variant="destructive">{item.discount}%</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(calculateItemTotal(item.price, item.quantity, item.discount))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>ยอดรวมทั้งหมด:</span>
                   
                    <span className="font-bold text-2xl text-primary">
                      {formatCurrency(calculateGrandTotal())}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate("/quotationlist")}>
          ยกเลิก
        </Button>
        
        <Button 
          className="gradient-primary text-white"
          onClick={handleGenerateQuotation}
        >
       
          {editId ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              บันทึกการแก้ไข
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              สร้างใบเสนอราคา
            </>
          )}
        </Button>
      </div>
    
    </div>
  );
};

export default Quotation;