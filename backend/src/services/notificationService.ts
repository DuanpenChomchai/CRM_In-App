// Use dynamic import for ES module compatibility in CommonJS environment
export async function sendPushNotification(
  targetTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
) {
  console.log(`[PUSH] sendPushNotification called for ${targetTokens.length} tokens. Title: "${title}"`);
  
  // Dynamically import expo-server-sdk to prevent ERR_REQUIRE_ESM crash
  const { Expo } = await import('expo-server-sdk');
  const expo = new Expo();

  let messages = [];
  for (let pushToken of targetTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`[PUSH] Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default' as const,
      priority: 'high' as const, // ปลุกหน้าจอเครื่องทันที
      title: title,
      body: body,
      data: data, // ส่ง data เพื่อให้แอปสลับหน้าจอตามทริกเกอร์
    });
  }

  let chunks = expo.chunkPushNotifications(messages);
  console.log(`[PUSH] Chunked into ${chunks.length} chunks`);
  
  let tickets = [];
  for (let chunk of chunks) {
    try {
      console.log(`[PUSH] Sending chunk of ${chunk.length} messages to Expo...`);
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(`[PUSH] Expo response ticket chunk:`, JSON.stringify(ticketChunk));
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("[PUSH] Error sending push notification chunk:", error);
    }
  }
}
