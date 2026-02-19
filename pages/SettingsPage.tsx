import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, ChevronRight, Palette, Shield, Bell, Info, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className={`p-3 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-zinc-900 border-white/5 text-zinc-400 hover:bg-zinc-800'
              : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Settings
          </h1>
          <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            Customize your experience
          </p>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="mb-8">
        <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
          Appearance
        </h2>
        <div className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-[#111] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
          {/* Theme Toggle */}
          <div className={`flex items-center justify-between p-5 ${isDark ? '' : ''}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                {isDark ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-amber-500" />}
              </div>
              <div>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Theme</p>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
                isDark ? 'bg-indigo-600' : 'bg-amber-400'
              }`}
              aria-label="Toggle theme"
            >
              <motion.div
                className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                animate={{ left: isDark ? '4px' : '28px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {isDark ? <Moon size={12} className="text-indigo-600" /> : <Sun size={12} className="text-amber-500" />}
              </motion.div>
            </button>
          </div>

          {/* Theme Preview */}
          <div className={`px-5 pb-5 ${isDark ? 'border-t border-white/5' : 'border-t border-gray-100'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-4 mb-3 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
              Preview
            </p>
            <div className="flex gap-3">
              {/* Dark Preview */}
              <button
                onClick={() => !isDark && toggleTheme()}
                className={`flex-1 rounded-2xl p-4 border-2 transition-all ${
                  isDark
                    ? 'border-indigo-500 bg-black'
                    : 'border-transparent bg-zinc-900 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Moon size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-white">Dark</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-zinc-700 rounded-full" />
                  <div className="h-2 w-3/4 bg-zinc-800 rounded-full" />
                  <div className="h-2 w-1/2 bg-zinc-800 rounded-full" />
                </div>
              </button>
              {/* Light Preview */}
              <button
                onClick={() => isDark && toggleTheme()}
                className={`flex-1 rounded-2xl p-4 border-2 transition-all ${
                  !isDark
                    ? 'border-amber-400 bg-white'
                    : 'border-transparent bg-gray-100 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sun size={14} className="text-amber-500" />
                  <span className={`text-xs font-bold ${!isDark ? 'text-gray-900' : 'text-gray-700'}`}>Light</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-gray-200 rounded-full" />
                  <div className="h-2 w-3/4 bg-gray-100 rounded-full" />
                  <div className="h-2 w-1/2 bg-gray-100 rounded-full" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* General Section */}
      <div className="mb-8">
        <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
          General
        </h2>
        <div className={`rounded-[2rem] border overflow-hidden divide-y ${
          isDark ? 'bg-[#111] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'
        }`}>
          <SettingsRow
            icon={<Bell size={20} />}
            label="Notifications"
            description="Manage alerts"
            isDark={isDark}
            onClick={() => navigate('/dashboard/notifications')}
          />
          <SettingsRow
            icon={<Shield size={20} />}
            label="Privacy"
            description="Account security"
            isDark={isDark}
          />
          <SettingsRow
            icon={<Info size={20} />}
            label="About"
            description="App version 2.0.0"
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
};

const SettingsRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  isDark: boolean;
  onClick?: () => void;
}> = ({ icon, label, description, isDark, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-5 transition-colors ${
      isDark ? 'hover:bg-zinc-900/50' : 'hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </div>
      <div className="text-left">
        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className={isDark ? 'text-zinc-600' : 'text-gray-300'} />
  </button>
);

export default SettingsPage;
