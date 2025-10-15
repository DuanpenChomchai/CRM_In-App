import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.length >= 6;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="w-full max-w-sm pt-14">
        <Text className="text-3xl font-bold text-[#1D2433] text-center mb-8">
          Sign Up
        </Text>
      </View>

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
  

      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
          <Ionicons name="mail-outline" size={22} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 ml-2"
            placeholder="Email "
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
      </View>

      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
          <Ionicons name="call-outline" size={22} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 ml-2"
            placeholder="Phone "
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
            maxLength={10}
          ></TextInput>
      </View>

      <View className="flex-row items-center border border-gray-200 rounded-2xl bg-gray-50 px-4 mt-4 mx-6">
          <Ionicons name="lock-closed-outline" size={22} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 ml-2"
            placeholder="Password "
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          ></TextInput>
      </View>

      <View>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!canSubmit} // ปุ่มกดไม่ได้ถ้าเงื่อนไขไม่ครบ
          className={`rounded-xl py-3 items-center w-44 justify-center bg-green-700 self-center mt-6 ${
            canSubmit ? "" : "bg-gray-400"
          }`}
        >
          <Text className="text-white font-semibold">Sign Up</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-3">
          <Text className="text-base text-gray-600 mr-1">Already have an</Text>
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
