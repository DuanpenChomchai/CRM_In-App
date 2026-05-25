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
  Modal,
  Linking,
  Keyboard,
  Alert,
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useSocketRoom, generateCid, getSocket } from "../../store/socket";
import { useAuthStore } from "../../store/useAuthStore";
import { useIsFocused } from "@react-navigation/native";
import { API_BASE_URL } from "../../config/api";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av";


// ===============================
// Utils
// ===============================
function formatClock(t = new Date()) {
  const h = t.getHours().toString().padStart(2, "0");
  const m = t.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatDateLabel(ts: number): string {
  const msgDate = new Date(ts);
  const today = new Date();

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  if (toDateKey(msgDate) === toDateKey(today)) return "วันนี้";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (toDateKey(msgDate) === toDateKey(yesterday)) return "เมื่อวาน";

  const d = msgDate.getDate();
  const m = THAI_MONTHS[msgDate.getMonth()];
  const y = msgDate.getFullYear() + 543; // พ.ศ.
  return `${d} ${m} ${y}`;
}

type ChatPartner = {
  name: string;
  avatarUrl?: string | null;
  userId?: number | null;
};

type BaseMsg = {
  id: string;
  fromMe: boolean;
  time: string;
  ts: number;
  cid?: string | number;
  readByOther?: boolean; // ฝั่งตรงข้ามอ่านแล้วหรือยัง
  isDeleted?: boolean;
};

type Msg =
  | (BaseMsg & { type: "text"; text: string })
  | (BaseMsg & {
      type: "image";
      uri: string | null;
      name?: string;
      fileKey?: string | null;
    })
  | (BaseMsg & {
      type: "file";
      uri: string | null;
      name: string; // ✅ ต้องใช้แสดงชื่อไฟล์ (PDF)
      size?: number | null;
      mimeType?: string | null;
      fileKey?: string | null;
    });

const guessMimeFromName = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "xls") return "application/vnd.ms-excel";
  if (ext === "xlsx")
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
};

const normalizeEmail = (v?: string | null) => String(v || "").trim().toLowerCase();

/** ========= DEDUPE HELPERS ========= */
const isTempId = (id: string) =>
  id.startsWith("temp-") || id.startsWith("img-") || id.startsWith("file-");

const msgKey = (m: Msg) => {
  if (m.cid != null && String(m.cid).trim() !== "") return `cid:${String(m.cid)}`;
  return `id:${m.id}`;
};

const pickBetter = (a: Msg, b: Msg): Msg => {
  const aTemp = isTempId(a.id);
  const bTemp = isTempId(b.id);
  if (aTemp !== bTemp) return aTemp ? b : a;

  if (a.type === "image" && b.type === "image") {
    const au = !!a.uri;
    const bu = !!b.uri;
    if (au !== bu) return au ? a : b;
  }
  if (a.type === "file" && b.type === "file") {
    const au = !!a.uri;
    const bu = !!b.uri;
    if (au !== bu) return au ? a : b;
  }

  // ✅ ให้ความสำคัญกับอันที่มีการระบุว่า "อ่านแล้ว" (readByOther)
  if (a.readByOther !== b.readByOther) {
    return (a as any).readByOther ? a : b;
  }

  return a.ts >= b.ts ? a : b;
};

const mergeAndDedupe = (lists: Msg[][]) => {
  const map = new Map<string, Msg>();
  for (const list of lists) {
    for (const m of list) {
      const k = msgKey(m);
      const prev = map.get(k);
      map.set(k, prev ? pickBetter(prev, m) : m);
    }
  }
  return Array.from(map.values()).sort((x, y) => x.ts - y.ts);
};
/** =============================== */

const AudioMessagePlayer = ({ item, isMe, textColor, subColor, onRefresh }: any) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const loadAndPlay = async () => {
    try {
      if (!item.uri) {
        if (onRefresh) await onRefresh();
        // Return so the user has to tap again once the URI is loaded
        return; 
      }
      
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          // If the position is at the end, reset to 0 before playing
          if (position >= duration && duration > 0) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
        }
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: item.uri },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              newSound.pauseAsync();
              newSound.setPositionAsync(0);
              setIsPlaying(false);
            }
          }
        }
      );
      setSound(newSound);
    } catch (err) {
      console.log("Audio play error", err);
    }
  };

  const skipBackward = async () => {
    if (!sound) return;
    const newPos = Math.max(0, position - 10000);
    await sound.setPositionAsync(newPos);
  };

  const skipForward = async () => {
    if (!sound) return;
    const newPos = Math.min(duration, position + 10000);
    await sound.setPositionAsync(newPos);
  };

  const formatAudioTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ width: 240, paddingVertical: 4 }}>
      {/* ── Header: Phone icon & Title ── */}
      <View className="flex-row items-center mb-4">
        <View
          className={`w-10 h-10 rounded-full ${isMe ? "bg-emerald-700" : "bg-gray-200"} items-center justify-center mr-3`}
        >
          <Ionicons name="mic" size={20} color={isMe ? "#fff" : "#111827"} />
        </View>
        <View>
          <Text className={`${textColor} text-[15px] font-medium`}>
            การโทรแบบเสียง
          </Text>
          <Text className={`${subColor} text-[12px] mt-0.5`}>
            บันทึกเสียงสนทนา
          </Text>
        </View>
      </View>

      {/* ── Audio Player Controls ── */}
      <View className="mt-1">
        {/* Progress Bar & Times */}
        <View className="mb-1">
          <View className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: isMe ? "rgba(255,255,255,0.3)" : "#E5E7EB" }}>
            <View className={`${isMe ? "bg-white" : "bg-emerald-500"} h-full`} style={{ width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }} />
          </View>
          <View className="flex-row justify-between">
            <Text className={`${subColor} text-[10px] font-medium`}>
              {formatAudioTime(position)}
            </Text>
            {duration > 0 ? (
              <Text className={`${subColor} text-[10px] font-medium`}>
                {formatAudioTime(duration)}
              </Text>
            ) : !item.uri ? (
              <Text className={`${subColor} text-[10px] font-medium`}>แตะเพื่อโหลด</Text>
            ) : null}
          </View>
        </View>

        {/* Playback Buttons (Centered Below) */}
        <View className="flex-row items-center justify-center pt-1 mb-1">
          {/* Skip Back */}
          <Pressable onPress={skipBackward} className="mr-6" style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <MaterialIcons name="replay-10" size={26} color={isMe ? "#fff" : "#374151"} />
          </Pressable>

          <Pressable
            onPress={loadAndPlay}
            className={`w-11 h-11 rounded-full items-center justify-center ${isMe ? "bg-emerald-700" : "bg-gray-200"}`}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={22} color={isMe ? "#fff" : "#374151"} style={{ marginLeft: isPlaying ? 0 : 3 }} />
          </Pressable>

          {/* Skip Forward */}
          <Pressable onPress={skipForward} className="ml-6" style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <MaterialIcons name="forward-10" size={26} color={isMe ? "#fff" : "#374151"} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const idParam = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);
  const nameParam = Array.isArray(params.name) ? params.name[0] : (params.name as string | undefined);

  const customerIdParam = Array.isArray(params.customerId)
    ? Number(params.customerId[0])
    : params.customerId
    ? Number(params.customerId as string)
    : undefined;

  const { user, token } = useAuthStore();
  const isFocused = useIsFocused();

  const myEmail = useMemo(() => normalizeEmail(user?.email), [user?.email]);
  const myUserId = user?.id ?? null;

  // =========================================================
  // CUSTOMER: หา customerId ของตัวเอง
  // =========================================================
  const [myCustomerId, setMyCustomerId] = useState<number | null>(null);

  useEffect(() => {
    const loadMyCustomerId = async () => {
      try {
        if (!token) return;
        if (user?.role !== "CUSTOMER") return;

        const res = await fetch(`${API_BASE_URL}/chat/my-messages?pageSize=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const json = await res.json();
        if (json?.customerId) setMyCustomerId(Number(json.customerId));
      } catch (e) {
        console.log("[loadMyCustomerId] error:", e);
      }
    };

    if (isFocused) loadMyCustomerId();
  }, [token, user?.role, isFocused]);

  const effectiveCustomerId = customerIdParam ?? (user?.role === "CUSTOMER" ? myCustomerId : null);
  const effectiveRoomId = idParam ?? (effectiveCustomerId ? `cust:${effectiveCustomerId}` : "general");

  const [avatarError, setAvatarError] = useState(false);

  // =========================================================
  // socket
  // =========================================================
  const {
    connected,
    messages: socketMessages,
    sendText: sendSocketText,
    sendMessage,
    unsendMessage,
    startTyping,
    othersTyping,
  } = useSocketRoom(effectiveRoomId, myEmail || "user");

  // =========================================================
  // signed url helpers (GET for preview + PUT for direct upload)
  // =========================================================
  const getSignedUrlForKey = async (key?: string | null) => {
    if (!key || !token) return null;
    // ✅ ใช้ proxy ผ่านพอร์ต 3000 (เหมือนรูปโปรไฟล์) เพื่อแก้ปัญหาพอร์ต 9000 โดนบล็อก
    return `${API_BASE_URL}/files/object?key=${encodeURIComponent(key)}&t=${encodeURIComponent(token)}`;
  };

  // ✅ UPLOAD TO BACKEND PROXY (Port 3000) - Fix Connection Timeout on Port 9000
  const uploadDirectToMinio = async (
    localUri: string,
    fileName: string,
    mimeType: string,
    size?: number | null
  ) => {
    if (!token) throw new Error("no token");

    // iOS file:// handling
    const safeUri = Platform.OS === "ios" && localUri.startsWith("file://")
      ? localUri.replace("file://", "")
      : localUri;

    const formData = new FormData();
    formData.append("originalname", encodeURIComponent(fileName));
    formData.append("file", {
      uri: safeUri,
      name: "upload_file_" + Date.now(), // ใช้ชื่อไฟล์ชั่วคราวที่เป็นภาษาอังกฤษ เพื่อป้องกัน fetch error จากภาษาไทย
      type: mimeType || "application/octet-stream",
    } as any);

    console.log(`[uploadDirectToMinio] POST to ${API_BASE_URL}/chat/upload`);

    const res = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[uploadDirectToMinio] error:", res.status, t);
      throw new Error(`Upload failed: ${res.status} ${t}`);
    }

    const data = await res.json();
    return {
      fileKey: data.fileKey,
      fileName: data.fileName,
      mimeType: data.mimeType,
      size: data.size || size || null,
    };
  };

  // =========================================================
  // send -> /chat/send (save message metadata)
  // =========================================================
  const sendToServer = async (payload: {
    roomId: string;
    customerId?: number | null;
    cid?: string | number | null;
    type: "TEXT" | "IMAGE" | "FILE";
        text?: string | null;
    fileKey?: string | null;
    fileName?: string | null;
    fileMime?: string | null;
    fileSize?: number | null;
  }): Promise<{
    id: number;
    roomId: string;
    customerId: number | null;
    cid: string;
    type: string;
    text: string | null;
    createdAt: string;
    [key: string]: any;
  }> => {
    if (!token) throw new Error("no token");

    const res = await fetch(`${API_BASE_URL}/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`send failed: ${res.status} ${t}`);
    }

    return await res.json();
  };
  // =========================================================
  // partner
  // =========================================================
  const [partner, setPartner] = useState<ChatPartner | null>(null);

  // สำหรับ MANAGER ถือเสมือนเซลล์เป็น "Me"
  const [targetSaleUserId, setTargetSaleUserId] = useState<number | null>(null);
  const [targetSaleEmail, setTargetSaleEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchPartner = async () => {
      try {
        if (!token) return;

        if (user?.role === "CUSTOMER") {
          const res = await fetch(`${API_BASE_URL}/customers/my-sale`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (effectiveRoomId.startsWith("admin:")) {
            setPartner({
              name: "Admin",
              avatarUrl: null,
              userId: data.adminId || 1, // ใช้ adminId จาก backend หรือ fallback เป็น 1
            });
          } else {
            if (data.sale) {
              const avatarUrl = data.sale.id
                ? `${API_BASE_URL}/users/profile-image/${data.sale.id}?t=${encodeURIComponent(token)}&b=${Date.now()}`
                : null;
              setPartner({ name: data.sale.name || "Sale", avatarUrl, userId: data.sale.id });
            } else {
              setPartner(null);
            }
          }
        } else if ((user?.role === "SALE" || user?.role === "MANAGER" || user?.role === "ADMIN") && effectiveCustomerId) {
          const res = await fetch(`${API_BASE_URL}/customers/${effectiveCustomerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const c = await res.json();
          const userId = c.userId ?? c.user?.id ?? null;
          const avatarUrl = userId
            ? `${API_BASE_URL}/users/profile-image/${userId}?t=${encodeURIComponent(token)}&b=${Date.now()}`
            : null;
          setPartner({ name: c.name || `Customer #${c.id}`, avatarUrl, userId });

          if ((user?.role === "MANAGER" || user?.role === "ADMIN") && c.sale) {
            setTargetSaleUserId(c.sale.id);
            setTargetSaleEmail(c.sale.email);
          }
        } else {
          setPartner(null);
        }
        setAvatarError(false); // Reset error state on new fetch
      } catch (err) {
        console.error("[fetchPartner] error:", err);
      }
    };

    if (isFocused) fetchPartner();
  }, [token, user?.role, effectiveCustomerId, effectiveRoomId, isFocused]);

  // =========================================================
  // history
  // =========================================================
  const [historyMessages, setHistoryMessages] = useState<Msg[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [localTextBuf, setLocalTextBuf] = useState<Msg[]>([]);
  const [localAttachBuf, setLocalAttachBuf] = useState<Msg[]>([]);

  useEffect(() => {
    setHistoryMessages([]);
    setLocalTextBuf([]);
    setLocalAttachBuf([]);
  }, [effectiveRoomId]);

  // ✅ ย้ายออกมาข้างนอกเพื่อให้ textMsgs เข้าถึงได้
  const computeFromMe = (m: any, forcedSaleUserId?: number | null, forcedSaleEmail?: string | null) => {
    // 1) เช็คจาก ID (ถ้ามี)
    const senderId = m.senderId ?? m.userId ?? null;
    if (senderId != null) {
      if (myUserId != null && Number(senderId) === Number(myUserId)) return true;
      const chkSaleId = forcedSaleUserId ?? targetSaleUserId;
      if (chkSaleId != null && Number(senderId) === Number(chkSaleId)) return true;
    }

    // 2) เช็คจาก Email/Name (รองรับทั้ง Socket Payload และ DB Object)
    const senderEmail = normalizeEmail(m.user ?? m.senderName ?? m.senderEmail ?? m.sender ?? "");
    if (senderEmail) {
      if (myEmail && senderEmail === myEmail) return true;
      const chkSaleEmail = forcedSaleEmail ?? targetSaleEmail;
      if (chkSaleEmail && senderEmail === normalizeEmail(chkSaleEmail)) return true;
    }

    return false;
  };

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        if (!token || !isFocused) return;
        setLoadingHistory(true);

        const res = await fetch(`${API_BASE_URL}/chat/room/${encodeURIComponent(effectiveRoomId)}?pageSize=200`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const json = await res.json();
        const arr = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];

        // ถ้าเป็น MANAGER จำเป็นต้องรู้ตัวเซลล์ก่อนจึงจะคำนวณ isFromMe ของประวัติได้ถูก
        let localSaleUserId = targetSaleUserId;
        let localSaleEmail = targetSaleEmail;

        if ((user?.role === "MANAGER" || user?.role === "ADMIN") && !localSaleUserId && effectiveCustomerId) {
          try {
            const cres = await fetch(`${API_BASE_URL}/customers/${effectiveCustomerId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (cres.ok) {
              const cjson = await cres.json();
              if (cjson.sale) {
                localSaleUserId = cjson.sale.id;
                localSaleEmail = cjson.sale.email;
              }
            }
          } catch (e) {
            console.warn("fetch customer for manager failed", e);
          }
        }

        const mappedBase: Msg[] = arr.map((m: any) => {
          const t = String(m.type || "TEXT").toUpperCase();
          const fileKey = m.fileKey ?? m.filekey ?? m.imgMessage ?? m.fileMessage ?? null;

          const createdAt = new Date(m.createdAt || Date.now());
          const ts = createdAt.getTime();

          const isFromMe = computeFromMe(m, localSaleUserId, localSaleEmail);

          // ✅ ถ้าเราเป็น SALE → ดูว่า Customer อ่านหรือยัง (readByCustomerAt)
          // ✅ ถ้าเราเป็น CUSTOMER → ดูว่า Sale อ่านหรือยัง (readBySaleAt)
          let readByOther = false;
          if (isFromMe) {
            if (user?.role === "SALE") {
              readByOther = !!m.readByCustomerAt;
            } else if (user?.role === "CUSTOMER") {
              readByOther = !!m.readBySaleAt;
            }
          }

          const base: BaseMsg = {
            id: String(m.id),
            fromMe: isFromMe,
            time: formatClock(createdAt),
            ts,
            cid: m.cid ?? undefined,
            readByOther,
            isDeleted: !!m.isDeleted,
          };

          if (t === "IMAGE") {
            return {
              ...base,
              type: "image",
              uri: null,
              fileKey,
              name: m.fileName ?? m.filename ?? m.file_name ?? undefined, // เก็บไว้ แต่ไม่แสดง
            };
          }

          if (t === "FILE") {
            return {
              ...base,
              type: "file",
              uri: null,
              fileKey,
              name: m.fileName ?? m.filename ?? m.file_name ?? "file",
              size: m.fileSize ?? m.size ?? null,
              mimeType: m.fileMime ?? m.mimeType ?? m.mimetype ?? null,
            };
          }

          return { ...base, type: "text", text: m.text ?? "" };
        });

        if (cancelled) return;
        setHistoryMessages(mappedBase);

        const needSign = mappedBase.filter(
          (x) => (x.type === "image" || x.type === "file") && (x as any).fileKey
        );

        const signedPairs = await Promise.all(
          needSign.map(async (msg) => {
            const key = (msg as any).fileKey as string;
            const url = await getSignedUrlForKey(key);
            return { id: msg.id, url };
          })
        );

        if (cancelled) return;

        const signedMap = new Map<string, string>(
          signedPairs.filter((p) => !!p.url).map((p) => [p.id, p.url as string])
        );

        setHistoryMessages((prev) =>
          prev.map((p) => {
            const url = signedMap.get(p.id);
            return url ? ({ ...(p as any), uri: url } as Msg) : p;
          })
        );
      } catch (err) {
        console.error("[fetchHistory] error:", err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [effectiveRoomId, token, myEmail, myUserId, isFocused]);



  // =========================================================
  // listen for messages-read (read receipt realtime)
  // =========================================================
  useEffect(() => {
    const socket = getSocket();

    const onMessagesRead = (payload: { roomId: string; readByRole: string }) => {
      if (payload.roomId !== effectiveRoomId) return;

      // ถ้าฝั่งตรงข้ามอ่าน → mark ข้อความของเราทั้งหมดเป็น read
      const isOtherSide =
        (user?.role === "SALE" && payload.readByRole === "CUSTOMER") ||
        (user?.role === "CUSTOMER" && payload.readByRole === "SALE");

      if (!isOtherSide) return;

      setHistoryMessages((prev) =>
        prev.map((m) =>
          m.fromMe && !m.readByOther ? { ...m, readByOther: true } : m
        )
      );
      setLocalTextBuf((prev) =>
        prev.map((m) =>
          m.fromMe && !m.readByOther ? { ...m, readByOther: true } : m
        )
      );
      setLocalAttachBuf((prev) =>
        prev.map((m) =>
          m.fromMe && !m.readByOther ? { ...m, readByOther: true } : m
        )
      );
    };

    socket.on("messages-read", onMessagesRead);
    return () => {
      socket.off("messages-read", onMessagesRead);
    };
  }, [effectiveRoomId, user?.role]);

  // =========================================================
  // socket texts
  // =========================================================
  const textMsgs: Msg[] = useMemo(
    () =>
      socketMessages.map((m: any) => {
        const ts = Number(m.ts ?? Date.now());
        const isFromMe = computeFromMe(m);
        const type = (m.type || "TEXT").toUpperCase();

        // ✅ คำนวณ Read Status เบื้องต้นจาก socket payload (ถ้า backend ส่งมา)
        const readByOther = isFromMe
          ? user?.role === "SALE"
            ? !!m.readByCustomerAt
            : !!m.readBySaleAt
          : false;

        const base = {
          id: String(m.id),
          fromMe: isFromMe,
          time: formatClock(new Date(ts)),
          ts,
          cid: m.cid,
          readByOther,
          isDeleted: !!m.isDeleted,
        };

        const fKey = m.fileKey || m.filekey || m.imgMessage || m.fileMessage;

        if (type === "IMAGE" && fKey && token) {
          return {
            ...base,
            type: "image",
            uri: `${API_BASE_URL}/files/object?key=${encodeURIComponent(fKey)}&t=${encodeURIComponent(token)}`,
            fileKey: fKey,
          } as Msg;
        }
        if (type === "FILE" && fKey && token) {
          return {
            ...base,
            type: "file",
            uri: `${API_BASE_URL}/files/object?key=${encodeURIComponent(fKey)}&t=${encodeURIComponent(token)}`,
            fileKey: fKey,
            name: m.fileName || m.filename || "File",
            mimeType: m.fileMime || m.filemime || m.mimeType,
          } as Msg;
        }

        return {
          ...base,
          type: "text",
          text: String(m.text ?? ""),
        } as Msg;
      }),
    [socketMessages, myEmail, token, user?.role, targetSaleUserId, targetSaleEmail]
  );

  useEffect(() => {
    if (socketMessages.length === 0) return;
    const last = socketMessages[socketMessages.length - 1];
    if (computeFromMe(last) && last.cid != null) {
      setLocalTextBuf((prev) => prev.filter((t: any) => t.cid !== last.cid));
      setLocalAttachBuf((prev) => prev.filter((t: any) => t.cid !== last.cid));
    }
  }, [socketMessages, myEmail]);

  const mergedMessages: Msg[] = useMemo(() => {
    return mergeAndDedupe([historyMessages, textMsgs, localAttachBuf, localTextBuf]);
  }, [historyMessages, textMsgs, localAttachBuf, localTextBuf]);

  // =========================================================
  // mark read (trigger on mount OR when new messages arrive)
  // =========================================================
  useEffect(() => {
    if (!token || !effectiveCustomerId || !isFocused) return;

    const markRead = async () => {
      try {
        await fetch(`${API_BASE_URL}/chat/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ customerId: effectiveCustomerId, roomId: effectiveRoomId }),
        });
      } catch (err) {
        console.error("[markRoomAsRead] error:", err);
      }
    };

    markRead();
  }, [token, effectiveCustomerId, effectiveRoomId, isFocused, mergedMessages.length]);

  const [input, setInput] = useState("");
  const [unsendTarget, setUnsendTarget] = useState<string | null>(null);

  const listRef = useRef<FlatList<Msg>>(null);
  const reversedMessages = useMemo(() => [...mergedMessages].reverse(), [mergedMessages]);

  // scroll to bottom เมื่อมีข้อความใหม่เข้ามา (ใน inverted list คือ offset 0)
  useEffect(() => {
    if (mergedMessages.length > 0) {
      const t = setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      return () => clearTimeout(t);
    }
  }, [mergedMessages.length]);

  // =========================================================
  // TEXT
  // =========================================================
  const onSend = async () => {
    const t = input.trim();
    if (!t) return;

    if (user?.role === "CUSTOMER" && !effectiveCustomerId) {
      Toast.show({ type: "info", text1: "Cannot Send Yet", text2: "Customer ID is still loading, please try again" });
      return;
    }

    const cid = generateCid();
    const now = Date.now();

    setLocalTextBuf((prev) => [
      ...prev,
      {
        id: `temp-${cid}`,
        cid,
        fromMe: true,
        type: "text",
        text: t,
        time: formatClock(new Date(now)),
        ts: now,
      },
    ]);

    setInput("");

    try {
      const created = await sendToServer({
        roomId: effectiveRoomId,
        customerId: effectiveCustomerId ?? null,
        cid,
        type: "TEXT",
        text: t,
      });

      const createdAt = new Date(created?.createdAt || Date.now());
      const ts = createdAt.getTime();

      setHistoryMessages((prev) =>
        mergeAndDedupe([
          prev,
          [
            {
              id: String(created?.id ?? `db-${cid}`),
              cid: created?.cid ?? cid,
              fromMe: true,
              type: "text",
              text: created?.text ?? t,
              time: formatClock(createdAt),
              ts,
            },
          ],
        ])
      );

      sendSocketText(t, cid);
      setLocalTextBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    } catch (e: any) {
      console.error("[send text] error:", e);
      Toast.show({ type: "error", text1: "Message Failed", text2: e?.message ?? "Unknown error" });
      setLocalTextBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    }
  };

  // =========================================================
  // Attach pickers (UPLOAD DIRECT TO MINIO)
  // =========================================================
  const [attachOpen, setAttachOpen] = useState(false);

  const pickImage = async () => {
    const cid = generateCid();
    const now = Date.now();

    try {
      setAttachOpen(false);

      if (user?.role === "CUSTOMER" && !effectiveCustomerId) {
        Toast.show({ type: "info", text1: "Cannot Send Image", text2: "Customer ID is still loading, please try again" });
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Toast.show({ type: "info", text1: "Permission Required", text2: "Please allow access to your photo library" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fileName = (asset as any).fileName ?? `image-${Date.now()}.jpg`;
      const mimeHint = (asset as any).mimeType ?? guessMimeFromName(fileName);
      const sizeHint = (asset as any).fileSize ?? null;

      // preview local (ไม่แสดงชื่อรูปใน UI)
      setLocalAttachBuf((prev) => [
        ...prev,
        {
          id: `img-${cid}`,
          cid,
          fromMe: true,
          type: "image",
          uri: asset.uri,
          name: fileName,
          time: formatClock(new Date(now)),
          ts: now,
          fileKey: null,
        },
      ]);

      // ✅ DIRECT UPLOAD TO MINIO (signed PUT)
      const up = await uploadDirectToMinio(asset.uri, fileName, mimeHint, sizeHint);

      // Save message metadata only
      const created = await sendToServer({
        roomId: effectiveRoomId,
        customerId: effectiveCustomerId ?? null,
        cid,
        type: "IMAGE",
        fileKey: up.fileKey,
        fileName: up.fileName,
        fileMime: up.mimeType,
        fileSize: up.size ?? null,
        text: null,
      });

      // ✅ EMIT SOCKET
      sendMessage({
        cid,
        type: "IMAGE",
        fileKey: up.fileKey,
        fileName: up.fileName,
        fileMime: up.mimeType,
        fileSize: up.size ?? undefined,
      });

      // Signed GET for preview
      const signed = await getSignedUrlForKey(up.fileKey);

      // Update local preview with remote signed url
      setLocalAttachBuf((prev) =>
        prev.map((m: any) =>
          m.cid === cid && m.type === "image"
            ? { ...m, uri: signed ?? m.uri, fileKey: up.fileKey, name: up.fileName ?? m.name }
            : m
        )
      );

      const createdAt = new Date(created?.createdAt || Date.now());
      const ts = createdAt.getTime();

      setHistoryMessages((prev) =>
        mergeAndDedupe([
          prev,
          [
            {
              id: String(created?.id ?? `db-img-${cid}`),
              cid: created?.cid ?? cid,
              fromMe: true,
              type: "image",
              uri: signed ?? null,
              fileKey: up.fileKey,
              name: up.fileName ?? fileName,
              time: formatClock(createdAt),
              ts,
            } as Msg,
          ],
        ])
      );
    } catch (e: any) {
      console.error("[pickImage] ERROR", e);
      Toast.show({ type: "error", text1: "Image Upload Failed", text2: e?.message ?? "Network request failed" });
      setLocalAttachBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    }
  };

  const pickFile = async () => {
    const cid = generateCid();
    const now = Date.now();

    try {
      setAttachOpen(false);

      if (user?.role === "CUSTOMER" && !effectiveCustomerId) {
        Toast.show({ type: "info", text1: "Cannot Send File", text2: "Customer ID is still loading, please try again" });
        return;
      }

      const resPick = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (resPick.canceled) return;

      const file = resPick.assets?.[0];
      if (!file?.uri) return;

      const fileName = file.name ?? `file-${Date.now()}`;
      const mimeHint = file.mimeType ?? guessMimeFromName(fileName);
      const sizeHint = file.size ?? null;

      // preview local (✅ ต้องมีชื่อไฟล์)
      setLocalAttachBuf((prev) => [
        ...prev,
        {
          id: `file-${cid}`,
          cid,
          fromMe: true,
          type: "file",
          uri: file.uri,
          name: fileName,
          size: file.size ?? null,
          mimeType: file.mimeType ?? mimeHint ?? null,
          time: formatClock(new Date(now)),
          ts: now,
          fileKey: null,
        },
      ]);

      // ✅ DIRECT UPLOAD TO MINIO (signed PUT)
      const up = await uploadDirectToMinio(file.uri, fileName, mimeHint, sizeHint);

      const created = await sendToServer({
        roomId: effectiveRoomId,
        customerId: effectiveCustomerId ?? null,
        cid,
        type: "FILE",
        fileKey: up.fileKey,
        fileName: up.fileName,
        fileMime: up.mimeType,
        fileSize: up.size ?? null,
        text: null,
      });

      // ✅ EMIT SOCKET
      sendMessage({
        cid,
        type: "FILE",
        fileKey: up.fileKey,
        fileName: up.fileName,
        fileMime: up.mimeType,
        fileSize: up.size ?? undefined,
      });

      const signed = await getSignedUrlForKey(up.fileKey);

      setLocalAttachBuf((prev) =>
        prev.map((m: any) =>
          m.cid === cid && m.type === "file"
            ? { ...m, uri: signed ?? m.uri, fileKey: up.fileKey, name: up.fileName ?? m.name }
            : m
        )
      );

      const createdAt = new Date(created?.createdAt || Date.now());
      const ts = createdAt.getTime();

      setHistoryMessages((prev) =>
        mergeAndDedupe([
          prev,
          [
            {
              id: String(created?.id ?? `db-file-${cid}`),
              cid: created?.cid ?? cid,
              fromMe: true,
              type: "file",
              uri: signed ?? null,
              fileKey: up.fileKey,
              name: up.fileName ?? fileName,
              size: (up.size ?? null) as any,
              mimeType: up.mimeType ?? mimeHint ?? null,
              time: formatClock(createdAt),
              ts,
            } as Msg,
          ],
        ])
      );
    } catch (e: any) {
      console.error("[pickFile] ERROR", e);
      Toast.show({ type: "error", text1: "File Upload Failed", text2: e?.message ?? "Network request failed" });
      setLocalAttachBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    }
  };

  const openUrl = async (url?: string | null) => {
    if (!url) return;

    if (url.startsWith("file:") || url.startsWith("content:")) {
      Toast.show({ type: "info", text1: "File Still Uploading", text2: "Please wait and try again" });
      return;
    }

    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Toast.show({ type: "error", text1: "Cannot Open File", text2: "Unable to open this link" });
      return;
    }
    Linking.openURL(url);
  };

  const refreshSignedForMessage = async (msg: Msg) => {
    const key = (msg as any).fileKey as string | null | undefined;
    if (!key) return;
    const signed = await getSignedUrlForKey(key);
    if (!signed) return;

    setHistoryMessages((prev) =>
      prev.map((p) => (p.id === msg.id ? ({ ...(p as any), uri: signed } as Msg) : p))
    );
    setLocalAttachBuf((prev) =>
      prev.map((p) => (p.id === msg.id ? ({ ...(p as any), uri: signed } as Msg) : p))
    );
  };

  const renderMessage = ({ item, index }: { item: Msg; index: number }) => {
    const isMe = item.fromMe;
    const align = isMe ? "items-end" : "items-start";
    const bg = isMe ? "bg-emerald-600" : "bg-gray-100";
    const textColor = isMe ? "text-white" : "text-gray-900";
    const subColor = isMe ? "text-emerald-100" : "text-gray-400";

    // ── Date Divider ──
    let showDateDivider = false;
    const msgDateKey = new Date(item.ts).toDateString();
    if (index === reversedMessages.length - 1) {
      showDateDivider = true;
    } else {
      const olderDateKey = new Date(reversedMessages[index + 1].ts).toDateString();
      showDateDivider = msgDateKey !== olderDateKey;
    }

    return (
      <>
        <View className={`mb-2 ${align}`}>
          <Pressable
            onLongPress={() => {
              if (isMe && !item.isDeleted && item.cid) {
                setUnsendTarget(String(item.cid));
              }
            }}
          >
            <View
              className={`rounded-2xl px-3 py-2 ${bg}`}
              style={{
                maxWidth: "78%",
                minWidth: item.type === "file" ? 220 : undefined,
                opacity: item.isDeleted ? 0.6 : 1,
              }}
            >
              {item.isDeleted ? (
                <Text className={`${textColor} text-[15px] italic opacity-80`}>
                  ข้อความถูกยกเลิกแล้ว
                </Text>
              ) : item.type === "text" ? (
                item.text === "[CALL_CANCELED]" ? (
                  <View className="flex-row items-center">
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isMe ? "rgba(239,68,68,0.25)" : "#FEE2E2",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name="call"
                      size={18}
                      color="#EF4444"
                      style={{ transform: [{ rotate: "135deg" }] }}
                    />
                  </View>
                  <View>
                    <Text className={`${textColor} text-[15px] font-medium`}>
                      ไม่ได้รับสาย
                    </Text>
                    <Text className={`${subColor} text-[12px] mt-0.5`}>
                      การโทรแบบเสียง
                    </Text>
                  </View>
                </View>
              ) : item.text.startsWith("[CALL_ENDED]:") ? (
                <View className="flex-row items-center">
                  <View
                    className={`w-9 h-9 rounded-full ${
                      isMe ? "bg-emerald-700" : "bg-gray-200"
                    } items-center justify-center mr-3`}
                  >
                    <Ionicons
                      name="call"
                      size={18}
                      color={isMe ? "#ffffff" : "#111827"}
                      style={{ transform: [{ rotate: "135deg" }] }}
                    />
                  </View>
                  <View>
                    <Text className={`${textColor} text-[15px] font-medium`}>
                      สิ้นสุดการโทรแบบเสียง
                    </Text>
                    <Text className={`${subColor} text-[12px] mt-0.5`}>
                      {(() => {
                        const durationSec = parseInt(item.text.split(":")[1] || "0", 10);
                        const m = Math.floor(durationSec / 60);
                        const s = durationSec % 60;
                        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                      })()}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className={`${textColor} text-[15px]`}>{item.text}</Text>
              )
            ) : item.type === "image" ? (
              <>
                <Pressable
                  onPress={() => openUrl(item.uri)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  {item.uri ? (
                    <Image
                      source={{ uri: item.uri }}
                      style={{ width: 220, height: 220, borderRadius: 14 }}
                      resizeMode="cover"
                      onError={async () => {
                        await refreshSignedForMessage(item);
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 220,
                        height: 220,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isMe ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)",
                      }}
                    >
                      <Text className={`${subColor} text-[11px]`}>กำลังโหลดรูป…</Text>
                    </View>
                  )}
                </Pressable>
              </>
            ) : item.type === "file" && (item.mimeType?.startsWith("audio") || item.name?.endsWith(".m4a")) ? (
              <AudioMessagePlayer item={item} isMe={isMe} textColor={textColor} subColor={subColor} onRefresh={() => refreshSignedForMessage(item)} />
            ) : (
              <>
                <Pressable
                  onPress={() => openUrl(item.uri)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View className="flex-row items-center">
                    <View
                      className={`w-9 h-9 rounded-full ${
                        isMe ? "bg-emerald-700" : "bg-gray-200"
                      } items-center justify-center mr-2`}
                    >
                      <Ionicons
                        name="document-outline"
                        size={18}
                        color={isMe ? "#fff" : "#374151"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        className={`${textColor} text-[13px] font-medium`}
                        numberOfLines={2}
                      >
                        {item.name || "ไฟล์แนบ"}
                      </Text>
                      {item.size != null && (
                        <Text className={`${subColor} text-[11px] mt-0.5`}>
                          {(item.size / 1024).toFixed(1)} KB
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>

                {!item.uri && item.fileKey ? (
                  <Pressable
                    onPress={() => refreshSignedForMessage(item)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text className={`${subColor} text-[10px] mt-1`}>แตะเพื่อโหลดลิงก์ไฟล์</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
          </Pressable>

          {/* ✅ เวลา + Read */}
          <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
            <Text className="text-[10px] text-gray-400">{item.time}</Text>
            {isMe && item.readByOther && (
              <Text className="text-[10px] text-gray-400 font-medium">read</Text>
            )}
          </View>
        </View>

        {/* ── Date Divider — render หลัง bubble เพื่อให้ขึ้นแสดงเหนือ bubble ใน inverted FlatList ── */}
        {showDateDivider && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 12,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            <View
              style={{
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 4,
                marginHorizontal: 10,
              }}
            >
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "500" }}>
                {formatDateLabel(item.ts)}
              </Text>
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          </View>
        )}
      </>
    );
  };

  const ChatHeader = () => (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
      <Pressable 
        className="pr-3 -ml-2"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(screens)/all-chat");
          }
        }}
      >
        <Ionicons name="chevron-back" size={24} color="#111827" />
      </Pressable>

      <View className="flex-row flex-1 items-center">
        {partner?.avatarUrl && !avatarError ? (
          <Image 
            source={{ uri: partner.avatarUrl }} 
            className="w-9 h-9 rounded-full mr-3" 
            onError={() => setAvatarError(true)}
          />
        ) : (
          <View className="w-9 h-9 rounded-full bg-emerald-200 items-center justify-center mr-3">
            <Ionicons name="person" size={20} color="#0f5132" />
          </View>
        )}

        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {partner?.name ?? nameParam ?? "Chat"}
          </Text>
          <Text className="text-xs text-gray-500">
            {connected ? "🟢 Online" : "🔴 Offline"}
          </Text>
        </View>
      </View>

      <View className="pl-3">
        {user?.role !== "MANAGER" && (
          <Pressable
            onPress={() => {
              const targetUserId = partner?.userId ? String(partner.userId) : "";
              if (!targetUserId) {
                Toast.show({ type: "info", text1: "Not Ready", text2: "Target User ID not loaded yet" });
                return;
              }
              router.push({
                pathname: "/(screens)/call-screen",
                params: {
                  name: partner?.name ?? nameParam ?? "User",
                  avatarUrl: partner?.avatarUrl ?? "",
                  customerId: effectiveCustomerId ? String(effectiveCustomerId) : "",
                  targetUserId: targetUserId,
                  roomId: effectiveRoomId,
                  isIncoming: "false",
                },
              });
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
          >
            <Ionicons name="call-outline" size={24} color="#047857" />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <ChatHeader />

        <FlatList
          ref={listRef}
          data={reversedMessages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          inverted
          ListEmptyComponent={
            loadingHistory ? (
              <View className="py-8 items-center">
                <Text className="text-xs text-gray-400">กำลังโหลดประวัติแชท...</Text>
              </View>
            ) : (
              <View className="py-8 items-center">
                <Text className="text-xs text-gray-400">ยังไม่มีประวัติการคุย</Text>
              </View>
            )
          }
        />

        {othersTyping.length > 0 && (
          <View className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
            <Text className="text-emerald-700 text-xs">{othersTyping.join(", ")} is typing…</Text>
          </View>
        )}

        {user?.role !== "MANAGER" && (
          <View
            className="flex-row items-center px-3 py-2 border-t border-gray-200 bg-white"
            style={{ paddingBottom: isKeyboardVisible ? 8 : insets.bottom > 0 ? insets.bottom : 8 }}
          >
            <Pressable className="px-2 py-2" onPress={() => setAttachOpen(true)}>
              <Ionicons name="add-circle-outline" size={22} color="#6B7280" />
            </Pressable>

            <View className="flex-1 mx-2 rounded-2xl px-3 bg-gray-100">
              <TextInput
                className="py-2"
                placeholder="Message"
                placeholderTextColor="#9CA3AF"
                value={input}
                onChangeText={(v) => {
                  setInput(v);
                  if (v.trim().length > 0) startTyping();
                }}
                returnKeyType="send"
                onSubmitEditing={onSend}
              />
            </View>

            {input.trim().length > 0 ? (
              <Pressable
                className="px-3 py-2 rounded-2xl"
                onPress={onSend}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="send" size={20} color="#047857" />
              </Pressable>
            ) : (
              <View className="px-3 py-2">
                <Ionicons name="send" size={20} color="#D1D5DB" />
              </View>
            )}
          </View>
        )}
      </SafeAreaView>

      <Modal transparent visible={attachOpen} animationType="fade" onRequestClose={() => setAttachOpen(false)}>
        <Pressable className="flex-1 bg-black/30" onPress={() => setAttachOpen(false)}>
          <View className="flex-1 justify-end">
            <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl px-4 pt-4 pb-6">
              <Text className="text-base font-semibold text-gray-900 mb-3">เลือกประเภทที่ต้องการส่ง</Text>

              <Pressable
                className="flex-row items-center py-3"
                onPress={pickImage}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="image-outline" size={20} color="#111827" />
                <Text className="ml-3 text-gray-900">ส่งรูปภาพ</Text>
              </Pressable>

              <View className="h-[1px] bg-gray-100" />

              <Pressable
                className="flex-row items-center py-3"
                onPress={pickFile}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="document-attach-outline" size={20} color="#111827" />
                <Text className="ml-3 text-gray-900">ส่งไฟล์</Text>
              </Pressable>

              <View className="h-[1px] bg-gray-100" />

              <Pressable
                className="py-3 items-center"
                onPress={() => setAttachOpen(false)}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Text className="text-gray-500">ยกเลิก</Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ✅ Custom Unsend Message Modal */}
      <Modal transparent visible={!!unsendTarget} animationType="fade" onRequestClose={() => setUnsendTarget(null)}>
        <Pressable className="flex-1 bg-black/40 justify-center items-center" onPress={() => setUnsendTarget(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-[85%] max-w-[340px] shadow-2xl">
            <View className="items-center mb-5">
              <View className="w-14 h-14 bg-red-50 rounded-full items-center justify-center mb-4">
                <Ionicons name="trash-outline" size={28} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center mb-2">ยกเลิกข้อความ</Text>
              <Text className="text-[15px] text-gray-500 text-center px-2 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการยกเลิกข้อความนี้? ฝั่งตรงข้ามจะไม่สามารถเห็นข้อความนี้ได้อีก
              </Text>
            </View>
            
            <View className="flex-row justify-between mt-2" style={{ gap: 12 }}>
              <Pressable 
                className="flex-1 py-3.5 bg-gray-100 rounded-xl items-center"
                onPress={() => setUnsendTarget(null)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <Text className="text-gray-700 font-semibold text-[16px]">ปิด</Text>
              </Pressable>
              <Pressable 
                className="flex-1 py-3.5 bg-red-500 rounded-xl items-center"
                onPress={() => {
                  if (unsendTarget) unsendMessage(unsendTarget);
                  setUnsendTarget(null);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Text className="text-white font-semibold text-[16px]">ยกเลิกข้อความ</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}