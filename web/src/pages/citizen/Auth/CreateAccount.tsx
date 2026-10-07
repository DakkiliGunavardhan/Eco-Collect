import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { User, Mail, Phone, Calendar as CalendarIcon, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';
import appLogo from '../../../assets/logo.svg';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Calendar as ShadcnCalendar } from '../../../components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';

export const CreateAccount: React.FC = () => {
  const navigate = useNavigate();
  const { registerCitizen, login, apiCall } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address first.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || !trimmedEmail.endsWith('@gmail.com')) {
      setError('Please enter a valid Gmail address ending with @gmail.com');
      return;
    }

    setError(null);
    setOtpError(null);
    setOtpMessage(null);
    setOtpLoading(true);

    try {
      const res = await apiCall('/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });

      setIsOtpSent(true);
      setTimer(30);
      setIsTimerActive(true);
      setOtpMessage(res?.message ? `${res.message} to ${trimmedEmail}` : `Verification code sent to ${trimmedEmail}`);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setOtpLoading(true);
    setOtpError(null);
    try {
      await apiCall('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() })
      });
      setIsOtpVerified(true);
      setOtpMessage('Email address verified successfully!');
      setOtpError(null);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      const res = await apiCall('/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });
      setTimer(30);
      setIsTimerActive(true);
      setOtpMessage(res?.message ? `${res.message} to ${trimmedEmail}` : `A new verification code has been sent to ${trimmedEmail}`);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOtpVerified) {
      setError('Please verify your email address via OTP before signing up.');
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!/^(?!.*[.\-']{2})(?!.* {2})[a-zA-Z][a-zA-Z\s.\-']*[a-zA-Z]$/.test(trimmedName) || trimmedName.length < 3 || trimmedName.length > 100) {
      setError("Please enter a valid full name. Only letters, spaces, '.', '-', and apostrophes are allowed.");
      return;
    }
    if (!trimmedEmail.endsWith('@gmail.com')) {
      setError('Email must end with @gmail.com');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setError('Phone must be exactly 10 digits and start with 6, 7, 8, or 9');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      try {
        await registerCitizen(trimmedName, trimmedEmail, trimmedPhone, dob, password);
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('already registered')) {
          // Attempt direct login if account exists to commit auth token & session
          await login(trimmedEmail, password, 'citizen');
        } else {
          throw err;
        }
      }
      navigate('/citizen/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full relative bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden animate-fade-in">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-[1.2] bg-gradient-to-br from-emerald-600 via-static-emerald-700 to-emerald-900 items-center justify-center p-8 lg:p-16 relative text-white text-center">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center max-w-md z-10">
          <div className="w-[110px] h-[110px] bg-white rounded-2xl flex items-center justify-center shadow-xl p-3 mb-6 transition-all hover:scale-[1.03]">
            <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-extrabold text-4xl lg:text-5xl tracking-tight mb-2 text-white">EcoCollect</h1>
          <p className="text-static-emerald-100 text-lg lg:text-xl font-medium mb-6">Citizen Portal</p>
          <div className="w-14 h-1 bg-white/20 rounded-full mb-6" />
          <p className="text-sm lg:text-base leading-relaxed text-static-emerald-50/90">
            Create an account to join your community in cleaning and greening your city, earning awards, and tracking neighborhood environmental issues.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-white dark:bg-card border-l border-slate-100 dark:border-border/40 shadow-2xl relative h-full overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-sm flex flex-col text-left relative py-8 px-6 sm:px-0 my-auto">
          <button 
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none py-1.5 mb-4 transition-colors w-fit" 
            onClick={() => navigate('/citizen/login')}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
          
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-900/30 rounded-xl flex items-center justify-center p-1.5 shadow-sm">
              <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground leading-none">EcoCollect</h2>
              <p className="text-xs text-muted-foreground font-medium mt-1">Citizen Portal</p>
            </div>
          </div>
          
          <h1 className="font-extrabold text-3xl text-foreground mb-1">Create Account</h1>
          <p className="text-sm text-muted-foreground mb-5">Register to begin making an impact</p>

          {error && (
            <div className="flex items-center gap-3 p-3.5 border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm mb-5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="flex flex-col gap-2.5" onSubmit={handleSignup}>
            <Input 
              label="Full Name *" 
              placeholder="John Doe" 
              value={fullName} 
              onChange={e => {
                setFullName(e.target.value);
                if (error) setError(null);
              }} 
              icon={<User size={20} className="text-slate-400" />} 
              required
            />
            
            <div className="flex flex-col gap-1 w-full">
              <Input 
                label="Email Address *" 
                placeholder="john@gmail.com" 
                type="email"
                value={email} 
                onChange={e => {
                  setEmail(e.target.value);
                  setIsOtpSent(false);
                  setIsOtpVerified(false);
                  setOtp('');
                  setOtpMessage(null);
                  setOtpError(null);
                  if (error) setError(null);
                }} 
                icon={<Mail size={20} className="text-slate-400" />} 
                required
                disabled={isOtpVerified || loading}
              />

              {!isOtpVerified && !isOtpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={!email.trim() || otpLoading}
                  className="self-end text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-none py-1 transition-colors disabled:opacity-50"
                >
                  {otpLoading ? "Sending OTP..." : "Send OTP"}
                </button>
              )}
            </div>

            {/* OTP Verification Box */}
            {isOtpSent && !isOtpVerified && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2.5 my-1">
                {otpMessage && (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {otpMessage}
                  </p>
                )}

                {otpError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <Input 
                  label="Verification Code *" 
                  placeholder="Enter 6-digit code" 
                  value={otp} 
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 6) {
                      setOtp(val);
                      if (otpError) setOtpError(null);
                    }
                  }} 
                  icon={<KeyRound size={18} className="text-slate-400" />} 
                  required
                  disabled={otpLoading}
                />

                <Button 
                  type="button"
                  onClick={handleVerifyOtp}
                  fullWidth
                  theme="green"
                  disabled={otp.length !== 6 || otpLoading}
                >
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </Button>

                <div className="flex items-center justify-between text-xs font-semibold pt-1">
                  <span className="text-muted-foreground">Didn't receive code?</span>
                  {timer > 0 ? (
                    <span className="text-muted-foreground">Resend in {timer}s</span>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpLoading}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Verified Success Badge */}
            {isOtpVerified && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Email Verified Successfully</span>
              </div>
            )}
            
            <Input 
              label="Phone Number *" 
              placeholder="9876543210" 
              value={phone} 
              onChange={e => {
                setPhone(e.target.value);
                if (error) setError(null);
              }} 
              icon={<Phone size={20} className="text-slate-400" />} 
              required
            />
            
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-semibold text-foreground select-none text-left">
                Date of Birth
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "relative flex items-center justify-start w-full border rounded-lg bg-white/80 dark:bg-background/80 border-slate-200 dark:border-border py-2.5 px-3.5 text-left text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 transition-all text-slate-900 dark:text-foreground cursor-pointer h-[42px]",
                      !dob && "text-slate-400 dark:text-muted-foreground"
                    )}
                  >
                    <CalendarIcon size={20} className="text-slate-400 mr-2.5 shrink-0" />
                    <span>{dob ? format(new Date(dob + 'T00:00:00'), "PPP") : "Select date of birth"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border border-border rounded-xl shadow-lg" align="start">
                  <ShadcnCalendar
                    mode="single"
                    selected={dob ? new Date(dob + 'T00:00:00') : undefined}
                    onSelect={(date) => {
                      setDob(date ? format(date, "yyyy-MM-dd") : "");
                      if (error) setError(null);
                    }}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    captionLayout="dropdown"
                    startMonth={new Date(1900, 0)}
                    endMonth={new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Input 
              label="Password *" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => {
                setPassword(e.target.value);
                if (error) setError(null);
              }} 
              icon={<Lock size={20} className="text-slate-400" />} 
              type={passwordVisible ? "text" : "password"}
              rightIcon={
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}
                </button>
              }
              required
            />
            
            <Input 
              label="Confirm Password *" 
              placeholder="••••••••" 
              value={confirmPassword} 
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }} 
              icon={<Lock size={20} className="text-slate-400" />} 
              type={confirmPasswordVisible ? "text" : "password"}
              rightIcon={
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                >
                  {confirmPasswordVisible ? <EyeOff size={20} className="text-slate-400" /> : <Eye size={20} className="text-slate-400" />}
                </button>
              }
              required
            />

            <div style={{ height: 2 }} />

            <Button 
              type="submit"
              fullWidth 
              theme="green" 
              disabled={!isOtpVerified || loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-3">
              Already have an account?{' '}
              <span 
                className="text-emerald-600 dark:text-emerald-400 cursor-pointer font-semibold underline hover:text-emerald-700 dark:hover:text-emerald-300" 
                onClick={() => navigate('/citizen/login')}
              >
                Sign In
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
