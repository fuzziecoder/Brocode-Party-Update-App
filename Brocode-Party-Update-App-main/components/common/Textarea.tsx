import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
}

const Textarea: React.FC<TextareaProps> = ({ label, id, error, ...props }) => {
  const errorClasses = error ? 'border-red-500/70 focus:ring-red-500 focus:border-red-500' : 'border-zinc-700/50 focus:ring-zinc-500 focus:border-zinc-500';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
      <textarea
        id={id}
        className={`w-full py-3 px-4 bg-[#2D2D2D] border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition ${errorClasses}`}
        {...props}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            className="mt-1.5 text-xs text-red-400"
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

export default Textarea;
