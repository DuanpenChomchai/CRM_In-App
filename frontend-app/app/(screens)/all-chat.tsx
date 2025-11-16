import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, FlatList, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { getSocket } from "../store/socket";

type ChatItem = { id: string; name: string; time: string };

const baseRooms: ChatItem[] = [
  { id: "general", name: "General", time: "Now" },
  { id: "dev", name: "Developers", time: "Now" },
  { id: "sales", name: "Sales Team", time: "Now" },
];

const mockChats: ChatItem[] = [
  { id: "1", name: "Sale Alex", time: "15:00" },
  { id: "2", name: "Sale Chopi", time: "Yesterday" },
];

export default function ChatsScreen() {
  const socket = getSocket();
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [query, setQuery] = useState("");
  const [customRoomName, setCustomRoomName] = useState("");

  const allRooms = useMemo<ChatItem[]>(() => [...baseRooms, ...mockChats], []);
  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allRooms.filter((c) => c.name.toLowerCase().includes(q)) : allRooms;
  }, [query, allRooms]);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

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

  const handleCreateRoom = () => {
    const name = customRoomName.trim();
    if (!name) return;
    const roomId = name.toLowerCase().replace(/[^a-z0-9\- ]/g, "").replace(/\s+/g, "-").slice(0, 40)
      || `room-${Date.now()}`;
    setCustomRoomName("");
    router.push({ pathname: "/(screens)/chat-detail", params: { id: roomId, name } });
  };

  const ListHeader = (
    <>
      <View className="flex-row items-center px-4 bg-white pt-2">
        <View className="flex-1 items-center -ml-6 py-2">
          <Text className="text-lg font-semibold text-gray-900 text-center">
            Chats {connected ? "🟢" : "🔴"}
          </Text>
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

      <View className="px-4 pb-2 bg-white">
        <View className="flex-row items-center bg-emerald-50 rounded-2xl px-3 py-2 border border-emerald-100">
          <Ionicons name="chatbox-ellipses-outline" size={18} color="#047857" />
          <TextInput
            className="flex-1 px-2 py-1 text-gray-800"
            placeholder="Create or join a room (e.g. support-TH)"
            placeholderTextColor="#6EE7B7"
            value={customRoomName}
            onChangeText={setCustomRoomName}
            returnKeyType="go"
            onSubmitEditing={handleCreateRoom}
          />
          <Pressable onPress={handleCreateRoom} className="pl-2" style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="add-circle" size={22} color="#10B981" />
          </Pressable>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
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

      <View className="h-[68px] border-t border-gray-200 flex-row items-center justify-around">
        <View className="items-center">
          <Ionicons name="chatbubble" size={22} color="#047857" />
          <Text className="text-xs mt-1 text-emerald-700 font-medium">Chats</Text>
        </View>

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
