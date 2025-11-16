import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Home,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { Button } from "@/components/ui/button";

// Import สำหรับ Dropdown
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* -----------------------------------------------------
   INTERFACES
----------------------------------------------------- */
interface Kpi {
  title: string;
  value: number;
  trend: number;
  isUp: boolean;
  icon: React.ElementType;
  format: "number" | "currency";
}

interface ChartData {
  month: string;
  value: number;
}

interface Sale {
  rank: number;
  name: string;
  phone: string;
  total: number;
  dealCount: number;
}

interface Property {
  rank: number;
  name: string;
  price: number;
  deals: number;
}

interface YearData {
  topKpis: Kpi[];
  dealChartData: ChartData[];
  topSales: Sale[];
  topProperties: Property[];
}

/* -----------------------------------------------------
   MOCK DATA (ทุกอย่างของเธอเหมือนเดิม)
----------------------------------------------------- */
const dashboardData: Record<string, YearData> = {
  "2024": {
    topKpis: [
      {
        title: "จำนวนลูกค้าทั้งหมด",
        value: 856,
        trend: 10,
        isUp: true,
        icon: Users,
        format: "number",
      },
      {
        title: "ดีลที่กำลังดีลอยู่",
        value: 100,
        trend: 22,
        isUp: true,
        icon: Clock,
        format: "number",
      },
      {
        title: "ดีลที่ปิดไป",
        value: 200,
        trend: 48,
        isUp: true,
        icon: CheckCircle,
        format: "number",
      },
      {
        title: "ราคาปิดดีลเฉลี่ย",
        value: 1953000,
        trend: -7,
        isUp: false,
        icon: DollarSign,
        format: "currency",
      },
    ],

    dealChartData: [
      { month: "ม.ค.", value: 1.2 },
      { month: "ก.พ.", value: 1.5 },
      { month: "มี.ค.", value: 1.8 },
      { month: "เม.ย.", value: 2.1 },
      { month: "พ.ค.", value: 1.9 },
      { month: "มิ.ย.", value: 2.4 },
      { month: "ก.ค.", value: 2.2 },
      { month: "ส.ค.", value: 2.8 },
      { month: "ก.ย.", value: 2.5 },
      { month: "ต.ค.", value: 3.0 },
      { month: "พ.ย.", value: 3.1 },
      { month: "ธ.ค.", value: 3.5 },
    ],

    topSales: [
      { rank: 1, name: "สมชาย ใจดี", phone: "081-234-5678", total: 2400000, dealCount: 8 },
      { rank: 2, name: "สมหญิง รักงาน", phone: "082-345-6789", total: 2100000, dealCount: 7 },
      { rank: 3, name: "ประยุทธ์ ขยัน", phone: "083-456-7890", total: 1850000, dealCount: 6 },
      { rank: 4, name: "วิไล มานะ", phone: "084-567-8901", total: 1650000, dealCount: 5 },
      { rank: 5, name: "สุนทร พยายาม", phone: "085-678-9012", total: 1450000, dealCount: 4 },
    ],

    topProperties: [
      { rank: 1, name: "Sky View Residence", price: 7500000, deals: 5 },
      { rank: 2, name: "Golden House", price: 4200000, deals: 3 },
      { rank: 3, name: "Luxury Villa Paradise", price: 5800000, deals: 3 },
      { rank: 4, name: "ทาวน์เฮ้าส์ 3 ชั้น", price: 2500000, deals: 2 },
      { rank: 5, name: "The Emerald Condo", price: 8900000, deals: 1 },
    ],
  },

  "2023": {
    topKpis: [
      {
        title: "จำนวนลูกค้าทั้งหมด",
        value: 750,
        trend: 8,
        isUp: true,
        icon: Users,
        format: "number",
      },
      {
        title: "ดีลที่กำลังดีลอยู่",
        value: 80,
        trend: 15,
        isUp: true,
        icon: Clock,
        format: "number",
      },
      {
        title: "ดีลที่ปิดไป (ปีนี้)",
        value: 180,
        trend: 40,
        isUp: true,
        icon: CheckCircle,
        format: "number",
      },
      {
        title: "ราคาปิดดีลเฉลี่ย",
        value: 1750000,
        trend: -2,
        isUp: false,
        icon: DollarSign,
        format: "currency",
      },
    ],

    dealChartData: [
      { month: "ม.ค.", value: 1.0 },
      { month: "ก.พ.", value: 1.1 },
      { month: "มี.ค.", value: 1.4 },
      { month: "เม.ย.", value: 1.8 },
      { month: "พ.ค.", value: 1.7 },
      { month: "มิ.ย.", value: 2.0 },
      { month: "ก.ค.", value: 2.1 },
      { month: "ส.ค.", value: 2.5 },
      { month: "ก.ย.", value: 2.3 },
      { month: "ต.ค.", value: 2.8 },
      { month: "พ.ย.", value: 2.9 },
      { month: "ธ.ค.", value: 3.0 },
    ],

    topSales: [
      { rank: 1, name: "สมหญิง รักงาน", phone: "082-345-6789", total: 2200000, dealCount: 9 },
      { rank: 2, name: "สมชาย ใจดี", phone: "081-234-5678", total: 2000000, dealCount: 7 },
      { rank: 3, name: "วิไล มานะ", phone: "084-567-8901", total: 1950000, dealCount: 6 },
      { rank: 4, name: "ประยุทธ์ ขยัน", phone: "083-456-7890", total: 1500000, dealCount: 5 },
      { rank: 5, name: "สุนทร พยายาม", phone: "085-678-9012", total: 1300000, dealCount: 4 },
    ],

    topProperties: [
      { rank: 1, name: "Luxury Villa Paradise", price: 5800000, deals: 4 },
      { rank: 2, name: "The Emerald Condo", price: 8900000, deals: 3 },
      { rank: 3, name: "Sky View Residence", price: 7500000, deals: 2 },
      { rank: 4, name: "Golden House", price: 4200000, deals: 2 },
      { rank: 5, name: "บ้านแฝด สไตล์มินิมอล", price: 3800000, deals: 1 },
    ],
  },
};

/* -----------------------------------------------------
   COMPONENT หลัก (useState ถูกที่แล้ว)
----------------------------------------------------- */
const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState("2024");

  const currentData = dashboardData[selectedYear];

  // ดึงข้อมูล user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:3000/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch((err) => console.error(err));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(v);

  const formatYAxis = (value: number) => `${value}M`;

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">แดชบอร์ด</h1>

        <div className="w-[120px]">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกปี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">ปี 2024</SelectItem>
              <SelectItem value="2023">ปี 2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentData.topKpis.map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.isUp ? TrendingUp : TrendingDown;
          const trendColor = kpi.isUp ? "text-green-500" : "text-red-500";

          const displayValue =
            kpi.format === "currency"
              ? formatCurrency(kpi.value)
              : kpi.value.toLocaleString();

          return (
            <Card key={kpi.title} className="shadow-card hover:shadow-elegant transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <Icon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>

              <CardContent>
                <div className="text-3xl font-bold">{displayValue}</div>
                <div className={`flex items-center text-sm ${trendColor} mt-1`}>
                  <TrendIcon className="w-4 h-4 mr-1" />
                  {kpi.isUp ? "+" : ""}
                  {kpi.trend}%
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CHART */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>มูลค่าดีลทั้งหมด (ล้านบาท)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentData.dealChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatYAxis} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#6B9A75" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TOP SALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              อันดับพนักงานขาย Top 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentData.topSales.map((s) => (
              <div
                key={s.rank}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold bg-primary">
                    {s.rank}
                  </div>
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.phone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    {formatCurrency(s.total)}
                  </div>
                  <div className="text-sm text-muted-foreground">{s.dealCount} ดีล</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* TOP PROPERTIES */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="w-5 h-5 mr-2 text-primary" />
              อสังหาฯ ที่ขายดีที่สุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentData.topProperties.map((p) => (
              <div
                key={p.rank}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold bg-primary">
                    {p.rank}
                  </div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ราคา: {formatCurrency(p.price)}
                    </div>
                  </div>
                </div>
                <div className="text-right font-bold text-primary">
                  {p.deals} ดีล
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
