import { io, Socket } from "socket.io-client";
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

export const setSocketAuth = (auth: SocketAuth) => {
  socketAuth = auth;

  if (socketInstance) {
    socketInstance.auth = socketAuth;
    socketInstance.emit("auth-update", auth);
  }
};

export const getSocket = (): Socket => {
  if (!socketInstance) {
    console.log("🔌 init WebSocket:", WS_SERVER, "AUTH:", socketAuth);

    socketInstance = io(WS_SERVER, {
      //transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      auth: socketAuth,
    });

    socketInstance.on("connect", () => {
      console.log("✅ WS connected:", socketInstance?.id);
    });

    socketInstance.on("connect_error", (err) => {
      console.log("❌ WS connect_error:", err.message, err);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("⚠️ WS disconnected:", reason);
    });
  }
  return socketInstance;
};

export const generateCid = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useSocketRoom = (roomId: string, username: string) => {
  const socket = useMemo(getSocket, []);
  const [connected, setConnected] = useState(socket.connected);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimer = useRef<any>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    } else {
      // ✅ ถ้าเชื่อมต่ออยู่แล้ว ให้ส่ง join ทันที (สำคัญมากสำหรับ real-time)
      socket.emit("join", { roomId, user: username });
    }

    const onConnect = () => {
      setConnected(true);
      socket.emit("join", { roomId, user: username });
    };

    const onDisconnect = () => setConnected(false);

    const onHistory = (list: ChatMsg[] = []) =>
      setMessages([...list].sort((a, b) => a.ts - b.ts));

    const onMessage = (msg: ChatMsg) =>
      setMessages((prev) => [...prev, msg]);

    const onTyping = ({ user, typing }: { user: string; typing: boolean }) =>
      setTypingUsers((prev) => ({ ...prev, [user]: typing }));

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("history", onHistory);
    socket.on("message", onMessage);
    socket.on("typing", onTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("history", onHistory);
      socket.off("message", onMessage);
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
