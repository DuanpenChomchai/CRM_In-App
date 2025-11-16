import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit =
    identifier.trim().length > 0 && password.trim().length >= 1;

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-24">
      {/* Header */}
      <View className="mb-8">
        <Text className="text-3xl text-center font-bold text-gray-900">
          Login
        </Text>
      </View>

      <View className="space-y-4">
        {/* Email / Phone */}
        <View>
          <Text className="mb-2 text-gray-700 font-medium">
            Email / Phone
          </Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="Email or Phone"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50"
          />
        </View>

        {/* Password */}
        <View>
          <Text className="mb-2 text-gray-700 font-medium">Password</Text>

          <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              className="flex-1 py-3"
            />

            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="pl-3 py-2"
            >
              <Ionicons
                name={showPassword ? "eye" : "eye-off"}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ปุ่ม Login (Link ไป all-chat) */}
        <Link
          href="/(screens)/all-chat"
          asChild
        >
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!canSubmit}
            className={`rounded-xl py-3 items-center w-44 justify-center self-center mt-4 ${
              canSubmit ? "bg-green-700" : "bg-gray-300"
            }`}
          >
            <Text
              className={`font-semibold text-base ${
                canSubmit ? "text-white" : "text-gray-500"
              }`}
            >
              Login
            </Text>
          </TouchableOpacity>
        </Link>

        {/* Link ไปหน้า Sign up */}
        <View className="flex-row justify-center mt-3">
          <Text className="text-base text-gray-600 mr-1">
            Don't have an
          </Text>
          <Link
            href="/(auth)/sign-up"
            className="text-base text-blue-600 font-semibold"
          >
            account?
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}