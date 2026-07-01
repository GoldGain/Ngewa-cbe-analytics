// ─── Password Reset with OTP SMS ─────────────────────────────────────────────
// ⚠️ OTP SMS uses sender ID "PROCALL" — DO NOT CHANGE

import { sendSMS } from './sms';
import { formatOTPMessage } from './sms-templates';
import { supabase } from './supabase/client';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request password reset via OTP SMS
 * Sends OTP to the user's phone (or parent's phone for students)
 */
export const requestPasswordResetOTP = async (identifier: string): Promise<{ success: boolean; error?: string; phone?: string }> => {
  try {
    // Try to find user by email first
    let targetPhone: string | null = null;
    let userId: string | null = null;

    // Check teachers table
    const { data: teacherData } = await (supabase as any)
      .from('teachers')
      .select('id, phone, profile_id')
      .or(`email.eq.${identifier}`)
      .limit(1)
      .single();

    if (teacherData?.phone) {
      targetPhone = teacherData.phone;
      userId = teacherData.profile_id;
    }

    // Check students table (send to parent phone)
    if (!targetPhone) {
      const { data: studentData } = await (supabase as any)
        .from('students')
        .select('id, parent_phone, profile_id')
        .or(`student_email.eq.${identifier},admission_number.eq.${identifier.toUpperCase()}`)
        .limit(1)
        .single();

      if (studentData?.parent_phone) {
        targetPhone = studentData.parent_phone;
        userId = studentData.profile_id;
      }
    }

    if (!targetPhone) {
      return { error: 'No phone number found for this account. Please contact your school administrator.' };
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await (supabase as any)
      .from('password_reset_otps')
      .upsert({
        user_id: userId,
        otp_code: otp,
        expires_at: expiresAt,
        used: false,
      }, { onConflict: 'user_id' });

    // Send OTP via SMS
    const message = formatOTPMessage(otp);
    const smsResult = await sendSMS(targetPhone, message);

    if (!smsResult.success) {
      return { error: 'Failed to send OTP SMS. Please try email reset instead.' };
    }

    // Mask phone number for display
    const maskedPhone = targetPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
    return { success: true, phone: maskedPhone };
  } catch (error: any) {
    return { error: error.message || 'Failed to process password reset request' };
  }
};

/**
 * Verify OTP and return success/failure
 */
export const verifyOTP = async (userId: string, otp: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const { data, error } = await (supabase as any)
      .from('password_reset_otps')
      .select('otp_code, expires_at, used')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { valid: false, error: 'OTP not found. Please request a new one.' };
    }

    if (data.used) {
      return { valid: false, error: 'OTP has already been used. Please request a new one.' };
    }

    if (new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (data.otp_code !== otp) {
      return { valid: false, error: 'Invalid OTP. Please check and try again.' };
    }

    // Mark OTP as used
    await (supabase as any)
      .from('password_reset_otps')
      .update({ used: true })
      .eq('user_id', userId);

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Failed to verify OTP' };
  }
};
