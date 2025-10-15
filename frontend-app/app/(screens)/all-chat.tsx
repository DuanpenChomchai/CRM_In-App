import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

type ChatItem = { id: string; name: string; time: string };

const mockChats: ChatItem[] = [
  { id: "1", name: "Sale Alex", time: "15:00" },
  { id: "2", name: "Sale Chopi", time: "Yesterday" },
];

export default function ChatsScreen() {
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? mockChats.filter((c) => c.name.toLowerCase().includes(q)) : mockChats;
  }, [query]);

  const renderItem = ({ item }: { item: ChatItem }) => (
    <Link
      href={{ pathname: "/(screens)/chat-detail", params: { id: item.id, name: item.name } }}
      asChild
    >
      <Pressable className="px-4 active:opacity-70">
        <View className="flex-row items-center py-4">
          <View className="w-12 h-12 rounded-full bg-emerald-200 items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#0f5132" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
          </View>
          <Text className="text-xs text-gray-500">{item.time}</Text>
        </View>
      </Pressable>
    </Link>
  );

  const ListHeader = (
    <>
      <View className="flex-row items-center px-4 bg-white pt-2">
        <View className="flex-1 items-center -ml-6 py-2">
          <Text className="text-lg font-semibold text-gray-900 text-center">Chats</Text>
        </View>
        <View className="w-6" />
      </View>

      <View className="px-4 pb-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-3 py-2">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 px-2 py-1 text-gray-800"
            placeholder="Search"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* รายการแชต */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        stickyHeaderIndices={[0]}
        ItemSeparatorComponent={() => <View className="mx-4 h-px bg-gray-200" />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text className="text-gray-400">No chats found</Text>
          </View>
        }
      />

      {/* แถบล่าง (Bottom Tab Mock) */}
      <View className="h-[68px] border-t border-gray-200 flex-row items-center justify-around">
        {/* Chats tab (active) */}
        <View className="items-center">
          <Ionicons name="chatbubble" size={22} color="#047857" />
          <Text className="text-xs mt-1 text-emerald-700 font-medium">Chats</Text>
        </View>

        {/* Profile tab (link) */}
        <Link href="/(screens)/profile" asChild>
          <Pressable className="items-center">
            <Ionicons name="person-circle-outline" size={22} color="#9CA3AF" />
            <Text className="text-xs mt-1 text-gray-400">Profile</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
