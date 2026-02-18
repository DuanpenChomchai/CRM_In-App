import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import { API_BASE_URL } from "../../config/api";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";

export default function ProfileEditScreen() {
  const router = useRouter();

  const { user, token, setUser, fetchMe, uploadProfileImage } =
    useAuthStore() as any;

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.tol ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/(auth)/login");
  }, [user, router]);

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.tol ?? "");
  }, [user?.id]);

  const avatarUri = useMemo(() => {
    if (!user?.id || !token) return null;
    return `${API_BASE_URL}/users/profile-image/${user.id}?t=${encodeURIComponent(token)}&b=${Date.now()}`;
  }, [user?.id, user?.img, token]);

  // =========================
  // UPLOAD IMAGE (เลือกจากเครื่อง + อัปโหลด)
  // =========================
  const onPickAndUpload = async () => {
    if (!uploadProfileImage) {
      Toast.show({ type: "error", text1: "Error", text2: "uploadProfileImage function is not connected in store" });
      return;
    }
    if (!token) {
      Toast.show({ type: "error", text1: "Error", text2: "Token not found" });
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: "info", text1: "Permission Required", text2: "Please allow access to your photo library" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 0.9,
});


      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setUploadingImg(true);

      // ✅ PUT /api/users/me/profile-image (multipart) ผ่าน store
      const updatedUser = await uploadProfileImage(asset.uri);

      // ✅ merge user local (กัน backend ส่งมาไม่ครบ)
      setUser({
        ...(user ?? {}),
        ...(updatedUser ?? {}),
        img: updatedUser?.img ?? user?.img ?? null,
      });

      // ✅ sync อีกครั้ง (ถ้ามี)
      if (typeof fetchMe === "function") {
        try {
          await fetchMe();
        } catch {}
      }

      Toast.show({ type: "success", text1: "Success", text2: "Profile photo uploaded successfully" });
    } catch (e: any) {
      console.log("upload image error:", e?.response?.data ?? e);
      Toast.show({ type: "error", text1: "Error", text2: e?.message || "Failed to upload photo" });
    } finally {
      setUploadingImg(false);
    }
  };

  // =========================
  // SAVE TEXT PROFILE
  // =========================
  const handleSave = async () => {
    if (!user || !token) {
      Toast.show({ type: "error", text1: "Error", text2: "User data or token not found" });
      return;
    }

    if (!name.trim() || !email.trim() || !phone.trim()) {
      Toast.show({ type: "info", text1: "Incomplete", text2: "Please fill in Name, Email, and Phone" });
      return;
    }

    try {
      setLoading(true);

      // ✅ สำคัญ:
      // ให้ API_BASE_URL เป็น ".../api" แล้วค่อยต่อ "/users/me"
      // ห้ามเติม "/api" ซ้ำ ไม่งั้นจะกลายเป็น /api/api/users/me แล้วได้ HTML กลับมา
      const url = `${API_BASE_URL}/users/me`;

      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          tol: phone.trim(),
          ...(password.trim() ? { password: password.trim() } : {}),
        }),
      });

      // ✅ กันเคส server ส่ง HTML กลับมา (เริ่มด้วย "<")
      const rawText = await res.text();

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        console.log("Update profile non-JSON response:", rawText.slice(0, 300));
        throw new Error("Server ตอบกลับไม่ใช่ JSON (เช็ค URL /api ซ้ำ หรือ server error)");
      }

      if (!res.ok) {
        throw new Error(data?.message || "อัปเดตโปรไฟล์ไม่สำเร็จ");
      }

      const updatedUser = data?.user ?? data;

      const merged = {
        ...user,
        ...updatedUser,
        img: updatedUser?.img ?? user.img ?? null,
      };

      setUser(merged);

      if (typeof fetchMe === "function") {
        try {
          await fetchMe();
        } catch {}
      }

      Toast.show({ type: "success", text1: "Success", text2: "Profile saved successfully" });
      router.replace("/(screens)/profile");
    } catch (err: any) {
      console.log("Update profile error:", err);
      Toast.show({ type: "error", text1: "Error", text2: err?.message || "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <Link href="/(screens)/profile" asChild>
            <Pressable className="h-10 w-10 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </Pressable>
          </Link>

          <View className="flex-1 items-center -ml-10">
            <Text className="text-lg font-semibold text-gray-900">
              Edit Profile
            </Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar + Upload */}
          <View className="items-center mt-2 mb-6">
            <Pressable
              onPress={onPickAndUpload}
              disabled={uploadingImg}
              className="items-center"
            >
              <View className="w-24 h-24 rounded-full bg-emerald-200 items-center justify-center overflow-hidden">
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={{ width: 96, height: 96 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={48} color="#0f5132" />
                )}

                {uploadingImg && (
                  <View
                    style={{
                      position: "absolute",
                      inset: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.25)",
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </View>

              <View className="mt-3 flex-row items-center">
                <Ionicons name="camera" size={18} color="#047857" />
                <Text className="ml-2 text-emerald-800 font-semibold">
                  {uploadingImg ? "Uploading..." : "Change Photo"}
                </Text>
              </View>
            </Pressable>
          </View>

          <View className="space-y-4">
            {/* Name */}
            <View>
              <Text className="mb-2 text-gray-700">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Email */}
            <View>
              <Text className="mb-2 text-gray-700">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Phone */}
            <View>
              <Text className="mb-2 text-gray-700">Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+66..."
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View>
              <Text className="mb-2 text-gray-700">
                Password (ถ้าไม่เปลี่ยนให้เว้นว่าง)
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                secureTextEntry
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            className="mt-6 bg-emerald-700 rounded-xl items-center justify-center py-3"
            onPress={handleSave}
            disabled={loading || uploadingImg}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold">Save</Text>
            )}
          </Pressable>

          <View className="h-4" />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
