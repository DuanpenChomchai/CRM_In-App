import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, Shield, Camera } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string | null; // URL สำหรับโชว์รูป
}

export default function Profile() {
  const API_HOST =
    (import.meta as any)?.env?.VITE_API_HOST ||
    (import.meta as any)?.env?.VITE_API_BASE_URL ||
    "http://localhost:3000";

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [uploadingImg, setUploadingImg] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"success" | "error">("success");
  const [dialogMsg, setDialogMsg] = useState("");

  const dialogTitle = dialogType === "success" ? "สำเร็จ" : "ข้อผิดพลาด";

  // ✅ ใช้ backend proxy แทน minio ตรง ๆ เพื่อไม่ติด CORS
  // backend จะรับ token จาก query ?t=... (เพราะ <img> ส่ง Authorization header ไม่ได้)
  const buildImageFromBackend = useMemo(() => {
    return (userId: number, token: string, bust?: string) => {
      const b = bust || Date.now().toString();
      return `${API_HOST}/api/users/profile-image/${userId}?t=${encodeURIComponent(
        token
      )}&b=${encodeURIComponent(b)}`;
    };
  }, [API_HOST]);

  // =====================================================
  // LOAD PROFILE
  // =====================================================
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_HOST}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "โหลดโปรไฟล์ไม่สำเร็จ");
        return data;
      })
      .then((data) => {
        const u = data.user;

        const mapped: UserProfile = {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.tol || "",
          role: String(u.role || "").toUpperCase(),
          avatar: null,
        };

        // ✅ ให้ใช้ URL รูปผ่าน backend proxy เสมอ
        const imgUrl = buildImageFromBackend(mapped.id, token);

        setProfile({ ...mapped, avatar: imgUrl });
        setEditedProfile({ ...mapped, avatar: imgUrl });
        setAvatarUrl(imgUrl);
        setPreviewImg(imgUrl);

        console.log("PROFILE user.id:", mapped.id);
        console.log("PROFILE image url:", imgUrl);
      })
      .catch((err: any) => {
        console.error("load profile error:", err);
        setDialogType("error");
        setDialogMsg(err.message || "โหลดโปรไฟล์ล้มเหลว");
        setDialogOpen(true);
      })
      .finally(() => setLoading(false));
  }, [API_HOST, buildImageFromBackend]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setEditedProfile(profile);
    setAvatarUrl(profile?.avatar ?? null);
    setPreviewImg(profile?.avatar ?? null);
    setIsEditing(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================
  const handleSave = async () => {
    if (!editedProfile) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = {
      name: editedProfile.name,
      email: editedProfile.email,
      tol: editedProfile.phone,
    };

    try {
      const res = await fetch(`${API_HOST}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "เกิดข้อผิดพลาดในการบันทึก");
      }

      // ✅ เก็บรูปเดิมไว้
      const updated: UserProfile = {
        ...editedProfile,
        avatar: avatarUrl ?? editedProfile.avatar ?? null,
      };

      setProfile(updated);
      setEditedProfile(updated);
      setIsEditing(false);

      setDialogType("success");
      setDialogMsg("ข้อมูลโปรไฟล์ของคุณได้รับการอัปเดตแล้ว");
      setDialogOpen(true);
    } catch (err: any) {
      console.error("save profile error:", err);
      setDialogType("error");
      setDialogMsg(err.message || "เกิดข้อผิดพลาดในการบันทึก");
      setDialogOpen(true);
    }
  };

  // =====================================================
  // IMAGE UPLOAD
  // =====================================================
  const handleImageClick = () => isEditing && fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("token");
    if (!token) return;
    if (!editedProfile) return;

    // preview local ก่อน (ให้ผู้ใช้เห็นทันที)
    const localUrl = URL.createObjectURL(file);
    setPreviewImg(localUrl);

    try {
      setUploadingImg(true);

      const formData = new FormData();
      // ✅ backend ใช้ upload.single("img") ต้องส่ง key = "img"
      formData.append("img", file);

      // ✅ route สำหรับ Web CRM
      const res = await fetch(`${API_HOST}/api/users/profile/profile-image`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "อัปโหลดรูปไม่สำเร็จ");
      }

      console.log("UPLOAD success:", data);

      // ✅ หลังอัปโหลด ให้โชว์ผ่าน backend proxy พร้อม cache-bust
      const busted = Date.now().toString();
      const imgUrl = buildImageFromBackend(editedProfile.id, token, busted);

      setAvatarUrl(imgUrl);
      setPreviewImg(imgUrl);

      setEditedProfile({ ...editedProfile, avatar: imgUrl });
      if (profile) setProfile({ ...profile, avatar: imgUrl });

      setDialogType("success");
      setDialogMsg("อัปโหลดรูปโปรไฟล์สำเร็จ");
      setDialogOpen(true);
    } catch (err: any) {
      console.error("upload image error:", err);

      setDialogType("error");
      setDialogMsg(err.message || "เกิดข้อผิดพลาดในการอัปโหลดรูป");
      setDialogOpen(true);

      // revert
      setPreviewImg(avatarUrl ?? profile?.avatar ?? null);
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;
  if (!profile || !editedProfile) return <div className="p-10 text-center">ไม่พบข้อมูลผู้ใช้</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4 max-w-5xl">
        <h1 className="text-4xl font-bold mb-2">โปรไฟล์ผู้ใช้</h1>
        <p className="text-lg text-muted-foreground">จัดการข้อมูลส่วนตัวของคุณ</p>

        <Card className="shadow-card border-0 overflow-hidden mt-10">
          <CardHeader className="pb-4">
            <div className="flex gap-6">
              {/* ================= IMAGE ================= */}
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer relative">
                  <Avatar className="h-32 w-32 border-4 shadow-xl">
                    <AvatarImage key={previewImg ?? "no-img"} src={previewImg ?? undefined} />
                    <AvatarFallback className="text-3xl">{getInitials(profile.name)}</AvatarFallback>
                  </Avatar>

                  {/* ไอคอนกล้องแสดงตลอดเวลา */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-10 h-10 text-white" />
                  </div>

                  {uploadingImg && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* ================= NAME + ROLE BADGE ================= */}
              <div className="flex-1 pt-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{profile.name}</h3>

                    <Badge className="mt-2 bg-pink-400 text-white flex items-center gap-1 px-3 py-1">
                      <Shield className="w-4 h-4" />
                      {profile.role}
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
                  <Input name="name" value={editedProfile.name} onChange={handleChange} />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-lg">{profile.name}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>อีเมล</Label>
                {isEditing ? (
                  <Input name="email" value={editedProfile.email} onChange={handleChange} />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-lg">{profile.email}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                {isEditing ? (
                  <Input name="phone" value={editedProfile.phone} onChange={handleChange} />
                ) : (
                  <div className="px-4 py-3 bg-muted/30 rounded-lg">{profile.phone}</div>
                )}
              </div>
            </div>

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 shadow-xl">
          <button
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
            onClick={() => setDialogOpen(false)}
          ></button>

          <DialogHeader className="text-center">
            <DialogTitle
              className={`text-2xl font-bold ${dialogType === "success" ? "text-green-600" : "text-red-600"
                }`}
            >
              {dialogTitle}
            </DialogTitle>

            <DialogDescription className="text-gray-600 text-center mt-6 mb-8 text-base leading-relaxed">
              {dialogMsg}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center mt-2 mb-2">
            <Button
              onClick={() => setDialogOpen(false)}
              className={
                dialogType === "success"
                  ? "bg-green-500 hover:bg-green-600 text-white text-base px-6 py-2 rounded-lg shadow-md"
                  : "bg-red-500 hover:bg-red-600 text-white text-base px-6 py-2 rounded-lg shadow-md"
              }
            >
              ตกลง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
