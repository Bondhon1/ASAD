import Ably from "ably";

// Server-side Ably client for publishing notifications
let serverAblyClient: Ably.Rest | null = null;

export function getServerAblyClient(): Ably.Rest | null {
  if (!serverAblyClient) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      console.warn("ABLY_API_KEY environment variable is not set - real-time notifications disabled");
      return null;
    }
    serverAblyClient = new Ably.Rest({ key: apiKey });
  }
  return serverAblyClient;
}

// Publish a notification to a user's personal channel
export async function publishNotification(userId: string, notification: {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  createdAt: Date;
}) {
  try {
    const client = getServerAblyClient();
    if (!client) return; // Ably not configured
    
    const channel = client.channels.get(`user-${userId}-notifications`);
    await channel.publish("notification", notification);
  } catch (error) {
    console.error("Failed to publish Ably notification:", error);
    // Don't throw - notifications should fail gracefully
  }
}

// Publish a chat message event to both participants
export async function publishChatMessage(params: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  message: {
    id: string;
    body: string;
    fromUserId: string;
    toUserId: string;
    readAt: Date | null;
    createdAt: Date;
  };
}) {
  try {
    const client = getServerAblyClient();
    if (!client) return;
    const payload = {
      ...params.message,
      conversationId: params.conversationId,
      readAt: params.message.readAt?.toISOString() ?? null,
      createdAt: params.message.createdAt.toISOString(),
    };
    // Publish to both participants' personal chat channels simultaneously
    await Promise.all([
      client.channels.get(`user-${params.recipientId}-chat`).publish("new-message", payload),
      client.channels.get(`user-${params.senderId}-chat`).publish("new-message", payload),
    ]);
  } catch (error) {
    console.error("Failed to publish Ably chat message:", error);
  }
}

// Token request endpoint helper for client-side authentication
export async function generateTokenRequest(
  userId: string,
  extraCapabilities?: Record<string, Ably.capabilityOp[] | ["*"]>
): Promise<Ably.TokenRequest> {
  const client = getServerAblyClient();
  if (!client) {
    throw new Error("Ably is not configured");
  }

  const tokenRequest = await client.auth.createTokenRequest({
    clientId: userId,
    capability: {
      [`user-${userId}-notifications`]: ["subscribe"],
      [`user-${userId}-chat`]: ["subscribe"],
      ...extraCapabilities,
    },
  });

  return tokenRequest;
}
