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
import { getSocket } from "../../store/socket";
import { ZegoUIKitPrebuiltCall } from "@zegocloud/zego-uikit-prebuilt-call-rn";
import ZegoUIKit from "@zegocloud/zego-uikit-rn";
import { Audio } from "expo-av";

// ─── Call states ───
type CallPhase = "ringing" | "active" | "ended";

export default function CallScreen() {
  const router = useRouter();
  const { name, avatarUrl, callerUserId, customerId, targetUserId, callId: paramCallId, isIncoming } = useLocalSearchParams<{
    name?: string;
    avatarUrl?: string;
    callerUserId?: string;
    customerId?: string;
    targetUserId?: string;
    callId?: string;
    isIncoming?: string;
  }>();

  const { user, token } = useAuthStore();

  // สร้าง avatar URL:
  // - เป็นสายเข้า → ใช้ callerUserId + token
  // - เป็นสายออก → ใช้ targetUserId + token
  const resolvedAvatarUrl: string | null = (() => {
    const uid = callerUserId || targetUserId;
    if (uid && token) {
      return `${API_BASE_URL}/users/profile-image/${uid}?t=${encodeURIComponent(token)}&b=${uid}`;
    }
    return avatarUrl || null;
  })();

  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  // ─── backend call record id ───
  const [callId, setCallId] = useState<number | null>(paramCallId ? Number(paramCallId) : null);
  const startTimeRef = useRef<Date>(new Date());
  const messageSentRef = useRef(false);
  const [avatarError, setAvatarError] = useState(false);
  const [zegoReady, setZegoReady] = useState(false);

  // ─── Permission Check ───
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Toast.show({
            type: "error",
            text1: "จำเป็นต้องใช้ไมโครโฟน",
            text2: "กรุณาอนุญาตให้แอปเข้าถึงไมโครโฟนเพื่อคุยโทรศัพท์",
          });
        }
      } catch (e) {
        console.error("Permission error:", e);
      }
    };
    requestPermissions();
  }, []);

  // ─── Zego Ready Delay ───
  useEffect(() => {
    if (phase === "active") {
      // Small delay to ensure ringtone is stopped and audio session is stable
      const timer = setTimeout(() => {
        setZegoReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setZegoReady(false);
    }
  }, [phase]);

  // =========================================================
  // CREATE call record when screen opens
  // =========================================================
  useEffect(() => {
    const createCallRecord = async () => {
      try {
        if (!token) return;
        if (isIncoming === "true") return; // Incoming calls do not create records natively on screen launch.


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
        if (user?.role === "SALE") {
          body.saleUserId = user.id;
          if (targetUserId) body.customerUserId = Number(targetUserId);
        }
        if (user?.role === "CUSTOMER") {
          body.customerUserId = user.id;
          if (targetUserId) body.saleUserId = Number(targetUserId);
        }

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

  // ─── Play Ringtone ───
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const manageRingtone = async () => {
      if (phase === "ringing") {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          });

          // แยกเสียงฝั่งคนโทร (ตื๊ด...ตื๊ด...) กับคนรับ (เสียงเรียกเข้า)
          // ✅ ปรับปรุงให้โหลดไฟล์ในเครื่องก่อน ถ้าไม่ได้ค่อยใช้ลิงก์สำรอง (ลดโอกาสหน้าแดง)
          try {
            const localSource = isIncoming === "true"
              ? require("../../assets/audio/ringing.mp3")
              : require("../../assets/audio/outgoing.mp3");
            
            const { sound } = await Audio.Sound.createAsync(
              localSource,
              { shouldPlay: true, isLooping: true }
            );

            if (!isCancelled) {
              soundRef.current = sound;
            } else {
              sound.unloadAsync();
            }
          } catch (localErr) {
            console.warn("Local audio failed, trying fallback URL...", localErr);
            // Fallback to remote URL
            const remoteUri = isIncoming === "true" 
              ? "https://upload.wikimedia.org/wikipedia/commons/4/4b/Telephone_Ring.wav"
              : "https://upload.wikimedia.org/wikipedia/commons/7/77/Beep_beep_beep.wav";

            const { sound } = await Audio.Sound.createAsync(
              { uri: remoteUri },
              { shouldPlay: true, isLooping: true }
            );

            if (!isCancelled) {
              soundRef.current = sound;
            } else {
              sound.unloadAsync();
            }
          }
        } catch (e) {
          console.warn("All audio sources failed:", e);
        }
      } else {
        // Stop playing
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      }
    };

    manageRingtone();

    return () => {
      isCancelled = true;
      if (soundRef.current) {
        soundRef.current.stopAsync().then(() => soundRef.current?.unloadAsync());
        soundRef.current = null;
      }
    };
  }, [phase, isIncoming]);

  // ─── socket listeners (answer / end) ───
  useEffect(() => {
    if (!callId) return;
    
    const socket = getSocket();

    const onCallAnswered = (payload: any) => {
      if (Number(payload.callId) === callId) {
        setPhase("active");
        Toast.show({ type: "success", text1: "เชื่อมต่อแล้ว", text2: "สายเข้ารหัสส่วนตัว" });
      }
    };
    const onCallEnded = async (payload: any) => {
      if (Number(payload.callId) === callId) {
        setPhase("ended");
        Toast.show({ type: "info", text1: "สายถูกวางหรือถูกปฏิเสธ" });
        
        // If we are the Caller, and the Receiver hung up, WE send the final message.
        if (isIncoming !== "true" && !messageSentRef.current) {
          messageSentRef.current = true;
          try {
            const finalDuration = payload.durationSec ?? seconds;
            const effectiveRoomId = customerId ? `cust:${customerId}` : "general";
            // ถ้าไม่มีระยะเวลาสนทนา = ไม่ได้รับสาย
            const chatText = finalDuration > 0
              ? `[CALL_ENDED]:${finalDuration}`
              : `[CALL_CANCELED]`;
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
                text: chatText,
              }),
            });
          } catch(e) { console.error("Error sending proxy call ended message", e) }
        }

        setTimeout(() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(screens)/all-chat");
        }, 800);
      }
    };

    socket.on("call:answered", onCallAnswered);
    socket.on("call:ended", onCallEnded);

    return () => {
      socket.off("call:answered", onCallAnswered);
      socket.off("call:ended", onCallEnded);
    };
  }, [callId, router]);

  // ─── call timer ───
  useEffect(() => {
    if (phase !== "active") return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const answerCall = async () => {
    // แจ้ง backend ว่ารับสาย → backend จะ emit call:answered ไปหาคนโทรออก
    if (callId && token) {
      try {
        await fetch(`${API_BASE_URL}/calls/${callId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "ONGOING" }),
        });
        console.log(`✅ Call ${callId} answered → ONGOING`);
      } catch (err) {
        console.error("❌ answerCall PUT error:", err);
      }
    }
    setPhase("active");
  };

  // =========================================================
  // END CALL → update record with endedAt + durationSec + status
  // =========================================================
  const hangUp = async () => {
    try {
      ZegoUIKit.leaveRoom();
    } catch(e) { console.log(e) }
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

        // Send chat message ONLY if Caller manually hung up first
        if (isIncoming !== "true" && !messageSentRef.current) {
          messageSentRef.current = true;
          const effectiveRoomId = customerId 
            ? `cust:${customerId}` 
            : "general";
          // ถ้าไม่มีระยะเวลาสนทนา = ไม่ได้รับสาย
          const chatText = durationSec > 0
            ? `[CALL_ENDED]:${durationSec}`
            : `[CALL_CANCELED]`;
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
                text: chatText,
              }),
          });
          console.log(`✅ Sent call message to chat (${chatText})`);
        }

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
      {/* ─── Hidden Zego Engine ─── */}
      {phase === "active" && zegoReady && user?.id && callId && (
        <View style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}>
          <ZegoUIKitPrebuiltCall
            appID={228592494}
            appSign={"8cb8d11c60842ce6431d5f340852a6aa7d9c8fff11c68f7d83704886f9d81b03"}
            userID={String(user.id)}
            userName={user.name || "User"}
            callID={`ROOM_${callId}`}
            config={{
                turnOnCameraWhenJoining: false,
                turnOnMicrophoneWhenJoining: !muted,
                useSpeakerWhenJoining: speaker,
                bottomMenuBarConfig: { hideAutomatically: false, hideByClick: false, maxCount: 0, buttons: [] },
                topMenuBarConfig: { isVisible: false },
            }}
          />
        </View>
      )}

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
            {resolvedAvatarUrl && !avatarError ? (
              <Image
                source={{ uri: resolvedAvatarUrl }}
                className="w-[120px] h-[120px]"
                resizeMode="cover"
                onError={() => setAvatarError(true)}
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
          {/* Top row — mute + speaker - shown only when active */}
          {phase === "active" && (
            <View className="flex-row justify-center mb-8" style={{ gap: 40 }}>
              {/* Mute */}
              <Pressable
                onPress={() => {
                  setMuted((v) => {
                    const newMuted = !v;
                    try {
                      ZegoUIKit.turnMicrophoneOn(String(user?.id), !newMuted);
                    } catch (e) { console.log(e); }
                    return newMuted;
                  });
                }}
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
                onPress={() => {
                  setSpeaker((v) => {
                    const newSpeaker = !v;
                    try {
                      ZegoUIKit.setAudioOutputToSpeaker(newSpeaker);
                    } catch (e) { console.log(e); }
                    return newSpeaker;
                  });
                }}
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
          )}

          {/* Incoming Call Answer/Reject */}
          {phase === "ringing" && isIncoming === "true" ? (
             <View className="flex-row justify-center items-center" style={{ gap: 40 }}>
                {/* End/Reject */}
                <View className="items-center">
                  <Pressable onPress={hangUp} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                    <View className="w-[72px] h-[72px] rounded-full bg-red-500 items-center justify-center shadow-lg">
                      <Ionicons name="call" size={32} color="#ffffff" style={{ transform: [{ rotate: "135deg" }] }} />
                    </View>
                  </Pressable>
                  <Text className="text-red-300 text-xs mt-2">ปฏิเสธ (Decline)</Text>
                </View>

                {/* Answer */}
                <View className="items-center">
                  <Pressable onPress={answerCall} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                    <View className="w-[72px] h-[72px] rounded-full bg-emerald-500 items-center justify-center shadow-lg">
                      <Ionicons name="call" size={32} color="#ffffff" />
                    </View>
                  </Pressable>
                  <Text className="text-emerald-100 text-xs mt-2">รับสาย (Answer)</Text>
                </View>
             </View>
          ) : (
            <View className="items-center">
              <Pressable
                onPress={hangUp}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <View className="w-[72px] h-[72px] rounded-full bg-red-500 items-center justify-center shadow-lg">
                  <Ionicons name="call" size={32} color="#ffffff" style={{ transform: [{ rotate: "135deg" }] }} />
                </View>
              </Pressable>
              <Text className="text-red-300 text-xs mt-2">วางสาย (End)</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
