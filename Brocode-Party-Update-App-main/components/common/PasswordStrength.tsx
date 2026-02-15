
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface PasswordStrengthProps {
  password?: string;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabel = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Unbreakable'][strength];
  const strengthColor = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-green-500', 'bg-cyan-400'][strength];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Strength</span>
        <span className={`text-[10px] font-bold uppercase ${strengthColor.replace('bg-', 'text-')}`}>{strengthLabel}</span>
      </div>
      <div className="flex gap-1 h-1.5 px-1">
        {[0, 1, 2, 3].map((step) => (
          <motion.div
            key={step}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className={`flex-1 rounded-full transition-colors duration-500 ${
              step < strength ? strengthColor : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
