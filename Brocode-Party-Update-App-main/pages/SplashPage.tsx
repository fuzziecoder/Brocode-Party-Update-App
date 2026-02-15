

import React, { useEffect } from 'react';
// FIX: Use namespace import for react-router-dom to address potential module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/common/Logo';

const SplashPage: React.FC = () => {
  const navigate = ReactRouterDOM.useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        navigate('/dashboard/home');
      } else {
        navigate('/login');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, user]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        <Logo className="h-24"/>
      </motion.div>
    </div>
  );
};

export default SplashPage;
