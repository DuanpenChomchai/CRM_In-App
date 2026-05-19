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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import { getSocket, setSocketAuth } from "../../store/socket";
import { useAuthStore } from "../../store/useAuthStore";
import { HOST, API_BASE_URL, WS_SERVER } from "../../config/api";

type ChatItem = {
  id: string; // roomId เช่น "cust:4"
  name: string;
  time: string;
  lastMessageAt?: string | null; // ISO string จาก backend
  customerId?: number;
  isSaleChat?: boolean; // true = ลูกค้าฝั่งแอพ แชทกับเซลล์
  unreadCount?: number;
  profileUserId?: number | null; // User ID สำหรับโหลดรูป profile
  managerSubtext?: string;
  isAdminChat?: boolean; // true = ห้องแชทของแอดมิน
};

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** แสดงเวลาล่าสุด: ถ้าวันนี้ → "HH:MM", เมื่อวาน → "เมื่อวาน", อื่นๆ → "14 ก.พ." */
function formatLastTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const toKey = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;

  if (toKey(d) === toKey(now)) {
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (toKey(d) === toKey(yesterday)) return "เมื่อวาน";

  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

type WsUnreadPayload = {
  roomId: string; // เช่น "cust:4"
  customerUnread: number;
  saleUnread: number;
};

export default function ChatsScreen() {
  const { user, token } = useAuthStore();

  // ------- debug env / ws --------
  useEffect(() => {
    console.log("HOST =", HOST);
    console.log("API_BASE_URL =", API_BASE_URL);
    console.log("WS_SERVER =", WS_SERVER);
  }, []);

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

  // CUSTOMER: ห้องแชทกับเซลล์ที่ถูก assign ให้เรา
  const [saleChat, setSaleChat] = useState<ChatItem | null>(null);
  const [adminChat, setAdminChat] = useState<ChatItem | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  // SALE: ห้องแชทลูกค้าที่เราเป็นเซลล์ดูแล
  const [saleRooms, setSaleRooms] = useState<ChatItem[]>([]);
  const [loadingSaleRooms, setLoadingSaleRooms] = useState(false);

  // MANAGER: ห้องแชทลูกค้าที่เซลล์ในทีมดูแล
  const [managerRooms, setManagerRooms] = useState<ChatItem[]>([]);
  const [loadingManagerRooms, setLoadingManagerRooms] = useState(false);

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

          if (data.customerId) {
            // Admin Room (Always available)
            setAdminChat({
              id: `admin:cust:${data.customerId}`,
              customerId: data.customerId,
              name: data.adminNames || "ติดต่อแอดมิน",
              time: formatLastTime(data.adminLastMessageAt),
              lastMessageAt: data.adminLastMessageAt ?? null,
              isAdminChat: true,
              unreadCount: data.adminUnreadCount ?? 0,
              profileUserId: null,
            });

            // Sale Room (Only if assigned)
            if (data.sale) {
              setSaleChat({
                id: `cust:${data.customerId}`,
                customerId: data.customerId,
                name: data.sale.name || "Sale",
                time: formatLastTime(data.lastMessageAt),
                lastMessageAt: data.lastMessageAt ?? null,
                isSaleChat: true,
                unreadCount: data.unreadCount ?? 0,
                profileUserId: data.sale.id ?? null,
              });
            } else {
              setSaleChat(null);
            }
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
            time: formatLastTime(c.lastMessageAt),
            lastMessageAt: c.lastMessageAt ?? null,
            unreadCount: c.unreadCount ?? 0,
            profileUserId: c.userId ?? null,
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

  // ===== MANAGER: ดึงลูกค้าทั้งหมดของทีมตัวเอง (รีเฟรชทุกครั้งที่หน้า focus) =====
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const fetchManagerRooms = async () => {
        try {
          if (!token || (user?.role !== "MANAGER" && user?.role !== "ADMIN")) return;

          setLoadingManagerRooms(true);

          const res = await fetch(`${API_BASE_URL}/customers/manager/chats`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            console.log("customers/manager/chats error status:", res.status);
            return;
          }

          const data = await res.json();
          if (cancelled) return;

          const mapped: ChatItem[] = data.flatMap((c: any) => {
            const rooms: ChatItem[] = [];
            
            // Admin Room
            if (user?.role === "ADMIN") {
              rooms.push({
                id: `admin:cust:${c.id}`,
                customerId: c.id,
                name: c.name || `Customer #${c.id}`,
                time: formatLastTime(c.adminLastMessageAt),
                lastMessageAt: c.adminLastMessageAt ?? null,
                unreadCount: c.adminUnreadCount ?? 0,
                profileUserId: c.userId ?? null,
                isAdminChat: true,
              });
            }

            // Sale Room (Only for Manager, not Admin)
            if (user?.role === "MANAGER") {
              rooms.push({
                id: `cust:${c.id}`,
                customerId: c.id,
                name: c.name || `Customer #${c.id}`,
                time: formatLastTime(c.lastMessageAt),
                lastMessageAt: c.lastMessageAt ?? null,
                unreadCount: c.unreadCount ?? 0,
                profileUserId: c.userId ?? null,
                managerSubtext: c.sale?.name ? `Sale: ${c.sale.name}` : "ไม่มีเซลล์ดูแล",
                isSaleChat: false,
              });
            }
            
            return rooms;
          });

          setManagerRooms(mapped);
        } catch (err) {
          console.error("fetchManagerRooms error:", err);
        } finally {
          if (!cancelled) setLoadingManagerRooms(false);
        }
      };

      fetchManagerRooms();

      return () => {
        cancelled = true;
      };
    }, [token, user?.role])
  );

  // ===== ฟัง unread-count จาก WebSocket แล้วอัปเดต badge แบบ realtime =====
  useEffect(() => {
    const handleUnread = (payload: WsUnreadPayload) => {
      if (!user?.role) return;

      if (user.role === "CUSTOMER") {
        if (payload.roomId.startsWith("admin:cust:")) {
          setAdminChat((prev) => {
            if (!prev) return prev;
            if (prev.id !== payload.roomId) return prev;
            return { ...prev, unreadCount: payload.customerUnread };
          });
        } else {
          setSaleChat((prev) => {
            if (!prev) return prev;
            if (prev.id !== payload.roomId) return prev;
            return { ...prev, unreadCount: payload.customerUnread };
          });
        }
      } else if (user.role === "SALE") {
        setSaleRooms((prev) =>
          prev.map((room) =>
            room.id === payload.roomId
              ? { ...room, unreadCount: payload.saleUnread }
              : room
          )
        );
      } else if (user.role === "MANAGER" || user.role === "ADMIN") {
        setManagerRooms((prev) =>
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

    if (user?.role === "CUSTOMER") {
      if (adminChat) rooms.push(adminChat);
      if (saleChat) rooms.push(saleChat);
    }

    if (user?.role === "SALE" && saleRooms.length > 0) {
      rooms.push(...saleRooms);
    }

    if ((user?.role === "MANAGER" || user?.role === "ADMIN") && managerRooms.length > 0) {
      rooms.push(...managerRooms);
    }

    // เรียงตามข้อความล่าสุดไว้บนสุด
    rooms.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      
      // ถ้าไม่มีข้อความทั้งคู่ (เช่นสมัครใหม่) ให้ Admin อยู่บนสุด
      if (ta === 0 && tb === 0) {
        if (a.isAdminChat && !b.isAdminChat) return -1;
        if (!a.isAdminChat && b.isAdminChat) return 1;
        return 0;
      }
      
      return tb - ta;
    });

    return rooms;
  }, [user?.role, saleChat, adminChat, saleRooms, managerRooms]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? allRooms.filter((c) => c.name.toLowerCase().includes(q))
      : allRooms;
  }, [query, allRooms]);

  // ===== สถานะ Socket =====
  useEffect(() => {
    const onConnect = () => {
      console.log("✅ all-chat: socket connected");
      setConnected(true);
    };
    const onDisconnect = () => {
      console.log("❌ all-chat: socket disconnected");
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (!socket.connected) {
      console.log("🔁 all-chat: call socket.connect()");
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  // ===== เวลาแตะห้องแต่ละอัน =====
  const handlePressRoom = (item: ChatItem) => {
    if (user?.role === "CUSTOMER") {
      if (item.id.startsWith("admin:cust:")) {
        setAdminChat((prev) =>
          prev && prev.id === item.id ? { ...prev, unreadCount: 0 } : prev
        );
      } else {
        setSaleChat((prev) =>
          prev && prev.id === item.id ? { ...prev, unreadCount: 0 } : prev
        );
      }
    } else if (user?.role === "SALE") {
      setSaleRooms((prev) =>
        prev.map((room) =>
          room.id === item.id ? { ...room, unreadCount: 0 } : room
        )
      );
    } else if (user?.role === "MANAGER" || user?.role === "ADMIN") {
      // สำหรับผู้จัดการ เราไม่ต้องลบ badge การอ่านจริงของฝั่งเซลล์
      // แต่ลบบน client ก็ได้เพื่อให้รู้ว่าคลิกไปแล้ว หรือจะไม่ลบก็ได้
      // ในที่นี้จะยังไม่ลบเพื่อให้สอดคล้องกับ backend ที่ manager ไม่ทำให้ข้อความถูก mark read
    }

    if (item.customerId != null) {
      router.push({
        pathname: "/(screens)/chat-detail",
        params: {
          id: item.id,
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
          <View className="w-12 h-12 rounded-full bg-emerald-200 items-center justify-center mr-3 overflow-hidden">
            {item.profileUserId && token ? (
              <Image
                source={{
                  uri: `${API_BASE_URL}/users/profile-image/${item.profileUserId}?t=${encodeURIComponent(token)}&b=${item.profileUserId}`,
                }}
                className="w-12 h-12"
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name={item.isSaleChat ? "person" : item.isAdminChat ? "shield-checkmark" : "people"}
                size={20}
                color="#0f5132"
              />
            )}
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

            {item.isAdminChat && user?.role === "CUSTOMER" && (
              <Text className="text-[11px] text-gray-500 mt-0.5">
                แอดมินส่วนกลาง
              </Text>
            )}

            {item.managerSubtext && user?.role !== "CUSTOMER" && (
              <Text className="text-[11px] text-gray-500 mt-0.5">
                {item.managerSubtext}
              </Text>
            )}
          </View>

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

  // ===== Header (ตัดบรรทัดสีเขียวออกแล้ว) =====
  const ListHeader = (
    <View>
      {/* Title */}
      <View className="flex-row items-center px-4 bg-white pt-2">
        <View className="flex-1 items-center -ml-6 py-2">
          <Text className="text-lg font-semibold text-gray-900 text-center">
            Chats {connected ? "🟢" : "🔴"}
          </Text>
        </View>
        <View className="w-6" />
      </View>

      {/* Search bar */}
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

      {/* Status ข้างล่าง (ยังอยู่เหมือนเดิม) */}
      <View className="px-4 pb-2 bg-white">
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

        {loadingManagerRooms && (user?.role === "MANAGER" || user?.role === "ADMIN") && (
          <View className="mt-2">
            <Text className="text-[11px] text-gray-400">
              กำลังโหลดแชทของคนในทีม...
            </Text>
          </View>
        )}
        {!loadingManagerRooms &&
          (user?.role === "MANAGER" || user?.role === "ADMIN") &&
          managerRooms.length === 0 && (
            <View className="mt-2">
              <Text className="text-[11px] text-gray-400">
                ไม่มีแชทของลูกค้าในทีมของคุณ
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

      {/* bottom tab */}
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
