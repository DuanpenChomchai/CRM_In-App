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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useSocketRoom, generateCid } from "../../store/socket";
import { useAuthStore } from "../../store/useAuthStore";
import { useIsFocused } from "@react-navigation/native";
import { API_BASE_URL } from "../../config/api";

import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

function formatClock(t = new Date()) {
  const h = t.getHours().toString().padStart(2, "0");
  const m = t.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

type ChatPartner = {
  name: string;
  avatarUrl?: string | null;
};

type BaseMsg = {
  id: string;
  fromMe: boolean;
  time: string;
  ts: number;
  cid?: string | number;
};

type Msg =
  | (BaseMsg & { type: "text"; text: string })
  | (BaseMsg & {
      type: "image";
      uri: string | null;
      // เก็บ name ไว้ได้ แต่ "ไม่แสดงชื่อรูป" ตามที่ขอ
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
  const params = useLocalSearchParams();
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
  // signed url helper
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

  // =========================================================
  // upload -> /chat/upload
  // =========================================================
  const uploadToServer = async (localUri: string, name?: string, mimeTypeHint?: string | null) => {
    if (!token) throw new Error("no token");

    const filename = name ?? localUri.split("/").pop() ?? "file";
    const mimeType = mimeTypeHint || guessMimeFromName(filename);

    const form = new FormData();
    form.append("file", { uri: localUri, name: filename, type: mimeType } as any);

    const res = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: form,
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`upload failed: ${res.status} ${t}`);
    }

    return (await res.json()) as {
      fileKey: string;
      fileName: string;
      mimeType: string;
      size: number;
    };
  };

  // =========================================================
  // send -> /chat/send
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
  }) => {
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
          if (data.sale) setPartner({ name: data.sale.name || "Sale", avatarUrl: data.sale.img ?? null });
        } else if (user?.role === "SALE" && effectiveCustomerId) {
          const res = await fetch(`${API_BASE_URL}/customers/${effectiveCustomerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const c = await res.json();
          setPartner({ name: c.name || `Customer #${c.id}`, avatarUrl: c.img ?? null });
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

          const base: BaseMsg = {
            id: String(m.id),
            fromMe: computeFromMe(m),
            time: formatClock(createdAt),
            ts,
            cid: m.cid ?? undefined,
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
              name: m.fileName ?? m.filename ?? m.file_name ?? "file", // ✅ ชื่อ PDF ต้องมา
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
  // mark read
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
  }, [token, effectiveCustomerId, isFocused]);

  // =========================================================
  // socket texts
  // =========================================================
  const textMsgs: Msg[] = useMemo(
    () =>
      socketMessages.map((m) => {
        const ts = Number(m.ts ?? Date.now());
        return {
          id: String(m.id),
          fromMe: normalizeEmail(m.user) === myEmail,
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

  const [input, setInput] = useState("");

  const listRef = useRef<FlatList<Msg>>(null);
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [mergedMessages.length]);

  // =========================================================
  // TEXT
  // =========================================================
  const onSend = async () => {
    const t = input.trim();
    if (!t) return;

    if (user?.role === "CUSTOMER" && !effectiveCustomerId) {
      Alert.alert("ยังส่งข้อความไม่ได้", "ยังโหลด customerId ไม่เสร็จ ลองใหม่อีกครั้ง");
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
      Alert.alert("ส่งข้อความไม่สำเร็จ", e?.message ?? "unknown error");
      setLocalTextBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    }
  };

  // =========================================================
  // Attach pickers
  // =========================================================
  const [attachOpen, setAttachOpen] = useState(false);

  const pickImage = async () => {
    const cid = generateCid();
    const now = Date.now();

    try {
      setAttachOpen(false);

      if (user?.role === "CUSTOMER" && !effectiveCustomerId) {
        Alert.alert("ยังส่งรูปไม่ได้", "ยังโหลด customerId ไม่เสร็จ ลองใหม่อีกครั้ง");
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

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

      const up = await uploadToServer(asset.uri, fileName, mimeHint);

      const created = await sendToServer({
        roomId: effectiveRoomId,
        customerId: effectiveCustomerId ?? null,
        cid,
        type: "IMAGE",
        fileKey: up.fileKey,
        fileName: up.fileName,
        fileMime: up.mimeType,
        fileSize: up.size,
        text: null,
      });

      const signed = await getSignedUrlForKey(up.fileKey);

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
      Alert.alert("อัปโหลดรูปไม่สำเร็จ", e?.message ?? "Network request failed");
      setLocalAttachBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    }
  };

  const pickFile = async () => {
    const cid = generateCid();
    const now = Date.now();

    try {
      setAttachOpen(false);

      if (user?.role === "CUSTOMER" && !effectiveCustomerId) {
        Alert.alert("ยังส่งไฟล์ไม่ได้", "ยังโหลด customerId ไม่เสร็จ ลองใหม่อีกครั้ง");
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

      const up = await uploadToServer(file.uri, fileName, mimeHint);

      const created = await sendToServer({
        roomId: effectiveRoomId,
        customerId: effectiveCustomerId ?? null,
        cid,
        type: "FILE",
        fileKey: up.fileKey,
        fileName: up.fileName,
        fileMime: up.mimeType,
        fileSize: up.size,
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
              size: up.size ?? null,
              mimeType: up.mimeType ?? mimeHint ?? null,
              time: formatClock(createdAt),
              ts,
            } as Msg,
          ],
        ])
      );
    } catch (e: any) {
      console.error("[pickFile] ERROR", e);
      Alert.alert("อัปโหลดไฟล์ไม่สำเร็จ", e?.message ?? "Network request failed");
      setLocalAttachBuf((prev) => prev.filter((m: any) => m.cid !== cid));
    }
  };

  const openUrl = async (url?: string | null) => {
    if (!url) return;

    if (url.startsWith("file:") || url.startsWith("content:")) {
      Alert.alert("ไฟล์ยังอัปโหลดไม่เสร็จ", "รอสักครู่แล้วลองเปิดใหม่");
      return;
    }

    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert("เปิดไฟล์ไม่ได้", "ไม่สามารถเปิดลิงก์นี้ได้");
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

  const renderMessage = ({ item }: { item: Msg }) => {
    const isMe = item.fromMe;
    const align = isMe ? "items-end" : "items-start";
    const bg = isMe ? "bg-emerald-600" : "bg-gray-100";
    const textColor = isMe ? "text-white" : "text-gray-900";
    const subColor = isMe ? "text-emerald-100" : "text-gray-400";

    return (
      <View className={`mb-2 ${align}`}>
        <View
          className={`rounded-2xl px-3 py-2 ${bg}`}
          style={{
            maxWidth: "78%",
            minWidth: item.type === "file" ? 220 : undefined, // ✅ กันบีบจนไม่เหลือที่ให้ชื่อไฟล์
          }}
        >
          {item.type === "text" ? (
            <>
              <Text className={`${textColor} text-[15px]`}>{item.text}</Text>
              <Text className={`${subColor} text-[10px] mt-1`}>{item.time}</Text>
            </>
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

              {/* ✅ เอาชื่อรูปออก (ไม่แสดง item.name) */}
              <Text className={`${subColor} text-[10px] mt-1`}>{item.time}</Text>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => openUrl(item.uri)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                {/* แถวไอคอน */}
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

                {/* ✅ บรรทัดชื่อไฟล์ (แยกออกมาเพื่อให้ “ขึ้นแน่ๆ”) */}
                <Text
                  className={`${textColor} text-[14px] mt-1`}
                  numberOfLines={2}
                  style={{ flexShrink: 1 }}
                >
                  {item.name || "ไฟล์แนบ"}
                </Text>
              </Pressable>

              <Text className={`${subColor} text-[10px] mt-1`}>{item.time}</Text>

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

        <Pressable className="pl-3" onPress={() => {}}>
          <Ionicons name="call-outline" size={20} color="#047857" />
        </Pressable>
      </View>
    ),
    [effectiveRoomId, nameParam, connected, partner]
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

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-row items-center px-3 py-2 border-t border-gray-200 bg-white">
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}