import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";

type UserPayload = {
  id: number;
  name: string;
  email: string;
  tol: string;
  role: string;
};

type AuthState = {
  user: UserPayload | null;
  token: string | null;
  setAuthAfterLogin: (user: UserPayload, token: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setAuthAfterLogin: async (user, token) => {
        set({ user, token });
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
