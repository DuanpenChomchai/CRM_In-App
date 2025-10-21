// app/(screens)/profile-edit.tsx
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, Link } from "expo-router";

export default function ProfileEditScreen() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [phone, setPhone] = useState("+1 234 567 8900");
  const [password, setPassword] = useState("password");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center px-4 py-3">
          <Link href="/(screens)/profile" asChild>
            <Pressable className="h-10 w-10 items-center justify-center">
              <Ionicons name="chevron-back" size={24} color="#111827" />
            </Pressable>
          </Link>

          <View className="flex-1 items-center -ml-10">
            <Text className="text-lg font-semibold text-gray-900">Profile</Text>
          </View>
          <View className="h-10 w-10" />
        </View>

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

            <View>
              <Text className="mb-2 text-gray-700">Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            <View>
              <Text className="mb-2 text-gray-700">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
                returnKeyType="done"
              />
            </View>
          </View>

          <Link href="/(screens)/profile" asChild>
            <Pressable className="mt-6 bg-emerald-700 rounded-xl items-center justify-center py-3">
              <Text className="text-white font-semibold">Save</Text>
            </Pressable>
          </Link>

          <View className="h-4" />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
