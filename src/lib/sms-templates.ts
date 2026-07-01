// ─── SMS Templates ────────────────────────────────────────────────────────────
// ⚠️ ALL TEMPLATES USE SENDER ID "PROCALL" — DO NOT CHANGE
// ⚠️ NO EMOJIS, NO SPECIAL CHARACTERS — PLAIN TEXT ONLY

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  schoolName?: string;
}

/**
 * Format welcome SMS message for new users
 */
export function formatWelcomeMessage(userData: UserData, defaultPassword: string): string {
  const schoolLine = userData.schoolName ? ` at ${userData.schoolName}` : '';
  const roleLabel = userData.role.replace(/_/g, ' ');
  return `Welcome to CBE-Analytics${schoolLine}!\n\nHello ${userData.firstName}, your ${roleLabel} account has been created.\n\nLogin: ${userData.email}\nPassword: ${defaultPassword}\nPortal: https://cbe-analytics.com\n\nPlease change your password after first login.\n\nSmarter Schools, Brighter Futures`;
}

/**
 * Format OTP message for password reset
 */
export function formatOTPMessage(otp: string): string {
  return `Password Reset Request\n\nYour OTP verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore.\n\nSmarter Schools, Brighter Futures`;
}

/**
 * Format results notification SMS
 */
export function formatResultsMessage(
  parentName: string,
  studentName: string,
  termName: string,
  average: string,
  position?: string
): string {
  const posLine = position ? `\nPosition: ${position}` : '';
  return `Dear ${parentName},\n${studentName}'s ${termName} results are now available.\nAverage: ${average}%${posLine}\n\nLogin: https://cbe-analytics.com\n\nSmarter Schools, Brighter Futures`;
}

/**
 * Format announcement SMS
 */
export function formatAnnouncementMessage(message: string): string {
  return `School Announcement\n\n${message}\n\nSmarter Schools, Brighter Futures`;
}
