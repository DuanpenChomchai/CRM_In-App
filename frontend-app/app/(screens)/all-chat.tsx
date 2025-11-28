// app/(screens)/all-chat.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
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
import { Link, router, Href, useFocusEffect } from "expo-router";
import { getSocket, setSocketAuth } from "../../store/socket";
import { useAuthStore } from "../../store/useAuthStore";
import { HOST, API_BASE_URL } from "../../config/api";


type ChatItem = {
  id: string; // roomId เช่น "cust:4"
  name: string;
  time: string;
  customerId?: number;
  isSaleChat?: boolean; // true = ลูกค้าฝั่งแอพ แชทกับเซลล์
  unreadCount?: number;
};

type WsUnreadPayload = {
  roomId: string; // เช่น "cust:4"
  customerUnread: number;
  saleUnread: number;
};

// // ✅ ใช้ได้ทั้ง emulator และมือถือจริง
// const HOST: string = Platform.select<string>({
//   ios: "http://localhost:3000",
//   android: "http://10.0.2.2:3000",
//   default: "http://172.24.4.22:3000",
// })!;
// const API_BASE_URL = `${HOST}/api`;

export default function ChatsScreen() {
  const { user, token } = useAuthStore();

  // --------- ตั้งค่า auth ให้ socket ตอน user/token เปลี่ยน ----------
  useEffect(() => {
    setSocketAuth({
      token: token ?? null,
      role: user?.role ?? null,
      userId: user?.id ?? null,
    });
  }, [token, user?.role, user?.id]);

  const socket = getSocket();
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [query, setQuery] = useState("");
  const [customRoomName, setCustomRoomName] = useState("");

  // CUSTOMER: ห้องแชทกับเซลล์ที่ถูก assign ให้เรา
  const [saleChat, setSaleChat] = useState<ChatItem | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  // SALE: ห้องแชทลูกค้าที่เราเป็นเซลล์ดูแล
  const [saleRooms, setSaleRooms] = useState<ChatItem[]>([]);
  const [loadingSaleRooms, setLoadingSaleRooms] = useState(false);

  // ===== CUSTOMER: ดึงเซลล์ที่ดูแลลูกค้าที่ล็อกอิน (รีเฟรชทุกครั้งที่หน้า focus) =====
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

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

          // { customerId, customerName, sale: {...} | null, unreadCount }
          const data = await res.json();

          if (cancelled) return;

          if (data.sale) {
            setSaleChat({
              id: `cust:${data.customerId}`,
              customerId: data.customerId,
              name: data.sale.name || "Sale",
              time: "Now",
              isSaleChat: true,
              // ✅ ฝั่งลูกค้าใช้จำนวนข้อความที่ลูกค้ายังไม่อ่าน
              unreadCount: data.unreadCount ?? 0,
            });
          } else {
            setSaleChat(null);
          }
        } catch (err) {
          console.error("fetchSaleChat error:", err);
        } finally {
          if (!cancelled) setLoadingSale(false);
        }
      };

      fetchSaleChat();

      return () => {
        cancelled = true;
      };
    }, [token, user?.role])
  );

  // ===== SALE: ดึงลูกค้าที่เราเป็นเซลล์ดูแล (รีเฟรชทุกครั้งที่หน้า focus) =====
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchSaleRooms = async () => {
        try {
          if (!token || user?.role !== "SALE" || !user?.id) return;

          setLoadingSaleRooms(true);

          const res = await fetch(
            `${API_BASE_URL}/customers/sale/${user.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!res.ok) {
            console.log("customers/sale error status:", res.status);
            return;
          }

          // data: [{ id, name, email, unreadCount }, ...]
          const data = await res.json();
          if (cancelled) return;

          const mapped: ChatItem[] = data.map((c: any) => ({
            id: `cust:${c.id}`,
            customerId: c.id,
            name: c.name || `Customer #${c.id}`,
            time: "Now",
            // ✅ ฝั่งเซลล์ใช้ unread ของเซลล์เอง
            unreadCount: c.unreadCount ?? 0,
          }));

          setSaleRooms(mapped);
        } catch (err) {
          console.error("fetchSaleRooms error:", err);
        } finally {
          if (!cancelled) setLoadingSaleRooms(false);
        }
      };

      fetchSaleRooms();

      return () => {
        cancelled = true;
      };
    }, [token, user?.role, user?.id])
  );

  // ===== ฟัง unread-count จาก WebSocket แล้วอัปเดต badge แบบ realtime =====
  useEffect(() => {
    const handleUnread = (payload: WsUnreadPayload) => {
      if (!user?.role) return;

      if (user.role === "CUSTOMER") {
        // ลูกค้ามีห้องเดียว (saleChat) → ใช้ customerUnread
        setSaleChat((prev) => {
          if (!prev) return prev;
          if (prev.id !== payload.roomId) return prev;
          return { ...prev, unreadCount: payload.customerUnread };
        });
      } else if (user.role === "SALE") {
        // เซลล์มีหลายห้อง → ใช้ saleUnread ของห้องที่ตรง roomId
        setSaleRooms((prev) =>
          prev.map((room) =>
            room.id === payload.roomId
              ? { ...room, unreadCount: payload.saleUnread }
              : room
          )
        );
      }
    };

    socket.on("unread-count", handleUnread);
    return () => {
      socket.off("unread-count", handleUnread);
    };
  }, [socket, user?.role]);

  // ===== รวมรายการห้อง =====
  const allRooms = useMemo<ChatItem[]>(() => {
    const rooms: ChatItem[] = [];

    if (user?.role === "CUSTOMER" && saleChat) {
      rooms.push(saleChat);
    }

    if (user?.role === "SALE" && saleRooms.length > 0) {
      rooms.push(...saleRooms);
    }

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
  const handlePressRoom = (item: ChatItem) => {
    // 1) เคลียร์ badge ใน state ทันที
    if (user?.role === "CUSTOMER") {
      setSaleChat((prev) =>
        prev && prev.id === item.id ? { ...prev, unreadCount: 0 } : prev
      );
    } else if (user?.role === "SALE") {
      setSaleRooms((prev) =>
        prev.map((room) =>
          room.id === item.id ? { ...room, unreadCount: 0 } : room
        )
      );
    }

    // 2) นำทางไปหน้า chat-detail
    if (item.customerId != null) {
      router.push({
        pathname: "/(screens)/chat-detail",
        params: {
          customerId: String(item.customerId),
          name: item.name,
        },
      });
    } else {
      router.push({
        pathname: "/(screens)/chat-detail",
        params: {
          id: item.id,
          name: item.name,
        },
      });
    }
  };

  const renderItem = ({ item }: { item: ChatItem }) => {
    return (
      <Pressable
        className="px-4 active:opacity-70"
        onPress={() => handlePressRoom(item)}
      >
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

          {/* เวลา + badge */}
          <View className="items-end">
            <Text className="text-xs text-gray-500 mb-1">
              {item.time}
            </Text>

            {item.unreadCount !== undefined && item.unreadCount > 0 && (
              <View className="min-w-[20px] px-1.5 h-5 rounded-full bg-red-500 items-center justify-center">
                <Text className="text-[11px] text-white font-semibold">
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
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

  // Header ทั้งหมด
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
