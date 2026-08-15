import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Mail, Smartphone, ArrowRight, UserCheck, CheckCircle2, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onLoginSuccess: (user: { name: string; role: string; email: string }) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onLoginSuccess
}) => {
  const [authType, setAuthType] = useState<'citizen' | 'officer'>('officer');
  
  // Citizen form state
  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  // Officer form state
  const [govEmail, setGovEmail] = useState('nodal.andheri@nic.in');
  const [password, setPassword] = useState('••••••••••••');
  const captchaCode = '7K9A2';
  const [captchaInput, setCaptchaInput] = useState('7K9A2');

  const [isLoading, setIsLoading] = useState(false);
  const [loginMsg, setLoginMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setOtpSent(true);
        setLoginMsg('6-Digit OTP sent to your registered mobile number!');
      }, 800);
    } else {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess({
          name: 'Citizen User',
          role: 'Citizen Portal Access',
          email: mobileOrEmail || 'citizen@nivaran.gov.in'
        });
        onClose();
      }, 1000);
    }
  };

  const handleOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: 'Vaibhavi Tiwari',
        role: 'Nodal Officer (Ward 4)',
        email: govEmail
      });
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-955/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-[#7A0C38] text-white p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-wide font-heading">
                  NIVARAN DARPG SSO Authentication
                </h3>
                <p className="text-xs text-amber-200">
                  Government of India Single Sign-On Portal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Switcher Tabs */}
          <div className={`flex border-b text-xs font-extrabold ${
            isDarkMode ? 'border-slate-800 bg-slate-955' : 'border-slate-200 bg-slate-100'
          }`}>
            <button
              onClick={() => {
                setAuthType('officer');
                setLoginMsg(null);
              }}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
                authType === 'officer'
                  ? 'border-[#7A0C38] text-[#7A0C38] bg-white dark:bg-slate-900 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Nodal Officer Login</span>
            </button>

            <button
              onClick={() => {
                setAuthType('citizen');
                setLoginMsg(null);
              }}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
                authType === 'citizen'
                  ? 'border-[#7A0C38] text-[#7A0C38] bg-white dark:bg-slate-900 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Citizen OTP Access</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4 font-sans">
            
            {loginMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{loginMsg}</span>
              </div>
            )}

            {/* TAB 1: NODAL OFFICER LOGIN */}
            {authType === 'officer' && (
              <form onSubmit={handleOfficerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Government Official Email (.gov.in / .nic.in)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={govEmail}
                      onChange={(e) => setGovEmail(e.target.value)}
                      placeholder="officer.name@nic.in"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    NIC Security Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Security CAPTCHA */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Security Verification CAPTCHA
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="px-4 py-2 rounded-xl bg-slate-955 border border-slate-700 text-amber-300 font-mono font-black text-lg tracking-widest select-none">
                      {captchaCode}
                    </div>
                    <input
                      type="text"
                      required
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Enter CAPTCHA"
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Authenticating Credentials...</span>
                  ) : (
                    <>
                      <span>Authenticate Officer Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: CITIZEN OTP LOGIN */}
            {authType === 'citizen' && (
              <form onSubmit={handleCitizenSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Mobile Number / Email / Aadhaar Virtual ID
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={mobileOrEmail}
                      onChange={(e) => setMobileOrEmail(e.target.value)}
                      placeholder="+91 9876543210 or citizen@email.com"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Enter 6-Digit Verification OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      placeholder="1 2 3 4 5 6"
                      className={`w-full px-3 py-2.5 rounded-xl border text-center font-mono text-lg font-black tracking-widest focus:ring-2 focus:ring-[#7A0C38] focus:outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#7A0C38] hover:bg-[#961247] text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Processing...</span>
                  ) : otpSent ? (
                    <>
                      <span>Verify OTP & Access Portal</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* DigiLocker SSO Notice */}
            <div className={`p-3 rounded-xl border text-[11px] text-center ${
              isDarkMode ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              Supports <strong>Parichay Govt SSO</strong> & <strong>DigiLocker Auth</strong>. Fully compliant with MeitY Security Guidelines.
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
