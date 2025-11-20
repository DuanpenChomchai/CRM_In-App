// app/(screens)/chats.tsx  หรือไฟล์หน้ารายการแชทของคุณ

import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, Href } from "expo-router";
import { getSocket } from "../store/socket";
import { useAuthStore } from "../store/useAuthStore";

type ChatItem = {
  id: string;
  name: string;
  time: string;
  customerId?: number;
  isSaleChat?: boolean;
};

const baseRooms: ChatItem[] = [
  { id: "general", name: "General", time: "Now" },
  { id: "dev", name: "Developers", time: "Now" },
  { id: "sales", name: "Sales Team", time: "Now" },
];

// ✅ ใช้ได้ทั้ง emulator และมือถือจริง
const HOST: string = Platform.select<string>({
  ios: "http://localhost:3000",
  android: "http://10.0.2.2:3000",
  default: "http://10.222.113.26:3000", // 👉 เปลี่ยนเป็น IP เครื่องคอมของตัวเองเวลาใช้มือถือจริง
})!;
const API_BASE_URL = `${HOST}/api`;

export default function ChatsScreen() {
  const socket = getSocket();
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [query, setQuery] = useState("");
  const [customRoomName, setCustomRoomName] = useState("");

  const { user, token } = useAuthStore();

  // CUSTOMER: ห้องแชทกับเซลล์ที่ถูก assign ให้เรา
  const [saleChat, setSaleChat] = useState<ChatItem | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  // SALE: ห้องแชทลูกค้าที่เราเป็นเซลล์ดูแล
  const [saleRooms, setSaleRooms] = useState<ChatItem[]>([]);
  const [loadingSaleRooms, setLoadingSaleRooms] = useState(false);

  // ===== CUSTOMER: ดึงเซลล์ที่ดูแลลูกค้าที่ล็อกอิน =====
  useEffect(() => {
    const fetchSaleChat = async () => {
      try {
        if (!token || user?.role !== "CUSTOMER") return;

        setLoadingSale(true);

        const res = await fetch(`${API_BASE_URL}/customers/my-sale`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("my-sale error status:", res.status);
          return;
        }

        const data = await res.json();
        // data: { customerId, customerName, sale: { id, name, ... } | null }

        if (data.sale) {
          setSaleChat({
            id: `cust:${data.customerId}`,
            customerId: data.customerId,
            name: data.sale.name || "Sale",
            time: "Now",
            isSaleChat: true,
          });
        } else {
          setSaleChat(null);
        }
      } catch (err) {
        console.error("fetchSaleChat error:", err);
      } finally {
        setLoadingSale(false);
      }
    };

    fetchSaleChat();
  }, [token, user?.role]);

  // ===== SALE: ดึงลูกค้าที่เราเป็นเซลล์ดูแล =====
  useEffect(() => {
    const fetchSaleRooms = async () => {
      try {
        if (!token || user?.role !== "SALE" || !user?.id) return;

        setLoadingSaleRooms(true);

        const res = await fetch(`${API_BASE_URL}/customers/sale/${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log("customers/sale error status:", res.status);
          return;
        }

        const data = await res.json();

        const mapped: ChatItem[] = data.map((c: any) => ({
          id: `cust:${c.id}`,
          customerId: c.id,
          name: c.name || `Customer #${c.id}`,
          time: "Now",
        }));

        setSaleRooms(mapped);
      } catch (err) {
        console.error("fetchSaleRooms error:", err);
      } finally {
        setLoadingSaleRooms(false);
      }
    };

    fetchSaleRooms();
  }, [token, user?.role, user?.id]);

  // ===== รวมรายการห้อง =====
  const allRooms = useMemo<ChatItem[]>(() => {
    const rooms: ChatItem[] = [];

    if (user?.role === "CUSTOMER" && saleChat) {
      rooms.push(saleChat);
    }

    if (user?.role === "SALE" && saleRooms.length > 0) {
      rooms.push(...saleRooms);
    }

    rooms.push(...baseRooms);

    return rooms;
  }, [user?.role, saleChat, saleRooms]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? allRooms.filter((c) => c.name.toLowerCase().includes(q))
      : allRooms;
  }, [query, allRooms]);

  // ===== สถานะ Socket =====
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // ===== เวลาแตะห้องแต่ละอัน =====
  const renderItem = ({ item }: { item: ChatItem }) => {
    // ใช้ object Href ให้ตรงกับ type ของ expo-router
    const href: Href =
      item.customerId != null
        ? {
            pathname: "/(screens)/chat-detail",
            params: {
              customerId: String(item.customerId),
              name: item.name,
            },
          }
        : {
            pathname: "/(screens)/chat-detail",
            params: {
              id: item.id,
              name: item.name,
            },
          };

    return (
      <Link href={href} asChild>
        <Pressable className="px-4 active:opacity-70">
          <View className="flex-row items-center py-4">
            <View className="w-12 h-12 rounded-full bg-emerald-200 items-center justify-center mr-3">
              <Ionicons
                name={item.isSaleChat ? "person" : "people"}
                size={20}
                color="#0f5132"
              />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-800">
                {item.isSaleChat
                  ? `Sale: ${item.name}`
                  : item.customerId
                  ? item.name
                  : item.name}
              </Text>

              {item.isSaleChat && (
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  Your assigned sale
                </Text>
              )}
            </View>

            <Text className="text-xs text-gray-500">{item.time}</Text>
          </View>
        </Pressable>
      </Link>
    );
  };

  const handleCreateRoom = () => {
    const name = customRoomName.trim();
    if (!name) return;

    const roomId =
      name
        .toLowerCase()
        .replace(/[^a-z0-9\- ]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40) || `room-${Date.now()}`;

    setCustomRoomName("");

    router.push({
      pathname: "/(screens)/chat-detail",
      params: { id: roomId, name },
    });
  };

  // ห่อ header ทั้งหมดด้วย View เดียว เพื่อใช้ stickyHeaderIndices
  const ListHeader = (
    <View>
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
          <Ionicons
            name="chatbox-ellipses-outline"
            size={18}
            color="#047857"
          />
          <TextInput
            className="flex-1 px-2 py-1 text-gray-800"
            placeholder="Create or join a room (e.g. support-TH)"
            placeholderTextColor="#6EE7B7"
            value={customRoomName}
            onChangeText={setCustomRoomName}
            returnKeyType="go"
            onSubmitEditing={handleCreateRoom}
          />
          <Pressable
            onPress={handleCreateRoom}
            className="pl-2"
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="add-circle" size={22} color="#10B981" />
          </Pressable>
        </View>

        {loadingSale && user?.role === "CUSTOMER" && (
          <View className="mt-2">
            <Text className="text-[11px] text-gray-400">
              กำลังโหลดเซลล์ที่ดูแลคุณ...
            </Text>
          </View>
        )}
        {!loadingSale && user?.role === "CUSTOMER" && !saleChat && (
          <View className="mt-2">
            <Text className="text-[11px] text-gray-400">
              ยังไม่มีเซลล์ที่ถูกมอบหมายให้คุณ (รอเจ้าหน้าที่ติดต่อกลับ)
            </Text>
          </View>
        )}

        {loadingSaleRooms && user?.role === "SALE" && (
          <View className="mt-2">
            <Text className="text-[11px] text-gray-400">
              กำลังโหลดลูกค้าที่คุณดูแล...
            </Text>
          </View>
        )}
        {!loadingSaleRooms &&
          user?.role === "SALE" &&
          saleRooms.length === 0 && (
            <View className="mt-2">
              <Text className="text-[11px] text-gray-400">
                คุณยังไม่ถูกมอบหมายลูกค้าคนใด
              </Text>
            </View>
          )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        stickyHeaderIndices={[0]}
        ItemSeparatorComponent={() => (
          <View className="mx-4 h-px bg-gray-200" />
        )}
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
          <Text className="text-xs mt-1 text-emerald-700 font-medium">
            Chats
          </Text>
        </View>

        <Link href="/(screens)/profile" asChild>
          <Pressable className="items-center">
            <Ionicons
              name="person-circle-outline"
              size={22}
              color="#9CA3AF"
            />
            <Text className="text-xs mt-1 text-gray-400">Profile</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
