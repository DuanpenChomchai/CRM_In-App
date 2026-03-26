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
} from "react-native";
import Toast from "react-native-toast-message";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useSocketRoom, generateCid, getSocket } from "../../store/socket";
import { useAuthStore } from "../../store/useAuthStore";
import { useIsFocused } from "@react-navigation/native";
import { API_BASE_URL } from "../../config/api";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";


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
  const effectiveRoomId = effectiveCustomerId ? `cust:${effectiveCustomerId}` : idParam ?? "general";

  // =========================================================
  // socket
  // =========================================================
  const {
    connected,
    messages: socketMessages,
    sendText: sendSocketText,
    startTyping,
    othersTyping,
  } = useSocketRoom(effectiveRoomId, myEmail || "user");

  // =========================================================
  // signed url helpers (GET for preview + PUT for direct upload)
  // =========================================================
  const getSignedUrlForKey = async (key?: string | null) => {
    if (!key || !token) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/files/signed?key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.url as string) || null;
    } catch (e) {
      console.log("[getSignedUrlForKey] error:", e);
      return null;
    }
  };

  /**
   * Backend ต้องทำ endpoint นี้ให้คืน:
   * { key: string, uploadUrl: string }
   * โดย uploadUrl เป็น pre-signed PUT URL ไปที่ MinIO/S3
   */
  const getSignedPutForFile = async (fileName: string, mimeType: string) => {
    if (!token) throw new Error("no token");
    const res = await fetch(
      `${API_BASE_URL}/files/signed-put?name=${encodeURIComponent(fileName)}&mime=${encodeURIComponent(mimeType)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`signed-put failed: ${res.status} ${t}`);
    }
    return (await res.json()) as { key: string; uploadUrl: string };
  };

  // ✅ PUT file directly to MinIO using signed PUT URL (no UploadType, no EncodingType)
  const putToMinio = async (uploadUrl: string, localUri: string, mimeType: string) => {
    const r = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
    });

    if (r.status < 200 || r.status >= 300) {
      throw new Error(`PUT upload failed: ${r.status} ${r.body ?? ""}`);
    }
  };

  // Helper: signed PUT + PUT + return metadata
  const uploadDirectToMinio = async (
    localUri: string,
    fileName: string,
    mimeType: string,
    size?: number | null
  ) => {
    const { key, uploadUrl } = await getSignedPutForFile(fileName, mimeType);
    await putToMinio(uploadUrl, localUri, mimeType);

    return {
      fileKey: key,
      fileName,
      mimeType,
      size: size ?? null,
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
          if (data.sale) {
            const avatarUrl = data.sale.id
              ? `${API_BASE_URL}/users/profile-image/${data.sale.id}?t=${encodeURIComponent(token)}&b=${Date.now()}`
              : null;
            setPartner({ name: data.sale.name || "Sale", avatarUrl, userId: data.sale.id });
          }
        } else if (user?.role === "SALE" && effectiveCustomerId) {
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
        } else {
          setPartner(null);
        }
      } catch (err) {
        console.error("[fetchPartner] error:", err);
      }
    };

    if (isFocused) fetchPartner();
  }, [token, user?.role, effectiveCustomerId, isFocused]);

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

  useEffect(() => {
    let cancelled = false;

    const computeFromMe = (m: any) => {
      const senderId = m.senderId ?? m.userId ?? null;
      if (senderId != null && myUserId != null) return Number(senderId) === Number(myUserId);

      const senderEmail = normalizeEmail(m.senderEmail ?? m.senderName ?? m.sender ?? "");
      return senderEmail && myEmail ? senderEmail === myEmail : false;
    };

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

        const mappedBase: Msg[] = arr.map((m: any) => {
          const t = String(m.type || "TEXT").toUpperCase();
          const fileKey = m.fileKey ?? m.filekey ?? m.imgMessage ?? m.fileMessage ?? null;

          const createdAt = new Date(m.createdAt || Date.now());
          const ts = createdAt.getTime();

          const isFromMe = computeFromMe(m);

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
        const isFromMe = normalizeEmail(m.user) === myEmail;
        return {
          id: String(m.id),
          fromMe: isFromMe,
          type: "text",
          text: String(m.text ?? ""),
          time: formatClock(new Date(ts)),
          ts,
          cid: m.cid,
        };
      }),
    [socketMessages, myEmail]
  );

  useEffect(() => {
    if (socketMessages.length === 0) return;
    const last = socketMessages[socketMessages.length - 1];
    if (normalizeEmail(last.user) === myEmail && last.cid != null) {
      setLocalTextBuf((prev) => prev.filter((t: any) => t.cid !== last.cid));
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
          body: JSON.stringify({ customerId: effectiveCustomerId }),
        });
      } catch (err) {
        console.error("[markRoomAsRead] error:", err);
      }
    };

    markRead();
  }, [token, effectiveCustomerId, isFocused, mergedMessages.length]);

  const [input, setInput] = useState("");

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

        <View className={`mb-2 ${align}`}>
          <View
            className={`rounded-2xl px-3 py-2 ${bg}`}
            style={{
              maxWidth: "78%",
              minWidth: item.type === "file" ? 220 : undefined,
            }}
          >
            {item.type === "text" ? (
              item.text.startsWith("[CALL_ENDED]:") ? (
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
                        name="document-text-outline"
                        size={18}
                        color={isMe ? "#ffffff" : "#111827"}
                      />
                    </View>

                    <Text className={`${subColor} text-[11px]`}>
                      {item.mimeType?.includes("pdf") ? "PDF" : item.mimeType ?? "file"}
                    </Text>
                  </View>

                  <Text
                    className={`${textColor} text-[14px] mt-1`}
                    numberOfLines={2}
                    style={{ flexShrink: 1 }}
                  >
                    {item.name || "ไฟล์แนบ"}
                  </Text>
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

          {/* ✅ เวลา + Read — วางหลัง Bubble เพื่อให้แสดงผลด้านล่าง */}
          <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
            <Text className="text-[10px] text-gray-400">{item.time}</Text>
            {isMe && item.readByOther && (
              <Text className="text-[10px] text-gray-400 font-medium">read</Text>
            )}
          </View>
        </View>
      </>
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

        <View className="flex-row flex-1 items-center">
          {partner?.avatarUrl ? (
            <Image source={{ uri: partner.avatarUrl }} className="w-9 h-9 rounded-full mr-3" />
          ) : (
            <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center mr-3">
              <Ionicons name="person" size={20} color="#047857" />
            </View>
          )}

          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
              {partner?.name ?? nameParam ?? "Chat"}
            </Text>
            <Text className="text-xs text-gray-500">
              ID: {effectiveRoomId} · {connected ? "🟢 Online" : "🔴 Offline"}
            </Text>
          </View>
        </View>

        <View className="pl-3">
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
                },
              });
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
          >
            <Ionicons name="call-outline" size={24} color="#047857" />
          </Pressable>
        </View>
      </View>
    ),
    [effectiveRoomId, nameParam, connected, partner, router]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        {ListHeader}

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
    </KeyboardAvoidingView>
  );
}