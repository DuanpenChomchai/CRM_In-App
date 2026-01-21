import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, Pressable, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, uploadProfileImage, fetchMe } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }
      try {
        setLoadingProfile(true);
        await fetchMe(); // ✅ ดึงโปรไฟล์ล่าสุด
      } catch (e) {
        console.log("fetchMe error:", e);
      } finally {
        setLoadingProfile(false);
      }
    };
    run();
  }, []);

  const avatarUri = useMemo(() => {
    return user?.img || null; // ✅ store normalize ให้แล้ว
  }, [user?.img]);

  const onPickAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) return;

      setUploading(true);
      await uploadProfileImage(asset.uri); // ✅ ยิง API + อัปเดต user ใน store
      await fetchMe(); // ✅ ดึงใหม่กันเหนียว (ถ้า backend เปลี่ยน field อื่น)
    } catch (e) {
      console.log("Upload profile image error:", e);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-between">
      <View className="flex-1 items-center justify-center">
        {/* Avatar */}
        <View className="w-24 h-24 rounded-full bg-emerald-200 items-center justify-center mb-4 overflow-hidden">
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} className="w-24 h-24" resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={48} color="#0f5132" />
          )}
        </View>

        {/* Change photo */}
        <TouchableOpacity
          activeOpacity={0.9}
          className="mb-4 bg-emerald-100 px-4 py-2 rounded-xl flex-row items-center"
          onPress={onPickAndUpload}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator /> : <Ionicons name="camera" size={18} color="#047857" />}
          <Text className="ml-2 text-emerald-800 font-semibold">
            {uploading ? "Uploading..." : "Change Photo"}
          </Text>
        </TouchableOpacity>

        {loadingProfile ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text className="text-3xl font-bold text-gray-900">{user.name}</Text>
            <Text className="text-xl text-gray-600 mt-1">{user.tol}</Text>
            <Text className="text-base text-gray-600 mt-1">{user.email}</Text>
          </>
        )}

        <Link href="/(screens)/edit-profile" asChild>
          <TouchableOpacity activeOpacity={0.9} className="mt-6 bg-emerald-700 px-6 py-3 rounded-xl">
            <Text className="text-white font-semibold text-base">Edit Profile</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity
          activeOpacity={0.9}
          className="mt-6 bg-slate-500 px-6 py-3 rounded-xl"
          onPress={async () => {
            try {
              await logout();
              router.replace("/(auth)/login");
            } catch (e) {
              console.log("Logout error:", e);
            }
          }}
        >
          <Text className="text-white font-semibold text-base">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom bar */}
      <View className="h-[68px] border-t border-gray-200 flex-row items-center justify-around w-full">
        <Link href="/(screens)/all-chat" asChild>
          <Pressable className="items-center">
            <Ionicons name="chatbubble" size={22} color="#9CA3AF" />
            <Text className="text-xs mt-1 text-gray-400">Chats</Text>
          </Pressable>
        </Link>

        <View className="items-center">
          <Ionicons name="person-circle" size={22} color="#047857" />
          <Text className="text-xs mt-1 text-emerald-700 font-medium">Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
