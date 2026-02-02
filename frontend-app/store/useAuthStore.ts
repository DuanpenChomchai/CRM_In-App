import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import { Platform } from "react-native";

export const API_HOST = "http://10.0.2.2:3000";
export const API_BASE_URL = `${API_HOST}/api`;

export type UserPayload = {
  id: number;
  name: string;
  email: string;
  tol: string;
  role: "CUSTOMER" | "SALE" | "MANAGER" | "ADMIN";
  img?: string | null;
};

type AuthState = {
  user: UserPayload | null;
  token: string | null;

  setAuthAfterLogin: (user: UserPayload, token: string) => Promise<void>;
  setUser: (user: UserPayload | null) => void;

  fetchMe: () => Promise<UserPayload>;
  uploadProfileImage: (uri: string) => Promise<UserPayload>;

  logout: () => Promise<void>;
};

const normalizeImg = (user: UserPayload): UserPayload => {
  const img = user.img;
  if (!img) return user;

  // URL เต็มแล้ว
  if (img.startsWith("http://") || img.startsWith("https://")) return user;

  // เป็น path เช่น "/uploads/.."
  if (img.startsWith("/")) return { ...user, img: `${API_HOST}${img}` };

  // เป็น filename/key -> ใช้ proxy endpoint ผ่าน backend
  return {
    ...user,
    img: `${API_BASE_URL}/users/profile-image/${user.id}?b=${Date.now()}`,
  };
};

const guessMime = (filename: string) => {
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuthAfterLogin: async (user, token) => {
        set({ user: normalizeImg(user), token });
      },

      setUser: (user) => {
        set({ user: user ? normalizeImg(user) : null });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) throw new Error("No token");

        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const raw: UserPayload = res.data?.user ?? res.data;
        const normalized = normalizeImg(raw);
        set({ user: normalized });
        return normalized;
      },

      uploadProfileImage: async (uri: string) => {
        const token = get().token;
        const currentUser = get().user;
        if (!token) throw new Error("No token");
        if (!currentUser?.id) throw new Error("No user");

        // iOS บางเครื่องต้องตัด file://
        const safeUri =
          Platform.OS === "ios" && uri.startsWith("file://")
            ? uri.replace("file://", "")
            : uri;

        const filename = uri.split("/").pop() || `profile_${Date.now()}.jpg`;
        const mime = guessMime(filename);

        const formData = new FormData();
        formData.append(
          "img",
          {
            uri: safeUri,
            name: filename,
            type: mime,
          } as any
        );

        const res = await axios.put(
          `${API_BASE_URL}/users/me/profile-image`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            timeout: 60000,
          }
        );

        const rawUpdated: UserPayload = res.data?.user ?? res.data;
        let updated = normalizeImg(rawUpdated);

        // cache bust เผื่อแคชรูป
        if (updated.img && (updated.img.startsWith("http://") || updated.img.startsWith("https://"))) {
          updated = {
            ...updated,
            img: `${updated.img}${updated.img.includes("?") ? "&" : "?"}b=${Date.now()}`,
          };
        }

        set({ user: updated });
        return updated;
      },

      logout: async () => {
        set({ user: null, token: null });
        await AsyncStorage.removeItem("auth-storage");
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
