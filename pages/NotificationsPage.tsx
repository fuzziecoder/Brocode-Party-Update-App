import React, { useState } from 'react';
import { Notification } from '../types';
import Card from '../components/common/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff, RefreshCw } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';

const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

const NotificationsPage: React.FC = () => {
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const notificationTypes = [
        { value: 'all', label: 'All Types' },
        { value: 'invitation', label: 'Invitations' },
        { value: 'payment', label: 'Payments' },
        { value: 'update', label: 'Updates' },
        { value: 'suggestion', label: 'Suggestions' },
        { value: 'reminder', label: 'Reminders' },
        { value: 'feedback', label: 'Feedback' },
    ];

    const filteredNotifications = notifications
        .filter(notif => {
            if (statusFilter === 'all') return true;
            return statusFilter === 'read' ? notif.read : !notif.read;
        })
        .filter(notif => {
            if (typeFilter === 'all') return true;
            const title = notif.title.toLowerCase();
            return title.includes(typeFilter);
        });

    return (
        <div className="space-y-8 pb-20 md:pb-0">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Notifications</h1>
                <button 
                    onClick={markAllAsRead}
                    className="text-sm text-zinc-400 hover:underline"
                >
                    Mark all as read
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                    {(['all', 'unread', 'read'] as const).map((status) => (
                        <button 
                            key={status}
                            onClick={() => setStatusFilter(status)} 
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${statusFilter === status ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="w-full md:w-auto">
                    <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full md:w-48 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500 transition"
                        aria-label="Filter notifications by type"
                    >
                        {notificationTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <Card className="p-0">
                <div className="divide-y divide-zinc-800">
                    <AnimatePresence>
                        {filteredNotifications.map((notif) => (
                            <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className={`p-4 cursor-pointer transition-colors duration-200 ${!notif.read ? 'bg-indigo-900/10 hover:bg-indigo-900/20' : 'hover:bg-zinc-800/50'}`}
                                onClick={() => markAsRead(notif.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`font-semibold ${!notif.read ? 'text-white' : 'text-gray-300'}`}>{notif.title}</p>
                                        <p className="text-sm text-gray-400 mt-1">{notif.message}</p>
                                    </div>
                                    {!notif.read && <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full flex-shrink-0 ml-4 mt-1.5" aria-label="Unread"></div>}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{timeAgo(notif.timestamp)}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                     {filteredNotifications.length === 0 && (
                         <div className="px-6 py-12 text-center">
                            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                <BellOff className="w-7 h-7 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-200">
                                {notifications.length === 0 ? "You're all caught up" : "No notifications found"}
                            </h3>
                            <p className="text-sm text-zinc-400 mt-2">
                                {notifications.length === 0
                                    ? "We'll let you know when there is a new update for your party crew."
                                    : "Try changing the status or type filters to see more results."}
                            </p>
                            <button
                                onClick={() => {
                                    setStatusFilter('all');
                                    setTypeFilter('all');
                                }}
                                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reset Filters
                            </button>
                         </div>
                     )}
                </div>
            </Card>
        </div>
    );
};

export default NotificationsPage;