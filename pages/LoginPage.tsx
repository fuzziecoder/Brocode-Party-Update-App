
import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Smartphone, User, AtSign, ChevronLeft, AlertCircle } from 'lucide-react';
import { mockApi, DEFAULT_AVATARS } from '../services/mockApi';
import OtpInput from '../components/common/OtpInput';
import PasswordStrength from '../components/common/PasswordStrength';
import { profileService } from '../services/database';
import { supabase } from '../services/supabase';

type FormData = {
  loginPassword: string;
  newPassword: string;
  otp: string;
  loginEmail: string;
  resetEmail: string;
  loginMobile: string;
  mobileNumber: string;
  email: string;
  username: string;
};

const formatMobile = (val: string) => {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = ReactRouterDOM.useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [authMethod, setAuthMethod] = useState<'email' | 'mobile'>('email');
  const [view, setView] = useState<'login' | 'forgot' | 'reset' | 'mobile-register' | 'mobile-setup'>('login');

  const [formData, setFormData] = useState<FormData>({
    loginEmail: '',
    loginPassword: '',
    loginMobile: '',
    resetEmail: '',
    mobileNumber: '',
    otp: '',
    newPassword: '',
    email: '',
    username: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const isEmailValid = useMemo(() => {
    const email = view === 'login' ? formData.loginEmail : formData.resetEmail;
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [formData.loginEmail, formData.resetEmail, view]);

  const clearMessages = () => {
    setApiError(null);
    setSuccess(null);
    setErrors({});
  };

  const handleViewChange = (newView: typeof view) => {
    clearMessages();
    setView(newView);
  };

  const handleAuthMethodChange = (method: 'email' | 'mobile') => {
    clearMessages();
    setAuthMethod(method);
    setView('login');
  };

  const validateField = (name: keyof FormData, value: string): string => {
    let error = '';
    switch (name) {
      case 'loginEmail':
      case 'resetEmail':
        if (!value) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email format';
        break;
      case 'loginPassword':
      case 'newPassword':
        if (!value) error = 'Password is required';
        else if (value.length < 6) error = 'Min. 6 characters';
        break;
      case 'loginMobile':
      case 'mobileNumber':
        if (!value) error = 'Mobile number is required';
        else if (value.replace(/\D/g, '').length !== 10) error = 'Exactly 10 digits required';
        break;
      case 'otp':
        if (!value) error = 'Code is required';
        else if (value.length !== 6) error = 'Enter 6 digits';
        break;
      case 'email':
        if (!value) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email format';
        break;
      case 'username':
        if (!value.trim()) error = 'Username is required';
        break;
    }
    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as { name: keyof FormData; value: string };
    let finalValue = value;
    if (name === 'loginMobile' || name === 'mobileNumber') {
      finalValue = formatMobile(value);
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, finalValue) }));
    }
  };

  const handleOtpChange = (value: string) => {
    setFormData(prev => ({ ...prev, otp: value }));
    if (errors.otp) setErrors(prev => ({ ...prev, otp: validateField('otp', value) }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const fields = authMethod === 'email' ? ['loginEmail', 'loginPassword'] : ['loginMobile', 'loginPassword'];
    let isValid = true;
    const newErrors: any = {};
    fields.forEach(f => {
      const err = validateField(f as keyof FormData, formData[f as keyof FormData]);
      if (err) { isValid = false; newErrors[f as keyof FormData] = err; }
    });
    if (!isValid) { setErrors(newErrors); return; }

    setLoading(true);
    // Strip formatting from phone number for login
    let identifier = authMethod === 'email' ? formData.loginEmail : formData.loginMobile.replace(/\D/g, '');
    try {
      await login(identifier, formData.loginPassword);
      navigate('/dashboard/home');
    } catch (err: any) {
      setApiError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const err = validateField('resetEmail', formData.resetEmail);
    if (err) { setErrors({ resetEmail: err }); return; }
    setLoading(true);
    try {
      await mockApi.sendOtp(formData.resetEmail);
      setSuccess('Recovery code dispatched to your inbox.');
      setTimeout(() => setView('reset'), 1000);
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const e1 = validateField('otp', formData.otp);
    const e2 = validateField('newPassword', formData.newPassword);
    if (e1 || e2) { setErrors({ otp: e1, newPassword: e2 }); return; }
    setLoading(true);
    try {
      await mockApi.resetPassword(formData.resetEmail, formData.newPassword);
      setSuccess('Password secured. Returning to login...');
      setTimeout(() => setView('login'), 2000);
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const err = validateField('mobileNumber', formData.mobileNumber);
    if (err) { setErrors({ mobileNumber: err }); return; }
    setLoading(true);
    try {
      // Check if user already exists
      const phoneDigits = formData.mobileNumber.replace(/\D/g, '');
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phoneDigits)
        .single();
      
      if (existing) {
        setApiError('Account already exists. Please login instead.');
        setTimeout(() => setView('login'), 2000);
        return;
      }

      // Go directly to setup form
      setView('mobile-setup');
    } catch (err: any) {
      // If user doesn't exist, proceed to setup
      setView('mobile-setup');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const e1 = validateField('email', formData.email);
    const e2 = validateField('username', formData.username);
    const e3 = validateField('newPassword', formData.newPassword);
    if (e1 || e2 || e3) { setErrors({ email: e1, username: e2, newPassword: e3 }); return; }

    // Check username uniqueness
    try {
      const isUnique = await profileService.isUsernameUnique(formData.username.trim());
      if (!isUnique) {
        setErrors({ username: 'Username already taken' });
        return;
      }
    } catch (err: any) {
      setApiError('Error checking username. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const phoneDigits = formData.mobileNumber.replace(/\D/g, '');
      // Generate name from username (capitalize first letter)
      const name = formData.username.trim().charAt(0).toUpperCase() + formData.username.trim().slice(1);
      const newProfile = await profileService.createProfile({
        name: name,
        username: formData.username.trim(),
        phone: phoneDigits,
        email: formData.email.trim(),
        password: formData.newPassword,
        profile_pic_url: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
        role: 'user',
      });

      // Auto-login after registration
      await login(phoneDigits, formData.newPassword);
      setSuccess('Account created! Welcome to the squad.');
      setTimeout(() => navigate('/dashboard/home'), 1500);
    } catch (err: any) {
      setApiError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex justify-center mb-10"><Logo className="h-10 w-auto" /></div>
        <div className="bg-[#111111] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl overflow-hidden relative">
          
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div key="tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center p-1.5 bg-zinc-900/50 rounded-2xl mb-10">
                <button onClick={() => handleAuthMethodChange('email')} className={`w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${authMethod === 'email' ? 'bg-white text-black' : 'text-zinc-500'}`}>Email</button>
                <button onClick={() => handleAuthMethodChange('mobile')} className={`w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${authMethod === 'mobile' ? 'bg-white text-black' : 'text-zinc-500'}`}>Mobile</button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {view === 'login' && authMethod === 'email' && (
              <motion.div key="email-login" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-8">LOG IN</h1>
                <form className="space-y-6" onSubmit={handleLogin} noValidate>
                  <div className="relative">
                    <Input name="loginEmail" label="Email Address" type="email" value={formData.loginEmail} onChange={handleChange} error={errors.loginEmail} icon={<Mail size={16}/>} placeholder="john@doe.com"/>
                    {!isEmailValid && formData.loginEmail && (
                      <div className="absolute right-4 top-10 text-orange-400 flex items-center gap-1"><AlertCircle size={14}/><span className="text-[10px] font-bold">FORMAT?</span></div>
                    )}
                  </div>
                  <Input name="loginPassword" label="Password" type={showPassword ? 'text' : 'password'} value={formData.loginPassword} onChange={handleChange} error={errors.loginPassword} icon={<Lock size={16}/>} rightIcon={showPassword ? <EyeOff size={16}/> : <Eye size={16}/>} onRightIconClick={() => setShowPassword(!showPassword)}/>
                  <div className="flex justify-end px-1"><button type="button" onClick={() => setView('forgot')} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Forgot Password?</button></div>
                  <Button type="submit" className="w-full py-4 uppercase tracking-widest font-black" disabled={loading}>Enter Squad</Button>
                </form>
              </motion.div>
            )}

            {view === 'login' && authMethod === 'mobile' && (
              <motion.div key="mobile-login" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-8">MOBILE</h1>
                <form className="space-y-6" onSubmit={handleLogin} noValidate>
                  <Input name="loginMobile" label="Phone" type="tel" value={formData.loginMobile} onChange={handleChange} error={errors.loginMobile} icon={<Smartphone size={16}/>} placeholder="(000) 000-0000"/>
                  <Input name="loginPassword" label="Password" type={showPassword ? 'text' : 'password'} value={formData.loginPassword} onChange={handleChange} error={errors.loginPassword} icon={<Lock size={16}/>} rightIcon={showPassword ? <EyeOff size={16}/> : <Eye size={16}/>} onRightIconClick={() => setShowPassword(!showPassword)}/>
                  <Button type="submit" className="w-full py-4 uppercase tracking-widest font-black" disabled={loading}>Join Meetup</Button>
                  <div className="text-center"><button type="button" onClick={() => setView('mobile-register')} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Create Account</button></div>
                </form>
              </motion.div>
            )}

            {view === 'forgot' && (
              <motion.div key="forgot-v" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <button onClick={() => setView('login')} className="flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"><ChevronLeft size={16} /><span className="text-[10px] font-black uppercase tracking-widest ml-1">Back</span></button>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-8">RECOVER</h1>
                <form className="space-y-6" onSubmit={handleForgotSubmit} noValidate>
                  <Input name="resetEmail" label="Verification Email" type="email" value={formData.resetEmail} onChange={handleChange} error={errors.resetEmail} icon={<Mail size={16}/>} placeholder="john@doe.com"/>
                  <Button type="submit" className="w-full py-4 uppercase tracking-widest font-black" disabled={loading}>Send Reset Code</Button>
                </form>
              </motion.div>
            )}

            {view === 'reset' && (
              <motion.div key="reset-v" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-8">NEW KEY</h1>
                <form className="space-y-6" onSubmit={handleResetSubmit} noValidate>
                  <OtpInput length={6} label="6-Digit Secret" onChange={handleOtpChange} error={errors.otp}/>
                  <div className="space-y-3">
                    <Input name="newPassword" label="Set New Password" type="password" value={formData.newPassword} onChange={handleChange} error={errors.newPassword} icon={<Lock size={16}/>}/>
                    <PasswordStrength password={formData.newPassword} />
                  </div>
                  <Button type="submit" className="w-full py-4 uppercase tracking-widest font-black" disabled={loading}>Update Access</Button>
                </form>
              </motion.div>
            )}

            {view === 'mobile-register' && (
              <motion.div key="mobile-register" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <button onClick={() => setView('login')} className="flex items-center text-zinc-500 hover:text-white mb-6 transition-colors"><ChevronLeft size={16} /><span className="text-[10px] font-black uppercase tracking-widest ml-1">Back</span></button>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-8">JOIN SQUAD</h1>
                <form className="space-y-6" onSubmit={handleMobileRegister} noValidate>
                  <Input name="mobileNumber" label="Phone Number" type="tel" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} icon={<Smartphone size={16}/>} placeholder="(000) 000-0000"/>
                  <Button type="submit" className="w-full py-4 uppercase tracking-widest font-black" disabled={loading}>Send Code</Button>
                </form>
              </motion.div>
            )}

            {view === 'mobile-setup' && (
              <motion.div key="mobile-setup" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                <h1 className="text-3xl font-black text-white tracking-tighter mb-8">SETUP</h1>
                <form className="space-y-6" onSubmit={handleMobileSetup} noValidate>
                  <Input name="email" label="Email Address" type="email" value={formData.email} onChange={handleChange} error={errors.email} icon={<Mail size={16}/>} placeholder="john@doe.com"/>
                  <Input name="username" label="Username" type="text" value={formData.username} onChange={handleChange} error={errors.username} icon={<AtSign size={16}/>} placeholder="johndoe"/>
                  <div className="space-y-3">
                    <Input name="newPassword" label="Password" type="password" value={formData.newPassword} onChange={handleChange} error={errors.newPassword} icon={<Lock size={16}/>}/>
                    <PasswordStrength password={formData.newPassword} />
                  </div>
                  <Button type="submit" className="w-full py-4 uppercase tracking-widest font-black" disabled={loading}>Create Account</Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {(apiError || success) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-6 p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border ${apiError ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                {apiError || success}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
