import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Link } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-24">
      <View className="mb-8">
        <Text className="text-3xl text-center font-bold text-gray-900">Login</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="mb-2 text-gray-700 font-medium">Email / Phone</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
          />
        </View>

        <View>
          <Text className="mb-2 text-gray-700 font-medium">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
          />
        </View>

        {/* ✅ ปุ่มกดไปหน้า all-chat */}
        <Link href="/(screens)/all-chat" asChild>
          <TouchableOpacity
            activeOpacity={0.9}
            className="rounded-xl py-3 items-center w-44 justify-center bg-green-700 self-center mt-4"
          >
            <Text className="text-white font-semibold text-base">Login</Text>
          </TouchableOpacity>
        </Link>

        {/* ลิงก์ไปสมัคร */}
        <View className="flex-row justify-center mt-3">
          <Text className="text-base text-gray-600 mr-1">Don't have an</Text>
          <Link href="/(auth)/sign-up" className="text-base text-blue-600 font-semibold">
            account?
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
