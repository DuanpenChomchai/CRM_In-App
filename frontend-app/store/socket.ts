// src/store/socket.ts
import io, { Socket } from "socket.io-client";
import { useEffect, useMemo, useRef, useState } from "react";

import { WS_SERVER } from "../config/api";


export type ChatMsg = {
  id: string;
  text: string;
  user: string;
  ts: number;
  cid?: string;
};

type SocketAuth = {
  token?: string | null;
  role?: string | null;
  userId?: number | null;
};

let socketInstance: Socket | null = null;
let socketAuth: SocketAuth = {};

// เรียกจาก React เพื่ออัพเดทข้อมูล auth ที่จะส่งให้ WS
export const setSocketAuth = (auth: SocketAuth) => {
  socketAuth = auth;

  if (socketInstance) {
    // เก็บไว้ที่ client ด้วย (server จะรับจาก event "auth-update")
    socketInstance.emit("auth-update", auth);
  }
};

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(WS_SERVER, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      // ส่งค่า auth ตอน handshake แรก
      auth: socketAuth,
    });
  }
  return socketInstance;
};

export const generateCid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
        {
          id: `sys-${sys.ts}`,
          text: `🔔 ${sys.text}`,
          user: "system",
          ts: sys.ts,
        },
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

      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
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
