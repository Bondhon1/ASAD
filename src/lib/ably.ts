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

// Token request endpoint helper for client-side authentication
export async function generateTokenRequest(userId: string): Promise<Ably.TokenRequest> {
  const client = getServerAblyClient();
  if (!client) {
    throw new Error("Ably is not configured");
  }
  
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: userId,
    capability: {
      [`user-${userId}-notifications`]: ["subscribe"],
    },
  });
  
  return tokenRequest;
}
