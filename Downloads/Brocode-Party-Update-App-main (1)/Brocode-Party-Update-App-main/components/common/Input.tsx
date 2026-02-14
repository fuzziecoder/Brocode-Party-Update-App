
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  error?: string | null;
}

const Input: React.FC<InputProps> = ({ label, id, icon, rightIcon, onRightIconClick, error, ...props }) => {
  const errorClasses = error ? 'border-red-500/70 ring-1 ring-red-500/30' : 'border-zinc-700/50 focus-within:border-zinc-500';

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 ml-1">
        {label}
      </label>
      <div className={`relative flex items-center bg-[#1A1A1A] border rounded-xl transition-all duration-300 ${errorClasses}`}>
        {icon && (
          <div className="pl-4 pr-1 text-zinc-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full py-3.5 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm ${icon ? 'pl-2' : 'pl-4'} ${rightIcon ? 'pr-12' : 'pr-4'}`}
          {...props}
        />
        {rightIcon && (
           <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              onRightIconClick?.();
            }} 
            className="absolute right-0 h-full w-12 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            aria-label="Toggle input visibility"
           >
             {rightIcon}
           </button>
        )}
      </div>
       <AnimatePresence>
        {error && (
          <motion.p
            className="mt-2 text-[10px] font-bold uppercase tracking-tight text-red-400 ml-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Input;
