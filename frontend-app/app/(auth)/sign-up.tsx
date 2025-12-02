import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tol, setTol] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    tol.trim().length > 0 &&
    password.length >= 6;

  const handleSignUp = async () => {
    if (loading) return;
    setErrorMsg("");

    if (!canSubmit) {
      setErrorMsg(
        "กรุณากรอกข้อมูลให้ครบทุกช่อง (รหัสผ่านอย่างน้อย 6 ตัวอักษร)"
      );
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("http://10.0.2.2:3000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          tol: tol.trim(),
          password: password,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (_) {
      }

      if (!res.ok) {
        setErrorMsg(
          data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
        );
        Alert.alert(
          "สมัครไม่สำเร็จ",
          data?.message || "กรุณาลองใหม่อีกครั้ง"
        );
        return;
      }

      Alert.alert("สำเร็จ", "สมัครสมาชิกสำเร็จ", [
        {
          text: "ตกลง",
          onPress: () => {
            router.replace("/(auth)/login");
          },
        },
      ]);
    } catch (error) {
      console.error("SignUp error:", error);
      setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white pt-14">
      {/* Header */}
      <View className="w-full max-w-sm self-center">
        <Text className="text-3xl font-bold text-[#1D2433] text-center mb-8">
          Sign Up
        </Text>
      </View>

      {/* Name */}
      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
        <Ionicons name="person-outline" size={22} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 ml-2"
          placeholder="Name"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />
      </View>

      {/* Email */}
      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
        <Ionicons name="mail-outline" size={22} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 ml-2"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Phone (tol) */}
      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
        <Ionicons name="call-outline" size={22} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 ml-2"
          placeholder="Phone"
          value={tol}
          onChangeText={setTol}
          keyboardType="phone-pad"
          returnKeyType="next"
          maxLength={10}
        />
      </View>

      {/* Password + toggle show/hide */}
      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
        <Ionicons name="lock-closed-outline" size={22} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 ml-2"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword} 
        />
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="pl-2 py-2"
        >
          <Ionicons
            name={showPassword ? "eye" : "eye-off"}
            size={22}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>

      {/* error message */}
      {!!errorMsg && (
        <Text className="text-red-600 text-center text-sm mt-3 mx-6">
          {errorMsg}
        </Text>
      )}

      {/* Sign Up button */}
      <View className="mt-6">
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!canSubmit || loading}
          onPress={handleSignUp}
          className={`rounded-xl py-3 items-center w-44 justify-center self-center ${
            canSubmit && !loading ? "bg-green-700" : "bg-gray-400"
          }`}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white font-semibold">Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* already have account? */}
        <View className="flex-row justify-center mt-3">
          <Text className="text-base text-gray-600 mr-1">
            Already have an
          </Text>
          <Link
            href="/(auth)/login"
            className="text-base text-blue-600 font-semibold"
          >
            account ?
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
