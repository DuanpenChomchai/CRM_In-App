import React, { useEffect, useRef } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import "react-native-reanimated";
import Toast from "react-native-toast-message";
import { toastConfig } from "../components/toastConfig";
import { getSocket, setSocketAuth } from "../store/socket";
import { useAuthStore } from "../store/useAuthStore";
import ZegoUIKitPrebuiltCallService, {
  ZegoCallInvitationDialog,
} from "@zegocloud/zego-uikit-prebuilt-call-rn";
import * as ZIM from "zego-zim-react-native";
import { View, Text } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { setZegoNavParams } from "../utils/zegoNavigationBridge";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import { registerForPushNotificationsAsync } from "../utils/notifications";
import * as Notifications from "expo-notifications";

export const unstable_settings = {
  anchor: "(screens)/all-chat",
};

/**
 * Registers a global function that the patched ZegoCloud SDK calls
 * instead of navigation.navigate() for call screens.
 */
function ZegoNavigationBridge() {
  const router = useRouter();
  const routerRef = React.useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // ตั้ง global function ครั้งเดียว — ใช้ ref เพื่อให้ได้ router ล่าสุดเสมอ
    (global as any).__zegoExpoRouterPush = (
      screenName: string,
      params: Record<string, any>
    ) => {
      console.log(`[ZegoNavBridge] Navigating to ${screenName}`, params);
      setZegoNavParams(params);
      routerRef.current.push(`/${screenName}` as any);
    };
    // ไม่ cleanup เพราะถ้า null → SDK จะ fallback เป็น navigation.navigate ซึ่ง error
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  // ใช้ ref เพื่อกัน router เปลี่ยน reference แล้ว trigger useEffect ซ้ำ
  const routerRef = useRef(router);
  routerRef.current = router;

  const { user, token } = useAuthStore();

  // Global Incoming Call Listener — run เฉพาะตอน user.id เปลี่ยน
  useEffect(() => {
    if (!user?.id) return;

    setSocketAuth({
      token: token ?? null,
      role: user.role ?? null,
      userId: user.id ?? null,
    });

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const onIncomingCall = (payload: any) => {
      console.log("🔔 Global Incoming Call:", payload);
      routerRef.current.push({
        pathname: "/(screens)/call-screen",
        params: {
          name: payload.callerName || "User",
          callerUserId: payload.callerId ? String(payload.callerId) : "",
          customerId: payload.customerId ? String(payload.customerId) : "",
          callId: String(payload.callId),
          isIncoming: "true",
        },
      });
    };

    socket.on("call:incoming", onIncomingCall);

    return () => {
      socket.off("call:incoming", onIncomingCall);
    };
  }, [user?.id]);

  // Register Push Token on Login
  useEffect(() => {
    if (!user?.id || !token) return;

    registerForPushNotificationsAsync().then(pushToken => {
      if (pushToken) {
        console.log("📲 Registered Push Token:", pushToken);
        axios.post(
          `${API_BASE_URL}/notifications/register`,
          {
            token: pushToken,
            userId: user.id,
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        ).then(res => {
          console.log("✅ Server registered push token successfully", res.data);
        }).catch(err => {
          console.error("❌ Failed to register push token on server:", err);
        });
      }
    });
  }, [user?.id, token]);

  // Listen for push notification click / response
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = response.notification.request.content.data;
        console.log("🎯 Push Notification Clicked:", data);
        
        // 💬 Room messaging click -> deep link to chat-detail
        if (data?.roomId) {
          routerRef.current.push({
            pathname: "/(screens)/chat-detail" as any,
            params: { roomId: String(data.roomId) }
          } as any);
        }
        
        // 📞 Incoming call click -> deep link to call-screen
        if (data?.type === "INCOMING_CALL") {
          routerRef.current.push({
            pathname: "/(screens)/call-screen" as any,
            params: {
              callId: String(data.callId),
              callerUserId: String(data.callerUserId),
              customerId: String(data.customerId),
              name: String(data.name || "ผู้ติดต่อ"),
              isIncoming: "true"
            }
          } as any);
        }
      } catch (err) {
        console.error("Error handling push notification response:", err);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="(auth)/login"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(auth)/sign-up"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(screens)/all-chat"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(screens)/edit-profile"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(screens)/profile"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(screens)/chat-detail"
          options={{ headerShown: false, animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="(screens)/call-screen"
          options={{ headerShown: false, animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="ZegoUIKitPrebuiltCallInCallScreen"
          options={{ headerShown: false, animation: "fade" }}
        />
        <Stack.Screen
          name="ZegoUIKitPrebuiltCallWaitingScreen"
          options={{ headerShown: false, animation: "fade" }}
        />
      </Stack>
      <ZegoNavigationBridge />
      <ZegoCallInvitationDialog />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Toast config={toastConfig} position="top" topOffset={50} />
    </ThemeProvider>
  );
}
