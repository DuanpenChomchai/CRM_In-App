import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import { API_BASE_URL } from "../../config/api";
import * as ImagePicker from "expo-image-picker";

export default function ProfileEditScreen() {
  const router = useRouter();

  // ✅ ดึง uploadProfileImage เพิ่ม
  const { user, token, setUser, fetchMe, uploadProfileImage } = useAuthStore() as any;

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

  // ✅ รูปสำหรับโชว์ในหน้า edit
  const avatarUri = useMemo(() => {
    if (!user?.img) return null;
    return user.img; // store เรา normalize ให้เป็น URL ใช้งานได้แล้ว
  }, [user?.img]);

  // =========================
  // UPLOAD IMAGE (เลือกจากเครื่อง + อัปโหลด)
  // =========================
  const onPickAndUpload = async () => {
    if (!uploadProfileImage) {
      Alert.alert("Error", "ยังไม่ได้เชื่อมฟังก์ชัน uploadProfileImage ใน store");
      return;
    }
    if (!token) {
      Alert.alert("Error", "ไม่พบ token");
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "กรุณาอนุญาตเข้าถึงรูปภาพก่อน");
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

      // ✅ ยิง PUT /api/users/me/profile-image ผ่าน store
      const updatedUser = await uploadProfileImage(asset.uri);

      // ✅ อัปเดต user ใน store (กันบาง backend ส่งไม่ครบ)
      setUser({
        ...(user ?? {}),
        ...(updatedUser ?? {}),
        img: updatedUser?.img ?? user?.img ?? null,
      });

      // ✅ ถ้ามี fetchMe ก็ sync อีกครั้ง
      if (typeof fetchMe === "function") {
        try {
          await fetchMe();
        } catch {}
      }

      Alert.alert("สำเร็จ", "อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว");
    } catch (e: any) {
      console.log("upload image error:", e);
      Alert.alert("Error", e?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingImg(false);
    }
  };

  // =========================
  // SAVE TEXT PROFILE
  // =========================
  const handleSave = async () => {
    if (!user || !token) {
      Alert.alert("Error", "ไม่พบข้อมูลผู้ใช้หรือ token");
      return;
    }

    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอก Name, Email และ Phone ให้ครบ");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
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

      const data = await res.json();

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

      Alert.alert("สำเร็จ", "บันทึกโปรไฟล์เรียบร้อยแล้ว", [
        { text: "OK", onPress: () => router.replace("/(screens)/profile") },
      ]);
    } catch (err: any) {
      console.log("Update profile error:", err);
      Alert.alert("Error", err?.message || "เกิดข้อผิดพลาด");
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
            <Text className="text-lg font-semibold text-gray-900">Edit Profile</Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        {/* Body */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ✅ Avatar + Upload */}
          <View className="items-center mt-2 mb-6">
            <Pressable
              onPress={onPickAndUpload}
              disabled={uploadingImg}
              className="items-center"
            >
              <View className="w-24 h-24 rounded-full bg-emerald-200 items-center justify-center overflow-hidden">
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96 }} resizeMode="cover" />
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

            {/* Password (optional) */}
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
