
import React, { useState, useRef, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OtpInputProps {
  length: number;
  onChange: (otp: string) => void;
  label: string;
  error?: string | null;
}

const OtpInput: React.FC<OtpInputProps> = ({ length, onChange, label, error }) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return; // Only allow numbers

    const newOtp = [...otp];
    // Allow only one digit
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Combine and call parent onChange
    const combinedOtp = newOtp.join('');
    onChange(combinedOtp);

    // Move to next input if digit is entered
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move focus to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const digits = pasteData.replace(/\D/g, '').split('').slice(0, length);
    
    if (digits.length > 0) {
      const newOtp = Array(length).fill('');
      digits.forEach((digit, index) => {
        newOtp[index] = digit;
      });
      setOtp(newOtp);
      onChange(newOtp.join(''));

      const lastFilledIndex = Math.min(digits.length - 1, length);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const errorClasses = error ? 'border-red-500/70 focus:ring-red-500' : 'border-zinc-700/50 focus:ring-zinc-500';

  return (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
            {label}
        </label>
        <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
        {otp.map((value, index) => (
            <input
            key={index}
            // FIX: Ensure the ref callback function has a void return type.
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            title={`Digit ${index + 1}`}
            placeholder="•"
            aria-label={`OTP digit ${index + 1}`}
            value={value}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`w-12 h-14 text-center text-2xl font-semibold bg-[#2D2D2D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-zinc-500 transition ${errorClasses}`}
            maxLength={1}
            />
        ))}
        </div>
        <AnimatePresence>
            {error && (
            <motion.p
                className="mt-1.5 text-xs text-red-400 text-center"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
            >
                {error}
            </motion.p>
            )}
      </AnimatePresence>
    </div>
  );
};

export default OtpInput;
