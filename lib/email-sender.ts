export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName?: string,
  fromEmail?: string
) {
  console.log(`[EMAIL STUB] To: ${to} | From: ${fromName} <${fromEmail}> | Subject: ${subject}`);
  return { messageId: `stub-${Date.now()}` };
}
