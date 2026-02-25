import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import Toast from "react-native-toast-message";
import { toastConfig } from "../components/toastConfig";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(auth)/login",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
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
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Toast config={toastConfig} position="top" topOffset={50} />
    </ThemeProvider>
  );
}
