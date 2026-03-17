import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "noreply@neuroid.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendInviteEmail({
  to,
  inviteToken,
  role,
}: {
  to: string;
  inviteToken: string;
  role: string;
}) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();

  const { error } = await getResend().emails.send({
    from: `Neuroid OS <${FROM}>`,
    to,
    subject: "You've been invited to Neuroid OS",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">
          You're invited to Neuroid OS
        </h1>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          You've been invited to join Neuroid OS as a <strong>${roleLabel}</strong>.
          Click the button below to set up your account.
        </p>
        <a href="${inviteUrl}"
           style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Accept Invite
        </a>
        <p style="font-size: 13px; color: #999; margin-top: 32px; line-height: 1.5;">
          This invite expires in 7 days. If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send invite email:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
}: {
  to: string;
  resetToken: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const { error } = await getResend().emails.send({
    from: `Neuroid OS <${FROM}>`,
    to,
    subject: "Reset your Neuroid OS password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">
          Reset your password
        </h1>
        <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset your Neuroid OS password.
          Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
          Reset Password
        </a>
        <p style="font-size: 13px; color: #999; margin-top: 32px; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    throw error;
  }
}
