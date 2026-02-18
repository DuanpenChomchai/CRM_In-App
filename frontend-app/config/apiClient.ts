// config/apiClient.ts
// Axios instance พร้อม interceptor สำหรับ auto-refresh token
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ---------- helpers อ่าน/เขียน auth storage ----------
const AUTH_KEY = "auth-storage";

type AuthStorage = {
  state: {
    user: any;
    token: string | null;
    refreshToken: string | null;
  };
};

const getAuthFromStorage = async (): Promise<AuthStorage["state"] | null> => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed: AuthStorage = JSON.parse(raw);
    return parsed.state ?? null;
  } catch {
    return null;
  }
};

const updateTokensInStorage = async (
  token: string,
  refreshToken: string,
  user?: any
) => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return;
    const parsed: AuthStorage = JSON.parse(raw);
    parsed.state.token = token;
    parsed.state.refreshToken = refreshToken;
    if (user) parsed.state.user = user;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
  } catch {
    // silent
  }
};

const clearAuthStorage = async () => {
  await AsyncStorage.removeItem(AUTH_KEY);
};

// ---------- Request interceptor: แนบ Bearer token ----------
apiClient.interceptors.request.use(async (config) => {
  const auth = await getAuthFromStorage();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// ---------- Response interceptor: auto-refresh เมื่อได้ 401 ----------
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ถ้าไม่ใช่ 401 หรือ retry แล้ว → ส่งต่อ error
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ถ้าเป็น request ไป /refresh เอง → ไม่ต้อง retry
    if (originalRequest.url?.includes("/refresh")) {
      return Promise.reject(error);
    }

    // ---------- ทำ refresh ----------
    if (isRefreshing) {
      // มี refresh กำลังทำอยู่ → รอคิว
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            originalRequest._retry = true;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const auth = await getAuthFromStorage();
      if (!auth?.refreshToken) {
        throw new Error("No refresh token");
      }

      const res = await axios.post(`${API_BASE_URL}/refresh`, {
        refreshToken: auth.refreshToken,
      });

      const { token: newToken, refreshToken: newRefresh } = res.data;

      // อัปเดต storage
      await updateTokensInStorage(newToken, newRefresh, res.data.user);

      // อัปเดต Zustand store (ถ้า import ได้)
      try {
        const { useAuthStore } = require("../store/useAuthStore");
        useAuthStore.setState({
          token: newToken,
          refreshToken: newRefresh,
          ...(res.data.user ? { user: res.data.user } : {}),
        });
      } catch {
        // silent — Zustand ยังไม่พร้อม
      }

      processQueue(null, newToken);

      // retry original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // refresh ล้มเหลว → logout
      await clearAuthStorage();
      try {
        const { useAuthStore } = require("../store/useAuthStore");
        useAuthStore.setState({ user: null, token: null, refreshToken: null });
      } catch {
        // silent
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
