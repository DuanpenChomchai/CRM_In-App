import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Save,
  X,
  User,
  Mail,
  Phone,
  Shield,
  Camera,
} from "lucide-react";

// *** นำ Dialog มาใช้เหมือนหน้า UserManagement ***
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string | null;
}

export default function Profile() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // ⭐ เพิ่ม state สำหรับ popup เหมือนหน้า “ลบผู้ใช้”
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"success" | "error">("success");
  const [dialogMsg, setDialogMsg] = useState("");

  // =====================================================
  // LOAD PROFILE
  // =====================================================
  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3000/api/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const u = data.user;

        const mapped: UserProfile = {
          name: u.name,
          email: u.email,
          phone: u.tol || "",
          role: u.role.toUpperCase(),
          avatar: u.img,
        };

        setProfile(mapped);
        setEditedProfile(mapped);
        setPreviewImg(mapped.avatar);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setEditedProfile(profile);
    setPreviewImg(profile?.avatar || null);
    setIsEditing(false);
  };

  // =====================================================
  // SAVE PROFILE + POPUP แบบ dialog
  // =====================================================
  const handleSave = async () => {
    if (!editedProfile) return;
    const token = localStorage.getItem("token");

    const payload = {
      name: editedProfile.name,
      email: editedProfile.email,
      tol: editedProfile.phone,
      img: previewImg,
    };

    const res = await fetch("http://localhost:3000/api/users/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok) {
      setProfile(editedProfile);
      setIsEditing(false);

      // เปิด popup success
      setDialogType("success");
      setDialogMsg("ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว");
      setDialogOpen(true);
    } else {
      setDialogType("error");
      setDialogMsg(data.message || "เกิดข้อผิดพลาดในการบันทึก");
      setDialogOpen(true);
    }
  };

  // =====================================================
  // IMAGE UPLOAD
  // =====================================================
  const handleImageClick = () => isEditing && fileInputRef.current?.click();

  const handleImageChange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewImg(localUrl);

    const reader = new FileReader();
    reader.onload = () => {
      if (editedProfile)
        setEditedProfile({ ...editedProfile, avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (editedProfile) setEditedProfile({ ...editedProfile, [name]: value });
  };

  const getInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const dialogTitle = dialogType === "success" ? "สำเร็จ" : "ข้อผิดพลาด";

  if (loading)
    return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4 max-w-5xl">
        <h1 className="text-4xl font-bold mb-2">โปรไฟล์ผู้ใช้</h1>
        <p className="text-lg text-muted-foreground">
          จัดการข้อมูลส่วนตัวของคุณ
        </p>

        <Card className="shadow-card border-0 overflow-hidden mt-10">
          <CardHeader className="pb-4">
            <div className="flex gap-6">
              {/* ================= IMAGE ================= */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                />

                <div onClick={handleImageClick} className="cursor-pointer">
                  <Avatar className="h-32 w-32 border-4 shadow-xl">
                    <AvatarImage src={previewImg ?? undefined} />
                    <AvatarFallback className="text-3xl">
                      {getInitials(profile!.name)}
                    </AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                      <Camera className="w-10 h-10 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* ================= NAME + ROLE BADGE ================= */}
              <div className="flex-1 pt-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{profile!.name}</h3>

                    {/* 🔥 ROLE BADGE (สีชมพูตามที่ต้องการ) */}
                    <Badge className="mt-2 bg-pink-400 text-white flex items-center gap-1 px-3 py-1">
                      <Shield className="w-4 h-4" />
                      {profile!.role}
                    </Badge>
                  </div>

                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      แก้ไข
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          {/* ================= FORM ================= */}
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>ชื่อ - นามสกุล</Label>
                {isEditing ? (
                  <Input
                    name="name"
                    value={editedProfile!.name}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-lg">
                    {profile!.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>อีเมล</Label>
                {isEditing ? (
                  <Input
                    name="email"
                    value={editedProfile!.email}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-lg">
                    {profile!.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                {isEditing ? (
                  <Input
                    name="phone"
                    value={editedProfile!.phone}
                    onChange={handleChange}
                  />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-lg">
                    {profile!.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" /> ยกเลิก
                </Button>

                <Button className="gradient-primary" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" /> บันทึก
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================
          POPUP SUCCESS 
      ================================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl">
          {/* X Button */}
          <button
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
            onClick={() => setDialogOpen(false)}
          ></button>

          <DialogHeader className="text-center">
            <DialogTitle className="text-green-600 text-2xl font-bold">
              บันทึกข้อมูลสำเร็จ!
            </DialogTitle>

            {/* 🔥 ข้อความ อยู่กลางลงมาพอดี */}
            <DialogDescription className="text-gray-600 text-center mt-33 mb-8 text-base leading-relaxed">
              {dialogMsg}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center mt-4 mb-2">
            <Button
              onClick={() => setDialogOpen(false)}
              className="bg-green-500 hover:bg-green-600 text-white text-base px-6 py-2 rounded-lg shadow-md"
            >
              ตกลง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
