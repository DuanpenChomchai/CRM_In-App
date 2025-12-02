import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserPayload = {
  id: number;
  name: string;
  email: string;
  tol: string;
  role: "CUSTOMER" | "SALE" | "MANAGER" | "ADMIN";
};

type AuthState = {
  user: UserPayload | null;
  token: string | null;
  setAuthAfterLogin: (user: UserPayload, token: string) => Promise<void>;
  setUser: (user: UserPayload | null) => void;   
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      // ใช้ตอน login ปกติ
      setAuthAfterLogin: async (user, token) => {
        set({ user, token });
      },

      // ใช้ตอนแก้โปรไฟล์ (อัปเดตเฉพาะ user ไม่ยุ่งกับ token)
      setUser: (user) => {
        set({ user });
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
