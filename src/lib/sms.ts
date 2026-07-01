// ─── Olympus SMS API Integration ─────────────────────────────────────────────
// ⚠️ SENDER ID IS "PROCALL" — DO NOT CHANGE

const OLYMPUS_API_URL = 'https://sms.ots.co.ke/api/v3/sms/send';
const OLYMPUS_API_TOKEN = '3682|HN95vYSLpT8BcOjhWYj7gBVOXTSp1B3UsZFbtByfbfef70cf';
const DEFAULT_SENDER_ID = 'PROCALL'; // ⚠️ CORRECT SENDER ID — MUST BE "PROCALL"

interface SMSPayload {
  recipient: string;   // Format: 254XXXXXXXXX
  sender_id: string;   // Must be "PROCALL"
  type: 'plain';       // Must be "plain"
  message: string;     // Plain text only, no emojis
}

interface SMSResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Send a single SMS via Olympus SMS API
 * @param phone - Phone number in format 254XXXXXXXXX
 * @param message - Plain text message (no emojis or special characters)
 */
export async function sendSMS(phone: string, message: string): Promise<SMSResponse> {
  try {
    // Normalize phone to 254XXXXXXXXX format
    let normalizedPhone = phone.trim().replace(/\s/g, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '254' + normalizedPhone.slice(1);
    }
    if (normalizedPhone.startsWith('+')) {
      normalizedPhone = normalizedPhone.slice(1);
    }
    if (!normalizedPhone.startsWith('254')) {
      normalizedPhone = '254' + normalizedPhone;
    }

    const payload: SMSPayload = {
      recipient: normalizedPhone,
      sender_id: DEFAULT_SENDER_ID, // PROCALL
      type: 'plain',
      message: message.replace(/[^\w\s.,;:!?@#$%&*()\-+=/[\]{}|<>~^`\n]/g, ''), // Strip emojis
    };

    const response = await fetch(OLYMPUS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OLYMPUS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, message: 'SMS sent successfully', data };
    } else {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
}

/**
 * Send bulk SMS to multiple recipients
 * @param recipients - Array of phone numbers
 * @param message - Plain text message
 */
export async function sendBulkSMS(recipients: string[], message: string): Promise<SMSResponse> {
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const phone of recipients) {
    const result = await sendSMS(phone, message);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    results.push({ phone, ...result });
  }

  return {
    success: failCount === 0,
    message: `Sent: ${successCount}, Failed: ${failCount}`,
    data: results,
  };
}

// ─── OTP SMS ──────────────────────────────────────────────────────────────────

export function generateOTPSMS(otp: string): string {
  return `Password Reset Request\n\nYour OTP verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore.\n\nSmarter Schools, Brighter Futures`;
}

// ─── Welcome SMS Messages ────────────────────────────────────────────────────

export function generateWelcomeSMS(
  firstName: string,
  role: string,
  email: string,
  password: string,
  schoolName?: string
): string {
  const schoolLine = schoolName ? ` at ${schoolName}` : '';
  return `Welcome to CBE-Analytics${schoolLine}!\n\nHello ${firstName}, your ${role} account has been created.\n\nLogin: ${email}\nPassword: ${password}\nPortal: https://cbe-analytics.com\n\nPlease change your password after first login.\n\nSmarter Schools, Brighter Futures`;
}

export function generateResultsSMS(
  parentName: string,
  studentName: string,
  termName: string,
  average: string,
  position?: string
): string {
  const posLine = position ? `\nPosition: ${position}` : '';
  return `Dear ${parentName},\n${studentName}'s ${termName} results are now available.\nAverage: ${average}%${posLine}\n\nLogin: https://cbe-analytics.com\n\nSmarter Schools, Brighter Futures`;
}

export function generateAnnouncementSMS(
  schoolName: string,
  message: string
): string {
  return `School Announcement\n\n${message}\n\nSmarter Schools, Brighter Futures`;
}
