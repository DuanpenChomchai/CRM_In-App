// src/config/api.ts
import { Platform } from "react-native";

const API_HOST_IOS = process.env.EXPO_PUBLIC_API_HOST_IOS!;
const API_HOST_ANDROID = process.env.EXPO_PUBLIC_API_HOST_ANDROID!;
const API_HOST_DEVICE = process.env.EXPO_PUBLIC_API_HOST_DEVICE!;

console.log("🔧 API Config:", {
  IOS: API_HOST_IOS,
  ANDROID: API_HOST_ANDROID,
  DEVICE: API_HOST_DEVICE,
  PLATFORM: Platform.OS,
});

// เลือก host ตาม platform
export const HOST =
  Platform.OS === "ios"
    ? API_HOST_IOS
    : Platform.OS === "android"
    ? API_HOST_ANDROID
    : API_HOST_DEVICE;

console.log("🔌 Selected HOST:", HOST);

// สำหรับ REST API
export const API_BASE_URL = `${HOST}/api`;

// 🔥 ให้ WebSocket ใช้ host เดียวกับ REST เสมอ
export const WS_SERVER = HOST;
