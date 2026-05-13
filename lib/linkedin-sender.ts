export async function sendLinkedInMessage(
  memberId: string,
  recipientProfileUrl: string,
  message: string,
  accessToken: string,
  userAgent: string
) {
  // STUB: log for now, wire to LinkedIn API when credentials are available
  console.log(`[LINKEDIN STUB] From: ${memberId} | To: ${recipientProfileUrl} | Message: ${message.slice(0, 50)}...`);
  // Real implementation will use:
  // POST https://api.linkedin.com/v2/messages with Bearer accessToken
  // Headers: User-Agent: userAgent
  void accessToken;
  void userAgent;
  return { success: true, stub: true };
}

export async function sendLinkedInConnection(
  memberId: string,
  recipientProfileUrl: string,
  message: string,
  accessToken: string,
  userAgent: string
) {
  console.log(`[LINKEDIN STUB] Connection request from: ${memberId} | To: ${recipientProfileUrl}`);
  void message;
  void accessToken;
  void userAgent;
  return { success: true, stub: true };
}
