import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import "./global.css";

export default function Index() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    // Small delay to ensure navigation is ready
    const timer = setTimeout(() => {
      if (token) {
        router.replace("/(screens)/all-chat" as any);
      } else {
        router.replace("/(auth)/login" as any);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [token]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#047857" />
    </View>
  );
}
