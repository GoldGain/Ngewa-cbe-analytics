import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { GraduationCap, Loader2, ArrowLeft, Check, Mail, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { sendSMS, generateOTPSMS } from '@/lib/sms';

type ResetMethod = 'email' | 'admission' | 'phone';

export default function ForgotPassword() {
  const [resetMethod, setResetMethod] = useState<ResetMethod>('email');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [foundEmail, setFoundEmail] = useState('');
  // OTP flow state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [pendingOtp, setPendingOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (resetMethod === 'phone') {
        // Phone OTP flow
        let normalizedPhone = identifier.trim().replace(/\s/g, '');
        if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
        if (normalizedPhone.startsWith('+')) normalizedPhone = normalizedPhone.slice(1);
        if (!normalizedPhone.startsWith('254')) normalizedPhone = '254' + normalizedPhone;

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setPendingOtp(otp);

        // Send OTP via SMS
        const otpMessage = generateOTPSMS(otp);
        const smsResult = await sendSMS(normalizedPhone, otpMessage);
        if (!smsResult.success) {
          setError('Failed to send OTP SMS. Please try email reset instead.');
          setLoading(false);
          return;
        }

        const masked = normalizedPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
        setMaskedPhone(masked);
        setOtpSent(true);
        toast.success(`OTP sent to ${masked}`);
        setLoading(false);
        return;
      }

      let email = identifier;

      // If using assessment number, find the student's email
      if (resetMethod === 'admission') {
        const { data: student, error: studentError } = await (supabase as any)
          .from('students')
          .select('student_email, admission_number, first_name, last_name')
          .eq('admission_number', identifier.toUpperCase())
          .maybeSingle();

        if (studentError || !student) {
          setError('Assessment number not found. Please contact your school.');
          setLoading(false);
          return;
        }

        if (!student.student_email) {
          setError('No email linked to this assessment number. Please contact your school administrator.');
          setLoading(false);
          return;
        }

        email = student.student_email;
        setFoundEmail(email);
        toast.success(`Found learner: ${student.first_name} ${student.last_name}`);
      }

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }
      
      setFoundEmail(email);
      setSuccess(true);
      toast.success('Password reset link sent! Check your email.');
      
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifyingOtp(true);
    try {
      if (otpCode.trim() !== pendingOtp) {
        setError('Invalid OTP. Please check and try again.');
        setVerifyingOtp(false);
        return;
      }
      setOtpVerified(true);
      toast.success('OTP verified! Please use email reset to set a new password.');
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // OTP Sent — show OTP entry form
  if (otpSent && !otpVerified) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <button onClick={() => setOtpSent(false)} className="inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#111111] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-[#111111]">Enter OTP</h2>
              <p className="text-sm text-gray-500 mt-1">We sent a 6-digit code to <strong>{maskedPhone}</strong></p>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">OTP Code</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-center text-2xl tracking-widest font-mono"
                  required
                  maxLength={6}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={verifyingOtp || otpCode.length < 6}
                className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP'}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-4">OTP expires in 10 minutes. Check your SMS from PROCALL.</p>
          </div>
        </div>
      </div>
    );
  }

  if (otpVerified) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Identity Verified!</h2>
          <p className="text-sm text-[#666666] mb-4">
            Your OTP was verified. Please contact your school administrator to complete the password reset, or use the email reset method.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Check Your Email</h2>
          <p className="text-sm text-[#666666] mb-4">
            We sent a password reset link to <strong>{foundEmail || identifier}</strong>
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Click the link in the email to create a new password.
          </p>
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link to="/auth/login" className="inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#111111] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#111111]">CBE-Analytics</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Reset Password</h1>
          <p className="text-sm text-[#666666] mt-1">We'll send you a reset link</p>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

                    {/* Toggle between Email, Phone OTP, and Assessment Number */}
          <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setResetMethod('email'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                resetMethod === 'email'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button
              type="button"
              onClick={() => { setResetMethod('phone'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                resetMethod === 'phone'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> Phone OTP
            </button>
            <button
              type="button"
              onClick={() => { setResetMethod('admission'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                resetMethod === 'admission'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Assess. No.
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">
                {resetMethod === 'email' ? 'Email Address' : resetMethod === 'phone' ? 'Phone Number' : 'Assessment Number'}
              </label>
              <input
                type={resetMethod === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  resetMethod === 'email'
                    ? 'you@school.ac.ke'
                    : resetMethod === 'phone'
                    ? 'e.g. 0712345678'
                    : 'e.g., GFA-2025-001'
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                required
                autoFocus
              />
              {resetMethod === 'phone' && (
                <p className="text-xs text-gray-500 mt-1">
                  An OTP will be sent to your registered phone number via SMS (Sender: PROCALL)
                </p>
              )}
              {resetMethod === 'admission' && (
                <p className="text-xs text-gray-500 mt-1">
                  Enter your assessment number to reset your password
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2563EB] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : resetMethod === 'phone' ? (
                'Send OTP via SMS'
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#666666]">
            Remember your password?{' '}
            <Link to="/auth/login" className="text-[#2563EB] font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}