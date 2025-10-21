import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams } from "expo-router";

type Msg =
  | { id: string; fromMe: boolean; type: "text"; text: string; time: string }
  | {
      id: string;
      fromMe: boolean;
      type: "audio";
      durationSec: number;
      time: string;
    };

const mockMessages: Msg[] = [
  {
    id: "m1",
    fromMe: false,
    type: "text",
    text: "Hi! How can I help?",
    time: "15:01",
  },
  {
    id: "m2",
    fromMe: true,
    type: "text",
    text: "Need the latest KPI report",
    time: "15:02",
  },
];

function formatClock(t = new Date()) {
  const h = t.getHours().toString().padStart(2, "0");
  const m = t.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function ChatDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const [messages, setMessages] = useState<Msg[]>(mockMessages);
  const [input, setInput] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordSec(0);
  };

  const stopAndSend = () => {
    if (!isRecording) return;
    const duration = recordSec;
    setIsRecording(false);
    setRecordSec(0);
    if (duration > 0) {
      const newMsg: Msg = {
        id: `a-${Date.now()}`,
        fromMe: true,
        type: "audio",
        durationSec: duration,
        time: formatClock(new Date()),
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordSec(0);
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  const sendText = () => {
    const text = input.trim();
    if (!text) return;
    const newMsg: Msg = {
      id: `t-${Date.now()}`,
      fromMe: true,
      type: "text",
      text,
      time: formatClock(new Date()),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
  };

  const renderMessage = ({ item }: { item: Msg }) => {
    const isMe = item.fromMe;
    const align = isMe ? "items-end" : "items-start";
    const bg = isMe ? "bg-emerald-600" : "bg-gray-100";
    const textColor = isMe ? "text-white" : "text-gray-900";
    const subColor = isMe ? "text-emerald-100" : "text-gray-400";

    return (
      <View className={`mb-2 ${align}`}>
        <View className={`max-w-[78%] rounded-2xl px-3 py-2 ${bg}`}>
          {item.type === "text" ? (
            <>
              <Text className={`${textColor} text-[15px]`}>{item.text}</Text>
              <Text className={`${subColor} text-[10px] mt-1`}>
                {item.time}
              </Text>
            </>
          ) : (
            <>
              <View className="flex-row items-center">
                <View
                  className={`w-8 h-8 rounded-full ${
                    isMe ? "bg-emerald-700" : "bg-gray-200"
                  } items-center justify-center mr-2`}
                >
                  <Ionicons
                    name="play"
                    size={16}
                    color={isMe ? "#ffffff" : "#111827"}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`${textColor} text-[15px]`}>
                    Voice message
                  </Text>
                  <Text className={`${subColor} text-[11px]`}>
                    {formatDuration(item.durationSec)}
                  </Text>
                </View>
              </View>
              <Text className={`${subColor} text-[10px] mt-1`}>
                {item.time}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = useMemo(
    () => (
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Link href="/(screens)/all-chat" asChild>
          <Pressable className="pr-3 -ml-2">
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
        </Link>
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-gray-900"
            numberOfLines={1}
          >
            {name ?? "Chat"}
          </Text>
          <Text className="text-xs text-gray-500">ID: {id ?? "-"}</Text>
        </View>
        <Pressable className="pl-3" onPress={() => {}}>
          <Ionicons name="call-outline" size={20} color="#047857" />
        </Pressable>
      </View>
    ),
    [id, name]
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {ListHeader}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={renderMessage}
      />

      {isRecording && (
        <View className="px-3 py-2 bg-rose-50 border-t border-rose-200">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-rose-100 items-center justify-center mr-2">
              <Ionicons name="mic" size={16} color="#be123c" />
            </View>
            <View className="flex-1">
              <Text className="text-rose-700 font-medium">
                Recording... {formatDuration(recordSec)}
              </Text>
              <Text className="text-rose-400 text-xs">
                UI only — no audio file saved
              </Text>
            </View>

            <Pressable
              className="px-3 py-2 rounded-xl bg-rose-100 mr-2"
              onPress={cancelRecording}
            >
              <Ionicons name="trash-outline" size={18} color="#be123c" />
            </Pressable>

            <Pressable
              className="px-3 py-2 rounded-xl bg-emerald-600"
              onPress={stopAndSend}
            >
              <View className="flex-row items-center">
                <Ionicons name="stop" size={14} color="#ffffff" />
                <Text className="text-white ml-2">Stop</Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center px-3 py-2 border-t border-gray-200 bg-white">

          <Pressable className="px-2 py-2" onPress={() => {}}>
            <Ionicons name="add-circle-outline" size={22} color="#6B7280" />
          </Pressable>

          <View
            className={`flex-1 mx-2 rounded-2xl px-3 ${
              isRecording ? "bg-gray-200" : "bg-gray-100"
            }`}
          >
            <TextInput
              className="py-2"
              placeholder={isRecording ? "Recording..." : "Message"}
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              editable={!isRecording}
              returnKeyType="send"
              onSubmitEditing={sendText}
            />
          </View>

          {input.trim().length > 0 && !isRecording ? (
            <Pressable
              className="px-3 py-2 rounded-2xl"
              onPress={sendText}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons name="send" size={20} color="#047857" />
            </Pressable>
          ) : (
            <Pressable
              className={`px-3 py-2 rounded-2xl ${
                isRecording ? "bg-rose-100" : ""
              }`}
              onPress={isRecording ? stopAndSend : startRecording}
              onLongPress={startRecording}
              delayLongPress={120}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons
                name={isRecording ? "mic" : "mic-outline"}
                size={20}
                color={isRecording ? "#be123c" : "#6B7280"}
              />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
