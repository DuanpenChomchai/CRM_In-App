import React from "react";
import { useRoute } from "@react-navigation/native";
import { ZegoUIKitPrebuiltCallInCallScreen as ZegoInCall } from "@zegocloud/zego-uikit-prebuilt-call-rn";
import { getZegoNavParams } from "../utils/zegoNavigationBridge";

/**
 * Bridge screen: Expo Router → ZegoCloud SDK
 * Tries multiple param sources:
 * 1. Navigation bridge store (set by interceptor, preserves types)
 * 2. React Navigation's useRoute().params (fallback)
 */
export default function CallInCallScreen() {
  const route = useRoute();
  const bridgeParams = getZegoNavParams();
  const params = bridgeParams || route.params || {};

  console.log("[ZegoInCallBridge] params:", JSON.stringify(params));

  return <ZegoInCall route={{ params }} />;
}
