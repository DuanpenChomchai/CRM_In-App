import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Users, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  // ข้อมูล Pipeline Overview
  const pipelineStats = [
    { title: "Contacted", value: 24, trend: 12, isUp: true },
    { title: "Negotiation", value: 18, trend: 8, isUp: true },
    { title: "Quotation", value: 12, trend: -5, isUp: false },
    { title: "Closed Deal", value: 8, trend: 15, isUp: true },
  ];

  // ข้อมูลกราฟ Total Deal Value
  const monthlyData = [
    { month: "ม.ค.", value: 1200000 },
    { month: "ก.พ.", value: 1500000 },
    { month: "มี.ค.", value: 1800000 },
    { month: "เม.ย.", value: 2100000 },
    { month: "พ.ค.", value: 1900000 },
    { month: "มิ.ย.", value: 2400000 },
  ];

  const yearlyData = [
    { month: "2020", value: 15000000 },
    { month: "2021", value: 18000000 },
    { month: "2022", value: 22000000 },
    { month: "2023", value: 28000000 },
    { month: "2024", value: 32000000 },
  ];

  // Top 5 Sales Performance
  const topSales = [
    { rank: 1, name: "สมชาย ใจดี", phone: "081-234-5678", total: 2400000 },
    { rank: 2, name: "สมหญิง รักงาน", phone: "082-345-6789", total: 2100000 },
    { rank: 3, name: "ประยุทธ์ ขยัน", phone: "083-456-7890", total: 1850000 },
    { rank: 4, name: "วิไล มานะ", phone: "084-567-8901", total: 1650000 },
    { rank: 5, name: "สุนทร พยายาม", phone: "085-678-9012", total: 1450000 },
  ];

  // ข้อมูลลูกค้าใหม่ vs เก่า
  const customerData = [
    { name: "ลูกค้าใหม่", value: 65, color: "hsl(135, 35%, 55%)" },
    { name: "ลูกค้าเก่า", value: 35, color: "hsl(340, 75%, 75%)" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">แดชบอร์ด</h1>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineStats.map((stat, index) => (
          <Card key={index} className="shadow-card hover:shadow-elegant transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.isUp ? (
                <TrendingUp className="w-4 h-4 text-primary" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className={`flex items-center text-sm ${stat.isUp ? 'text-primary' : 'text-destructive'}`}>
                  {stat.isUp ? '+' : ''}{stat.trend}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Deal Value Chart */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>มูลค่าดีลทั้งหมด</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={period === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("monthly")}
                className={period === "monthly" ? "gradient-primary text-white" : ""}
              >
                รายเดือน
              </Button>
              <Button
                variant={period === "yearly" ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod("yearly")}
                className={period === "yearly" ? "gradient-primary text-white" : ""}
              >
                รายปี
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={period === "monthly" ? monthlyData : yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="value" fill="hsl(135, 35%, 55%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Sales Performance */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>อันดับพนักงานขาย Top 5</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSales.map((sale) => (
                <div
                  key={sale.rank}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                      sale.rank === 1 ? 'gradient-primary' : 'bg-muted-foreground'
                    }`}>
                      {sale.rank}
                    </div>
                    <div>
                      <div className="font-medium">{sale.name}</div>
                      <div className="text-sm text-muted-foreground">{sale.phone}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatCurrency(sale.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Distribution */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>สัดส่วนลูกค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;