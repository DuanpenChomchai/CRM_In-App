import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import * as ImagePicker from "expo-image-picker";

export default function ProfileScreen() {
  const router = useRouter();

  // ✅ เพิ่ม token
  const { user, token, logout, uploadProfileImage, fetchMe } = useAuthStore() as any;

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
        await fetchMe();
      } catch (e) {
        console.log("fetchMe error:", e);
      } finally {
        setLoadingProfile(false);
      }
    };
    run();
  }, []);

  /**
   * ✅ ใช้ endpoint รูปที่คุณมีอยู่ (จาก log)
   * ใส่ cache buster กันรูปค้าง
   */
  const avatarUri = useMemo(() => {
    if (!user?.id) return null;
    return `http://10.0.2.2:3000/api/users/profile-image/${user.id}?t=${Date.now()}`;
  }, [user?.id, user?.img]); // ใส่ user.img เพื่อให้ rerender หลังอัปโหลด

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
      await uploadProfileImage(asset.uri);
      await fetchMe();
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
            <Image
              source={{
                uri: avatarUri,
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              }}
              className="w-24 h-24"
              resizeMode="cover"
              onError={(e) => console.log("Image load error:", e.nativeEvent)}
            />
          ) : (
            <Ionicons name="person" size={48} color="#0f5132" />
          )}

          {uploading && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center">
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </View>

        {loadingProfile ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text className="text-3xl font-bold text-gray-900">{user.name}</Text>
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
          className="mt-6 bg-slate-500 px-6 py-3 rounded-xl "
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
