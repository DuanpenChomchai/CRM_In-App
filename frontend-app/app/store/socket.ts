import io, { Socket } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";

export const WS_SERVER = "http://10.222.113.26:3000"; // ← แก้เป็น IP คอมคุณ

// รับ cid จาก server เพื่อ de-dup optimistic bubble
export type ChatMsg = { id: string; text: string; user: string; ts: number; cid?: string };

let socketInstance: Socket | null = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(WS_SERVER, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }
  return socketInstance;
};

// ช่วยสร้าง cid เวลาส่งข้อความ (ถ้าอยากใช้จาก UI)
export const generateCid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Hook ใช้ในหน้าห้องแชท
export const useSocketRoom = (roomId: string, username: string) => {
  const socket = useMemo(getSocket, []);
  const [connected, setConnected] = useState<boolean>(socket.connected);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      setConnected(true);
      socket.emit("join", { roomId, user: username });
    };
    const onDisconnect = () => setConnected(false);
    const onHistory = (list: ChatMsg[] = []) =>
      setMessages([...list].sort((a, b) => a.ts - b.ts));
    const onMessage = (msg: ChatMsg) =>
      setMessages((prev) => [...prev, msg]);
    const onSystem = (sys: { text: string; ts: number }) =>
      setMessages((prev) => [
        ...prev,
        { id: `sys-${sys.ts}`, text: `🔔 ${sys.text}`, user: "system", ts: sys.ts },
      ]);
    const onTyping = ({ user, typing }: { user: string; typing: boolean }) =>
      setTypingUsers((prev) => ({ ...prev, [user]: typing }));

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("history", onHistory);
    socket.on("message", onMessage);
    socket.on("system", onSystem);
    socket.on("typing", onTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("history", onHistory);
      socket.off("message", onMessage);
      socket.off("system", onSystem);
      socket.off("typing", onTyping);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [roomId, username, socket]);

  const stopTyping = () => {
    socket.emit("typing", { roomId, user: username, typing: false });
  };

  const startTyping = () => {
    socket.emit("typing", { roomId, user: username, typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(), 800);
  };

  // ✅ รองรับ cid เพื่อให้ UI ฝั่งผู้ส่ง de-dup ข้อความ optimistic ได้
  const sendText = (text: string, cid?: string) => {
    const t = text.trim();
    if (!t) return;
    socket.emit("message", { roomId, text: t, user: username, cid });
    stopTyping();
  };

  const othersTyping = Object.entries(typingUsers)
    .filter(([u, t]) => t && u !== username)
    .map(([u]) => u);

  return { connected, messages, sendText, startTyping, stopTyping, othersTyping };
};
