import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore"; 

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthAfterLogin } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    if (loading) return;
    setErrorMsg("");

    if (!identifier.trim() || !password.trim()) {
      setErrorMsg("กรุณากรอกอีเมล/เบอร์ และรหัสผ่าน");
      return;
    }
    try {
      setLoading(true);

      const res = await fetch("http://10.0.2.2:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (_) {
      }
      if (!res.ok) {
        setErrorMsg(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      if (!data?.token || !data?.user) {
        setErrorMsg("ข้อมูลการเข้าสู่ระบบไม่ถูกต้องจากเซิร์ฟเวอร์");
        return;
      }
      await setAuthAfterLogin(data.user, data.token);
      router.replace("/(screens)/all-chat");
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
      Alert.alert("Error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Password + toggle show/hide */}
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

        {/* error message */}
        {!!errorMsg && (
          <Text className="text-red-600 text-center text-sm">
            {errorMsg}
          </Text>
        )}

        {/* Login button */}
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!canSubmit || loading}
          onPress={handleLogin}
          className={`rounded-xl py-3 items-center w-44 justify-center self-center mt-4 ${
            canSubmit && !loading ? "bg-green-700" : "bg-gray-300"
          }`}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text
              className={`font-semibold text-base ${
                canSubmit && !loading ? "text-white" : "text-gray-500"
              }`}
            >
              Login
            </Text>
          )}
        </TouchableOpacity>

        {/* link to sign up */}
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
