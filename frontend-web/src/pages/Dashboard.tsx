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

import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE 

/* -----------------------------------------------------
   INTERFACES
----------------------------------------------------- */
interface DashboardData {
  totalCustomers: number;
  activeDeals: number;
  closedDeals: number;
  avgDealValue: number;
  topSales: { rank: number; name: string; phone: string; dealCount: number }[];
  topProperties: { rank: number; name: string; price: number; deals: number }[];
  dealChartData: { month: string; value: number }[];
}

/* -----------------------------------------------------
   COMPONENT
----------------------------------------------------- */
const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => {
        console.error(err);
        toast.error("โหลดข้อมูล Dashboard ไม่สำเร็จ");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(v);

  const formatYAxis = (value: number) => `${value}`;

  /* ----- Loading Skeleton ----- */
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-card">
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="shadow-card">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-14 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 text-center text-muted-foreground">
        <p className="text-lg">ไม่สามารถโหลดข้อมูล Dashboard ได้</p>
      </div>
    );
  }

  /* ----- KPI Cards Config ----- */
  const kpis = [
    {
      title: "จำนวนลูกค้าทั้งหมด",
      value: data.totalCustomers.toLocaleString(),
      icon: Users,
      trend: null,
    },
    {
      title: "ดีลที่กำลังดำเนินการ",
      value: data.activeDeals.toLocaleString(),
      icon: Clock,
      trend: null,
    },
    {
      title: "ดีลที่ปิดแล้ว",
      value: data.closedDeals.toLocaleString(),
      icon: CheckCircle,
      trend: null,
    },
    {
      title: "ราคาปิดดีลเฉลี่ย",
      value: formatCurrency(data.avgDealValue),
      icon: DollarSign,
      trend: null,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* HEADER */}
      <h1 className="text-3xl font-bold">แดชบอร์ด</h1>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="shadow-card hover:shadow-elegant transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <Icon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CHART */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>จำนวนดีลที่ปิดรายเดือน</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.dealChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatYAxis} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="จำนวนดีล" fill="#6B9A75" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TOP SALES & TOP PROPERTIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              อันดับพนักงานขาย Top 5
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล</p>
            ) : (
              data.topSales.map((s) => (
                <div
                  key={s.rank}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all"
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
                  <div className="text-right font-bold text-primary">{s.dealCount} ลูกค้า</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="w-5 h-5 mr-2 text-primary" />
              อสังหาฯ ยอดนิยม
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topProperties.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">ยังไม่มีข้อมูล</p>
            ) : (
              data.topProperties.map((p) => (
                <div
                  key={p.rank}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all"
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
                  <div className="text-right font-bold text-primary">{p.deals} รายการ</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
