import React, { useEffect } from "react";
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
import { getSocket } from "../store/socket";
import ZegoUIKitPrebuiltCallService, {
  ZegoCallInvitationDialog,
} from "@zegocloud/zego-uikit-prebuilt-call-rn";
import * as ZIM from "zego-zim-react-native";
import { View, Text } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { setZegoNavParams } from "../utils/zegoNavigationBridge";

export const unstable_settings = {
  anchor: "(auth)/login",
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

  const { user, token } = require("../store/useAuthStore").useAuthStore();

  // Global Incoming Call Listener
  useEffect(() => {
    if (!user?.id) return;

    const { setSocketAuth } = require("../store/socket");
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
      // Construct an avatar url if possible, or leave blank to fallback
      const avatarUrl = payload.callerId && token
          ? `${require("../config/api").API_BASE_URL}/users/profile-image/${payload.callerId}?t=${encodeURIComponent(token)}&b=${payload.callerId}`
          : "";
      
      router.push({
        pathname: "/(screens)/call-screen",
        params: {
          name: payload.callerName || "User",
          avatarUrl,
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
  }, [user?.id, router]);

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
