import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";
import { useAuthStore } from "../../store/useAuthStore";
import { API_BASE_URL } from "../../config/api";

// ─── Call states ───
type CallPhase = "ringing" | "active" | "ended";

export default function CallScreen() {
  const router = useRouter();
  const { name, avatarUrl, customerId } = useLocalSearchParams<{
    name?: string;
    avatarUrl?: string;
    customerId?: string;
  }>();

  const { user, token } = useAuthStore();

  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  // ─── backend call record id ───
  const [callId, setCallId] = useState<number | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // =========================================================
  // CREATE call record when screen opens
  // =========================================================
  useEffect(() => {
    const createCallRecord = async () => {
      try {
        if (!token) return;

        const direction =
          user?.role === "CUSTOMER"
            ? "CUSTOMER_TO_SALE"
            : "SALE_TO_CUSTOMER";

        const body: any = {
          direction,
          status: "RINGING",
          startedAt: startTimeRef.current.toISOString(),
        };

        if (customerId) body.customerId = Number(customerId);
        if (user?.role === "SALE") body.saleUserId = user.id;
        if (user?.role === "CUSTOMER") body.customerUserId = user.id;

        const res = await fetch(`${API_BASE_URL}/calls`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          setCallId(data.id);
          console.log("✅ Call record created:", data.id);
        } else {
          console.error("❌ Create call failed:", res.status);
        }
      } catch (err) {
        console.error("❌ Create call error:", err);
      }
    };

    createCallRecord();
  }, []);

  // =========================================================
  // UPDATE call status when phase changes
  // =========================================================
  useEffect(() => {
    if (!callId || !token) return;

    const updateStatus = async (status: string) => {
      try {
        await fetch(`${API_BASE_URL}/calls/${callId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });
        console.log(`✅ Call ${callId} status → ${status}`);
      } catch (err) {
        console.error("❌ Update call status error:", err);
      }
    };

    if (phase === "active") {
      updateStatus("ONGOING");
    }
  }, [phase, callId, token]);

  // ─── pulse animation for ringing ───
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase !== "ringing") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);

  // ─── auto-answer after 3 s (demo) ───
  useEffect(() => {
    if (phase !== "ringing") return;
    const t = setTimeout(() => setPhase("active"), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // ─── call timer ───
  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // =========================================================
  // END CALL → update record with endedAt + durationSec + status
  // =========================================================
  const hangUp = async () => {
    setPhase("ended");

    // update backend
    if (callId && token) {
      try {
        const endedAt = new Date();
        const durationSec = seconds;

        await fetch(`${API_BASE_URL}/calls/${callId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: seconds > 0 ? "COMPLETED" : "CANCELED",
            endedAt: endedAt.toISOString(),
            durationSec,
          }),
        });
        console.log(`✅ Call ${callId} ended (${durationSec}s)`);

        // Send chat message
        const effectiveRoomId = customerId 
          ? `cust:${customerId}` 
          : "general"; // Default to general or handle other room logic if needed
        
        await fetch(`${API_BASE_URL}/chat/send`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              roomId: effectiveRoomId,
              customerId: customerId ? Number(customerId) : null,
              type: "TEXT",
              text: `[CALL_ENDED]:${durationSec}`,
            }),
        });
        console.log(`✅ Sent call ended message to chat`);

      } catch (err) {
        console.error("❌ End call error:", err);
      }
    }

    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(screens)/all-chat");
    }, 600);
  };

  // ─── format mm:ss ───
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const displayName = name ?? "Unknown";

  return (
    <SafeAreaView className="flex-1 bg-emerald-900">
      {/* ─── Top area ─── */}
      <View className="flex-1 items-center justify-center">
        {/* Avatar with pulse ring */}
        <View className="items-center justify-center mb-8">
          {phase === "ringing" && (
            <Animated.View
              style={{
                position: "absolute",
                width: 140,
                height: 140,
                borderRadius: 70,
                borderWidth: 2,
                borderColor: "rgba(16,185,129,0.35)",
                transform: [{ scale: pulseAnim }],
              }}
            />
          )}

          <View
            className="w-[120px] h-[120px] rounded-full items-center justify-center overflow-hidden"
            style={{
              backgroundColor: "rgba(16,185,129,0.25)",
              borderWidth: 3,
              borderColor: "rgba(16,185,129,0.5)",
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-[120px] h-[120px]"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={56} color="#6ee7b7" />
            )}
          </View>
        </View>

        {/* Name */}
        <Text className="text-white text-2xl font-bold mb-2">
          {displayName}
        </Text>

        {/* Status */}
        {phase === "ringing" && (
          <Text className="text-emerald-300 text-base">กำลังเรียก...</Text>
        )}
        {phase === "active" && (
          <Text className="text-emerald-300 text-xl font-semibold tracking-widest">
            {formatTime(seconds)}
          </Text>
        )}
        {phase === "ended" && (
          <Text className="text-red-300 text-base">วางสายแล้ว</Text>
        )}

        {/* Encryption badge */}
        <View
          className="flex-row items-center mt-6 px-4 py-2 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <Ionicons name="lock-closed" size={12} color="#6ee7b7" />
          <Text className="text-emerald-300 text-xs ml-1.5">
            End-to-end encrypted
          </Text>
        </View>
      </View>

      {/* ─── Action buttons ─── */}
      {phase !== "ended" && (
        <View className="pb-12 px-8">
          {/* Top row — mute + speaker */}
          <View className="flex-row justify-center mb-8" style={{ gap: 40 }}>
            {/* Mute */}
            <Pressable
              onPress={() => setMuted((v) => !v)}
              className="items-center"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{
                  backgroundColor: muted
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.15)",
                }}
              >
                <Ionicons
                  name={muted ? "mic-off" : "mic"}
                  size={26}
                  color={muted ? "#064e3b" : "#ffffff"}
                />
              </View>
              <Text className="text-white text-xs mt-2">
                {muted ? "Unmute" : "Mute"}
              </Text>
            </Pressable>

            {/* Speaker */}
            <Pressable
              onPress={() => setSpeaker((v) => !v)}
              className="items-center"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{
                  backgroundColor: speaker
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.15)",
                }}
              >
                <Ionicons
                  name={speaker ? "volume-high" : "volume-medium-outline"}
                  size={26}
                  color={speaker ? "#064e3b" : "#ffffff"}
                />
              </View>
              <Text className="text-white text-xs mt-2">
                {speaker ? "Speaker" : "Speaker"}
              </Text>
            </Pressable>
          </View>

          {/* End call */}
          <View className="items-center">
            <Pressable
              onPress={hangUp}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View className="w-[72px] h-[72px] rounded-full bg-red-500 items-center justify-center shadow-lg">
                <Ionicons name="call" size={32} color="#ffffff" style={{ transform: [{ rotate: "135deg" }] }} />
              </View>
            </Pressable>
            <Text className="text-red-300 text-xs mt-2">End</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
