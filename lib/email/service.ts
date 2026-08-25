// lib/email/service.ts
// Email service abstraction (supports Resend, SendGrid, etc.)

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via configured provider
 * Supports Resend (default) or SendGrid via environment variable
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'resend';

  if (provider === 'sendgrid') {
    return sendGridEmail(options);
  }

  // Default: Resend
  return resendEmail(options);
}

/**
 * Send via Resend (recommended for Next.js)
 */
async function resendEmail(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@mstore.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Resend API error: ${error}`,
      };
    }

    const data = (await response.json()) as { id: string };
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Send via SendGrid (alternative)
 */
async function sendGridEmail(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: 'SENDGRID_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: options.to }],
          },
        ],
        from: {
          email: process.env.EMAIL_FROM || 'noreply@mstore.com',
        },
        subject: options.subject,
        content: [
          {
            type: 'text/html',
            value: options.html,
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `SendGrid API error: ${error}`,
      };
    }

    return {
      success: true,
      messageId: response.headers.get('x-message-id') || 'sent',
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
