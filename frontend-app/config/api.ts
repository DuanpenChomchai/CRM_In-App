import { Platform } from "react-native";
import {
  API_HOST_IOS,
  API_HOST_ANDROID,
  API_HOST_DEVICE,
  WS_SERVER as WS_ENV
} from "@env";

export const HOST = Platform.select({
  ios: API_HOST_IOS,
  android: API_HOST_ANDROID,
  default: API_HOST_DEVICE,
});

export const API_BASE_URL = `${HOST}/api`;

export const WS_SERVER = WS_ENV;
