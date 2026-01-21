
import React from 'react';
// FIX: Use namespace import for react-router-dom to address potential module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { Home, CreditCard, History, Bell, User, Zap, ChevronsUpDown, LogOut, MessageSquare, Wine, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useChat } from '../../contexts/ChatContext';
import ShinyText from '../common/ShinyText';

const navItems = [
    { path: '/dashboard/home', icon: Home, label: 'Home' },
    { path: '/dashboard/payment', icon: CreditCard, label: 'Payment' },
    { path: '/dashboard/drinks', icon: Wine, label: 'Drinks' },
    { path: '/dashboard/history', icon: History, label: 'History' },
    { path: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    { path: '/dashboard/chat', icon: MessageSquare, label: 'Chat' },
];

const bottomNavItems = [
    { path: '/dashboard/profile', icon: User, label: 'Profile' }
];

const NavItem: React.FC<{ item: typeof navItems[0]; isMobile: boolean }> = ({ item, isMobile }) => {
    const { unreadCount: unreadNotificationsCount } = useNotifications();
    const { unreadCount: unreadChatCount } = useChat();
    const isNotificationsLink = item.label === 'Notifications';
    const isChatLink = item.label === 'Chat';
    const badgeCount = isNotificationsLink ? unreadNotificationsCount : (isChatLink ? unreadChatCount : 0);

    if (isMobile) {
        return (
            <ReactRouterDOM.NavLink
                to={item.path}
                className="flex-1 flex justify-center items-center h-full group"
                aria-label={item.label}
            >
                {({ isActive }) => (
                    <motion.div
                        layout
                        className={`flex items-center justify-center gap-2 h-11 rounded-full transition-colors duration-300 ${isActive ? 'bg-white text-black px-4' : 'text-gray-400 w-11 group-hover:bg-zinc-800'
                            }`}
                    >
                        <div className="relative">
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {badgeCount > 0 && (
                                <span className={`absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-white' : 'border-[#1C1C1C]'}`}>
                                    {badgeCount > 9 ? '9+' : badgeCount}
                                </span>
                            )}
                        </div>
                        {isActive && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="text-xs font-semibold whitespace-nowrap"
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </motion.div>
                )}
            </ReactRouterDOM.NavLink>
        );
    }

    // Desktop styles
    return (
        <ReactRouterDOM.NavLink
            to={item.path}
            className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-md transition-colors duration-200 text-sm font-medium ${isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
                }`
            }
        >
            <item.icon className="h-5 w-5 mr-3" />
            <span className="flex-1">{item.label}</span>
            {badgeCount > 0 && (
                <span className="ml-2 bg-pink-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </span>
            )}
        </ReactRouterDOM.NavLink>
    );
};


const DashboardLayout: React.FC = () => {
    const location = ReactRouterDOM.useLocation();
    const { profile, logout } = useAuth();
    const allNavItemsForMobile = [...navItems, ...bottomNavItems];
    const [showDownloadBanner, setShowDownloadBanner] = React.useState(() => {
        // Check if banner was dismissed before
        const dismissed = localStorage.getItem('downloadBannerDismissed');
        return !dismissed;
    });

    return (
        <div className="flex h-screen bg-black text-gray-200 font-sans">
            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex w-64 flex-col p-4 bg-[#111111] border-r border-zinc-800">
                <div className="flex items-center mb-6 h-10 px-2 space-x-2">
                    <Zap className="h-6 w-6 text-white" />
                    <ShinyText
                        text="BROCODE"
                        className="font-bold text-xl"
                        style={{ fontFamily: "'Zen Dots', cursive" }}
                        speed={3}
                        color="#ffffff"
                        shineColor="#6366f1"
                    />
                </div>

                <div className="px-2 mb-6">
                    <button className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                                {profile?.profile_pic_url ? <img src={profile.profile_pic_url} alt={profile.name} className="w-full h-full object-cover" /> : profile?.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-white text-sm">{profile?.name}</span>
                        </div>
                        <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <nav className="flex-1 flex flex-col space-y-1 px-2">
                    <div className="flex-grow space-y-1">
                        {navItems.map(item => <NavItem key={item.path} item={item} isMobile={false} />)}
                    </div>
                    <div>
                        {bottomNavItems.map(item => <NavItem key={item.path} item={item} isMobile={false} />)}
                        <button
                            onClick={logout}
                            className="w-full flex items-center px-3 py-2.5 rounded-md transition-colors duration-200 text-sm font-medium text-gray-400 hover:text-white hover:bg-zinc-800/50"
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="md:hidden flex justify-between items-center p-4 bg-[#111111] border-b border-zinc-800">
                    <ShinyText
                        text="BROCODE"
                        className="font-bold text-xl"
                        style={{ fontFamily: "'Zen Dots', cursive" }}
                        speed={3}
                        color="#ffffff"
                        shineColor="#6366f1"
                    />
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                            aria-label="Logout"
                        >
                            <LogOut className="h-5 w-5 text-gray-400 hover:text-white" />
                        </button>
                        <span className="text-sm">{profile?.name}</span>
                        <img src={profile?.profile_pic_url} alt="profile" className="w-8 h-8 rounded-full" />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0a0a0a] pb-28 md:pb-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ReactRouterDOM.Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Bottom Nav for Mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 z-50">
                <nav className="flex justify-around items-center bg-[#1C1C1C] rounded-full h-16 shadow-lg">
                    {allNavItemsForMobile.map(item => <NavItem key={item.path} item={item} isMobile={true} />)}
                </nav>
            </div>

            {/* Download App Banner for Mobile */}
            {showDownloadBanner && (
                <div className="md:hidden fixed top-14 left-2 right-2 z-50">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-3 shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Download size={24} className="text-white" />
                            <div>
                                <p className="text-white text-sm font-semibold">Get the BroCode App!</p>
                                <p className="text-white/70 text-xs">Better experience on mobile</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href="#"
                                className="bg-white text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                                    const isAndroid = /Android/.test(navigator.userAgent);

                                    if (isIOS) {
                                        alert('To install BroCode:\n\n1. Tap the Share button (box with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm');
                                    } else if (isAndroid) {
                                        alert('To install BroCode:\n\n1. Tap the menu (⋮) in your browser\n2. Tap "Add to Home screen" or "Install app"\n3. Tap "Add" to confirm');
                                    } else {
                                        alert('To install BroCode:\n\n1. Click the install icon in your browser address bar\n2. Or use your browser menu to "Install app"');
                                    }
                                }}
                            >
                                Install
                            </a>
                            <button
                                onClick={() => {
                                    setShowDownloadBanner(false);
                                    localStorage.setItem('downloadBannerDismissed', 'true');
                                }}
                                className="p-1 hover:bg-white/20 rounded-full"
                            >
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
