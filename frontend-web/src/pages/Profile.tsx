import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil,
  Save,
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Shield,
} from "lucide-react";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  tol: string;
  img?: string | null;
  role: string;
}

export default function Profile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  /** โหลดโปรไฟล์จาก backend */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:3000/api/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.user);
        setEditedProfile(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedProfile) return;

    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:3000/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editedProfile),
    });

    const data = await res.json();

    if (res.ok) {
      setProfile(data.user);
      setEditedProfile(data.user);
      setIsEditing(false);

      toast({
        title: "บันทึกสำเร็จ ✓",
        description: "ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว",
      });
    } else {
      toast({
        title: "บันทึกไม่สำเร็จ",
        description: data.message,
        variant: "destructive",
      });
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (!editedProfile) return;
    setEditedProfile({ ...editedProfile, [name]: value });
  };

  const getInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  if (!profile) return <div>ไม่พบข้อมูลผู้ใช้</div>;

  return (
    <div className="min-h-screen gradient-soft py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">

        <div className="relative rounded-3xl gradient-primary p-10 text-white shadow-elegant">
          <h1 className="text-4xl font-bold">โปรไฟล์ผู้ใช้</h1>
          <p className="opacity-90 mt-2">
            จัดการข้อมูลส่วนตัวของคุณ
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="max-w-lg mx-auto grid grid-cols-2 rounded-xl bg-white/70 backdrop-blur-sm shadow-card">
            <TabsTrigger value="profile">ข้อมูลส่วนตัว</TabsTrigger>
            <TabsTrigger value="settings">การตั้งค่า</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile">
            <Card className="shadow-elegant border-0 overflow-hidden">

              {/* Header Banner */}
              <div className="h-36 gradient-primary"></div>

              <CardHeader className="-mt-16 flex items-center gap-6">
                <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                  <AvatarImage src={profile.img || ""} />
                  <AvatarFallback className="gradient-primary text-white text-3xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 pt-12">
                  <h2 className="text-2xl font-bold">{profile.name}</h2>
                  <div className="flex gap-2 mt-1">
                    <Badge>
                      <Briefcase className="w-3 h-3 mr-1" />
                      {profile.role}
                    </Badge>
                  </div>
                </div>

                {!isEditing && (
                  <Button variant="outline" onClick={handleEdit}>
                    <Pencil className="w-4 h-4 mr-2" /> แก้ไข
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* Name */}
                <Field label="ชื่อ-นามสกุล" icon={<User />}>
                  {isEditing ? (
                    <Input
                      name="name"
                      value={editedProfile?.name}
                      onChange={handleChange}
                    />
                  ) : (
                    profile.name
                  )}
                </Field>

                {/* Email */}
                <Field label="อีเมล" icon={<Mail />}>
                  {isEditing ? (
                    <Input
                      name="email"
                      value={editedProfile?.email}
                      onChange={handleChange}
                      type="email"
                    />
                  ) : (
                    profile.email
                  )}
                </Field>

                {/* Phone */}
                <Field label="เบอร์โทรศัพท์" icon={<Phone />}>
                  {isEditing ? (
                    <Input
                      name="tol"
                      value={editedProfile?.tol}
                      onChange={handleChange}
                    />
                  ) : (
                    profile.tol
                  )}
                </Field>

                {/* Save Buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-1" /> ยกเลิก
                    </Button>
                    <Button className="gradient-primary" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" /> บันทึก
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings">
            <Card className="shadow-card p-6">
              <CardTitle className="mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> ตั้งค่าความปลอดภัย
              </CardTitle>

              <p className="text-muted-foreground">🚧 ฟีเจอร์นี้กำลังพัฒนา</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* Field Component */
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: any;
  children: any;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {label}
      </Label>
      <div className="px-4 py-3 rounded-lg bg-white/50 backdrop-blur border shadow-sm">
        {children}
      </div>
    </div>
  );
}
