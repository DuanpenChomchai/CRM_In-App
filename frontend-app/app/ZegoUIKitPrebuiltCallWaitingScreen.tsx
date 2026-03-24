import React from "react";
import { useRoute } from "@react-navigation/native";
import { ZegoUIKitPrebuiltCallWaitingScreen as ZegoWaiting } from "@zegocloud/zego-uikit-prebuilt-call-rn";
import { getZegoNavParams } from "../utils/zegoNavigationBridge";

/**
 * Bridge screen: Expo Router → ZegoCloud SDK
 * Tries multiple param sources:
 * 1. Navigation bridge store (set by interceptor, preserves types)
 * 2. React Navigation's useRoute().params (fallback)
 */
export default function CallWaitingScreen() {
  const route = useRoute();
  const bridgeParams = getZegoNavParams();
  const params = bridgeParams || route.params || {};

  console.log("[ZegoWaitingBridge] params:", JSON.stringify(params));

  return <ZegoWaiting route={{ params }} />;
}
