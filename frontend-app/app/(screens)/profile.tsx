import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function ProfileScreen() {
  return (
    <>
      <SafeAreaView className="flex-1 bg-white items-center justify-between">
        <View className="flex-1 items-center justify-center">
          <View className="w-24 h-24 rounded-full bg-emerald-200 items-center justify-center mb-4">
            <Ionicons name="person" size={48} color="#0f5132" />
          </View>

          <Text className="text-3xl font-bold text-gray-900">John Doe</Text>
          <Text className="text-xl text-gray-600 mt-1">+1 234 567 8900</Text>
          <Text className="text-base text-gray-600 mt-1">
            john.doe@example.com
          </Text>

          <Link href="/(screens)/edit-profile" asChild>
            <TouchableOpacity
              activeOpacity={0.9}
              className="mt-6 bg-emerald-700 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold text-base">
                Edit Profile
              </Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
              activeOpacity={0.9}
              className="mt-6 bg-slate-500 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold text-base">
                Logout
              </Text>
            </TouchableOpacity>
        </View>

        <View className="h-[68px] border-t border-gray-200 flex-row items-center justify-around w-full">
          <Link href="/(screens)/all-chat" asChild>
            <Pressable className="items-center">
              <Ionicons name="chatbubble" size={22} color="#9CA3AF" />
              <Text className="text-xs mt-1 text-gray-400">Chats</Text>
            </Pressable>
          </Link>

          <View className="items-center">
            <Ionicons name="person-circle" size={22} color="#047857" />
            <Text className="text-xs mt-1 text-emerald-700 font-medium">
              Profile
            </Text>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
}
