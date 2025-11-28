// app/(screens)/profile-edit.tsx
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import { API_BASE_URL } from "../../config/api";

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.tol ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/(auth)/login");
    }
  }, [user]);

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

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          tol: phone.trim(),
          ...(password ? { password } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "อัปเดตโปรไฟล์ไม่สำเร็จ");
      }

      setUser(data);

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
          <View className="items-center mt-2 mb-6">
            <View className="w-24 h-24 rounded-full bg-emerald-200 items-center justify-center">
              <Ionicons name="person" size={48} color="#0f5132" />
            </View>
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
            disabled={loading}
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
