import React from 'react';
import { motion } from 'framer-motion';

// FIX: To fix the framer-motion prop type conflict and add a 'size' prop,
// the interface now extends props from `motion.button` and includes the optional `size`.
interface ButtonProps extends Omit<React.ComponentProps<typeof motion.button>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = "rounded-lg font-semibold shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
  
  const variantClasses = {
    primary: "bg-white text-black hover:bg-zinc-200 focus:ring-zinc-400",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 focus:ring-zinc-600",
    danger: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 focus:ring-red-500",
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;