// app/(screens)/chat-detail.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useSocketRoom, generateCid } from "../../store/socket";
import { useAuthStore } from "../../store/useAuthStore";
import { useIsFocused } from "@react-navigation/native"; // ✅ เพิ่ม
import { HOST, API_BASE_URL, WS_SERVER } from "../../config/api";


type Msg =
  | {
      id: string;
      fromMe: boolean;
      type: "text";
      text: string;
      time: string;
      cid?: string | number;
    }
  | {
      id: string;
      fromMe: boolean;
      type: "audio";
      durationSec: number;
      time: string;
    };

function formatClock(t = new Date()) {
  const h = t.getHours().toString().padStart(2, "0");
  const m = t.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}
function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type ChatPartner = {
  name: string;
  avatarUrl?: string | null;
};

export default function ChatDetailScreen() {
  const params = useLocalSearchParams();
  const idParam = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string | undefined);
  const nameParam = Array.isArray(params.name)
    ? params.name[0]
    : (params.name as string | undefined);

  const customerIdParam = Array.isArray(params.customerId)
    ? Number(params.customerId[0])
    : params.customerId
    ? Number(params.customerId as string)
    : undefined;

  const roomId = customerIdParam
    ? `cust:${customerIdParam}`
    : idParam ?? "general";

  const { user, token } = useAuthStore();
  const isFocused = useIsFocused(); // ✅ ใช้เช็คว่าหน้านี้กำลัง active อยู่ไหม

  // ✅ ใช้ username ให้คงที่
  const username = useMemo(
    () => user?.name || user?.email || nameParam || "User",
    [user?.name, user?.email, nameParam]
  );

  const {
    connected,
    messages: socketMessages,
    sendText: sendSocketText,
    startTyping,
    othersTyping,
  } = useSocketRoom(roomId, username);

  // ===== ดึงข้อมูล "คนที่เราคุยด้วย" =====
  const [partner, setPartner] = useState<ChatPartner | null>(null);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        if (!token) return;

        if (user?.role === "CUSTOMER") {
          const res = await fetch(`${API_BASE_URL}/customers/my-sale`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            console.log("my-sale error:", res.status);
            return;
          }
          const data = await res.json();
          if (data.sale) {
            setPartner({
              name: data.sale.name || "Sale",
              avatarUrl: data.sale.img ?? null,
            });
          }
        } else if (user?.role === "SALE" && customerIdParam) {
          const res = await fetch(
            `${API_BASE_URL}/customers/${customerIdParam}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!res.ok) {
            console.log("customer detail error:", res.status);
            return;
          }
          const c = await res.json();
          setPartner({
            name: c.name || `Customer #${c.id}`,
            avatarUrl: c.img ?? null,
          });
        } else {
          setPartner(null);
        }
      } catch (err) {
        console.error("fetchPartner error:", err);
      }
    };

    if (isFocused) {
      // ✅ โฟกัสแล้วค่อยดึง
      fetchPartner();
    }
  }, [token, user?.role, customerIdParam, isFocused]);

  // ===== โหลดประวัติแชทเก่าจาก DB =====
  const [historyMessages, setHistoryMessages] = useState<Msg[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        if (!token || !isFocused) return; // ✅ ต้องโฟกัส+มี token

        setLoadingHistory(true);

        console.log("🔍 fetch history for roomId:", roomId);

        const res = await fetch(
          `${API_BASE_URL}/chat/room/${encodeURIComponent(
            roomId
          )}?pageSize=200`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("history status:", res.status);

        if (!res.ok) {
          console.log("fetch history error:", res.status);
          return;
        }

        const json = await res.json();
        console.log("history json:", json);

        const arr = Array.isArray(json)
          ? json
          : Array.isArray(json.data)
          ? json.data
          : [];

        const mapped: Msg[] = arr.map((m: any) => ({
          id: String(m.id),
          fromMe:
            (m.senderId && user?.id && m.senderId === user.id) ||
            m.senderName === username,
          type: "text",
          text: m.text,
          time: formatClock(new Date(m.createdAt)),
          cid: m.cid ?? undefined,
        }));

        if (!cancelled) {
          setHistoryMessages(mapped);
        }
      } catch (err) {
        console.error("fetchHistory error:", err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [roomId, token, user?.id, username, isFocused]); // ✅ เพิ่ม isFocused

  // ===== mark ห้องนี้ว่าอ่านแล้ว =====
  useEffect(() => {
    if (!token || !customerIdParam || !isFocused) return; // ✅ ต้องเป็นห้องลูกค้า + โฟกัส

    const markRead = async () => {
      try {
        console.log("📩 mark-read customerId =", customerIdParam);
        await fetch(`${API_BASE_URL}/chat/mark-read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ customerId: customerIdParam }),
        });
      } catch (err) {
        console.error("markRoomAsRead error:", err);
      }
    };

    markRead();
  }, [token, customerIdParam, isFocused]); // ✅ เพิ่ม isFocused

  // ===== Voice recording (UI only) =====
  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordSec(0);
  };
  const stopAndSend = () => {
    if (!isRecording) return;
    const duration = recordSec;
    setIsRecording(false);
    setRecordSec(0);
    if (duration > 0) {
      setLocalAudio((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          fromMe: true,
          type: "audio",
          durationSec: duration,
          time: formatClock(new Date()),
        },
      ]);
    }
  };
  const cancelRecording = () => {
    setIsRecording(false);
    setRecordSec(0);
  };

  useEffect(() => {
    if (isRecording)
      timerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const [localAudio, setLocalAudio] = useState<Msg[]>([]);
  const [localTextBuf, setLocalTextBuf] = useState<Msg[]>([]);

  const textMsgs: Msg[] = useMemo(
    () =>
      socketMessages.map((m) => ({
        id: m.id,
        fromMe: m.user === username,
        type: "text",
        text: m.text,
        time: formatClock(new Date(m.ts)),
        cid: m.cid,
      })),
    [socketMessages, username]
  );

  useEffect(() => {
    if (socketMessages.length === 0) return;
    const last = socketMessages[socketMessages.length - 1];
    if (last.user === username && last.cid != null) {
      setLocalTextBuf((prev) => prev.filter((t: any) => t.cid !== last.cid));
    }
  }, [socketMessages, username]);

  const mergedMessages: Msg[] = useMemo(
    () => [...historyMessages, ...textMsgs, ...localAudio, ...localTextBuf],
    [historyMessages, textMsgs, localAudio, localTextBuf]
  );

  const [input, setInput] = useState("");

  const listRef = useRef<FlatList<Msg>>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [mergedMessages.length]);

  const onSend = () => {
    const t = input.trim();
    if (!t) return;

    const cid = generateCid();

    setLocalTextBuf((prev) => [
      ...prev,
      {
        id: `temp-${cid}`,
        cid,
        fromMe: true,
        type: "text",
        text: t,
        time: formatClock(new Date()),
      },
    ]);

    sendSocketText(t, cid);
    setInput("");
  };

  const renderMessage = ({ item }: { item: Msg }) => {
    const isMe = item.fromMe;
    const align = isMe ? "items-end" : "items-start";
    const bg = isMe ? "bg-emerald-600" : "bg-gray-100";
    const textColor = isMe ? "text-white" : "text-gray-900";
    const subColor = isMe ? "text-emerald-100" : "text-gray-400";

    return (
      <View className={`mb-2 ${align}`}>
        <View className={`max-w-[78%] rounded-2xl px-3 py-2 ${bg}`}>
          {item.type === "text" ? (
            <>
              <Text className={`${textColor} text-[15px]`}>{item.text}</Text>
              <Text className={`${subColor} text-[10px] mt-1`}>
                {item.time}
              </Text>
            </>
          ) : (
            <>
              <View className="flex-row items-center">
                <View
                  className={`w-8 h-8 rounded-full ${
                    isMe ? "bg-emerald-700" : "bg-gray-200"
                  } items-center justify-center mr-2`}
                >
                  <Ionicons
                    name="play"
                    size={16}
                    color={isMe ? "#ffffff" : "#111827"}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`${textColor} text-[15px]`}>
                    Voice message
                  </Text>
                  <Text className={`${subColor} text-[11px]`}>
                    {formatDuration((item as any).durationSec)}
                  </Text>
                </View>
              </View>
              <Text className={`${subColor} text-[10px] mt-1`}>
                {item.time}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = useMemo(
    () => (
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Link href="/(screens)/all-chat" asChild>
          <Pressable className="pr-3 -ml-2">
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
        </Link>

        {/* avatar + ชื่อคู่สนทนา */}
        <View className="flex-row flex-1 items-center">
          {partner?.avatarUrl ? (
            <Image
              source={{ uri: partner.avatarUrl }}
              className="w-9 h-9 rounded-full mr-3"
            />
          ) : (
            <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center mr-3">
              <Ionicons name="person" size={20} color="#047857" />
            </View>
          )}

          <View className="flex-1">
            <Text
              className="text-base font-semibold text-gray-900"
              numberOfLines={1}
            >
              {partner?.name ?? nameParam ?? "Chat"}
            </Text>
            <Text className="text-xs text-gray-500">
              ID: {roomId} · {connected ? "🟢 Online" : "🔴 Offline"}
            </Text>
          </View>
        </View>

        <Pressable className="pl-3" onPress={() => {}}>
          <Ionicons name="call-outline" size={20} color="#047857" />
        </Pressable>
      </View>
    ),
    [roomId, nameParam, connected, partner]
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {ListHeader}

      <FlatList
        ref={listRef}
        data={mergedMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={renderMessage}
        ListEmptyComponent={
          loadingHistory ? (
            <View className="py-8 items-center">
              <Text className="text-xs text-gray-400">
                กำลังโหลดประวัติแชท...
              </Text>
            </View>
          ) : (
            <View className="py-8 items-center">
              <Text className="text-xs text-gray-400">
                ยังไม่มีประวัติการคุย
              </Text>
            </View>
          )
        }
      />

      {othersTyping.length > 0 && (
        <View className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
          <Text className="text-emerald-700 text-xs">
            {othersTyping.join(", ")} is typing…
          </Text>
        </View>
      )}

      {isRecording && (
        <View className="px-3 py-2 bg-rose-50 border-t border-rose-200">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-rose-100 items-center justify-center mr-2">
              <Ionicons name="mic" size={16} color="#be123c" />
            </View>
            <View className="flex-1">
              <Text className="text-rose-700 font-medium">
                Recording... {formatDuration(recordSec)}
              </Text>
              <Text className="text-rose-400 text-xs">
                UI only — no audio file saved
              </Text>
            </View>

            <Pressable
              className="px-3 py-2 rounded-xl bg-rose-100 mr-2"
              onPress={cancelRecording}
            >
              <Ionicons name="trash-outline" size={18} color="#be123c" />
            </Pressable>

            <Pressable
              className="px-3 py-2 rounded-xl bg-emerald-600"
              onPress={stopAndSend}
            >
              <View className="flex-row items-center">
                <Ionicons name="stop" size={14} color="#ffffff" />
                <Text className="text-white ml-2">Stop</Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-3 py-2 border-t border-gray-200 bg-white">
          <Pressable className="px-2 py-2">
            <Ionicons name="add-circle-outline" size={22} color="#6B7280" />
          </Pressable>

          <View
            className={`flex-1 mx-2 rounded-2xl px-3 ${
              isRecording ? "bg-gray-200" : "bg-gray-100"
            }`}
          >
            <TextInput
              className="py-2"
              placeholder={isRecording ? "Recording..." : "Message"}
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={(v) => {
                setInput(v);
                if (v.trim().length > 0) startTyping();
              }}
              editable={!isRecording}
              returnKeyType="send"
              onSubmitEditing={onSend}
            />
          </View>

          {input.trim().length > 0 && !isRecording ? (
            <Pressable
              className="px-3 py-2 rounded-2xl"
              onPress={onSend}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="send" size={20} color="#047857" />
            </Pressable>
          ) : (
            <Pressable
              className={`px-3 py-2 rounded-2xl ${
                isRecording ? "bg-rose-100" : ""
              }`}
              onPress={isRecording ? stopAndSend : startRecording}
              onLongPress={startRecording}
              delayLongPress={120}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons
                name="mic"
                size={20}
                color={isRecording ? "#be123c" : "#6B7280"}
              />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
