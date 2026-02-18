import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BaseToastProps } from "react-native-toast-message";

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; bg: string; accent: string; border: string }> = {
  success: { name: "checkmark-circle", bg: "#ECFDF5", accent: "#059669", border: "#A7F3D0" },
  error:   { name: "close-circle",     bg: "#FEF2F2", accent: "#DC2626", border: "#FECACA" },
  info:    { name: "information-circle", bg: "#FFFBEB", accent: "#D97706", border: "#FDE68A" },
};

function CustomToast({ toastType, text1, text2 }: BaseToastProps & { toastType: string }) {
  const cfg = ICON_MAP[toastType] ?? ICON_MAP.info;

  return (
    <View
      style={{
        width: "92%",
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: cfg.bg,
        borderWidth: 1,
        borderColor: cfg.border,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <Ionicons name={cfg.name} size={26} color={cfg.accent} />

      <View style={{ flex: 1, marginLeft: 12 }}>
        {!!text1 && (
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1F2937" }}>
            {text1}
          </Text>
        )}
        {!!text2 && (
          <Text style={{ fontSize: 13, color: "#4B5563", marginTop: 2 }}>
            {text2}
          </Text>
        )}
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => <CustomToast {...props} toastType="success" />,
  error:   (props: BaseToastProps) => <CustomToast {...props} toastType="error" />,
  info:    (props: BaseToastProps) => <CustomToast {...props} toastType="info" />,
};
