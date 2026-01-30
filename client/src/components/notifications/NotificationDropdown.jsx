import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, FileText, DollarSign, Briefcase, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    // Removed dropdownRef as we use backdrop click for closing
    const navigate = useNavigate();

    // --- Helpers ---
    const formatFieldName = (field) => {
        return field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace('Common Details.', '')
            .replace('Type Specific Details.', '');
    };

    const getStyleConfig = (type) => {
        switch (type) {
            case 'approval_granted':
            case 'document_upload':
                return { bg: 'bg-emerald-50/50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', icon: Check };
            case 'expense_edit':
            case 'gp_approval_request':
                return { bg: 'bg-amber-50/50', iconBg: 'bg-amber-100', iconColor: 'text-amber-700', icon: DollarSign };
            case 'opportunity_created':
            case 'approval_status_change':
                return { bg: 'bg-blue-50/50', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', icon: Briefcase };
            default:
                return { bg: 'bg-gray-50/50', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', icon: Bell };
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await axios.get('http://localhost:5000/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/notifications/read-all', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    // 1. CLICK ON LIST ITEM -> OPEN PREVIEW
    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification._id);
        }
        setSelectedNotification(notification);
    };

    // 2. CLICK "VIEW PAGE" IN PREVIEW -> NAVIGATE
    const handlePreviewNavigate = (notification) => {
        setIsOpen(false);
        setSelectedNotification(null);

        if (notification.type === 'gp_approval_request' || notification.type === 'approval_status_change') {
            if (notification.opportunityId) {
                navigate(`/opportunities/${notification.opportunityId}`, { state: { activeTab: 'expenses' } });
            } else {
                navigate('/approvals');
            }
        } else if (notification.type === 'approval_granted' || notification.type === 'approval_rejected') {
            if (notification.opportunityId) {
                navigate(`/opportunities/${notification.opportunityId}`, { state: { activeTab: 'expenses' } });
            }
        } else if (notification.opportunityId) {
            const state = notification.targetTab ? { activeTab: notification.targetTab } : {};
            navigate(`/opportunities/${notification.opportunityId}`, { state });
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <>
            {/* Bell Icon Trigger */}
            <button
                onClick={() => setIsOpen(true)}
                className="relative p-2 text-gray-500 hover:text-primary-blue hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notifications"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop with Glassmorphism Blur */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content - Enterprise Grade with Preview Support */}
                    <div className="relative bg-[#f8f9fc] backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/50 transform transition-all scale-100 animate-in fade-in zoom-in duration-200 font-sans">

                        {selectedNotification ? (
                            // PREVIEW MODE
                            <div className="flex flex-col h-[65vh]">
                                {/* Preview Header */}
                                <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shadow-sm relative z-10">
                                    <button
                                        onClick={() => setSelectedNotification(null)}
                                        className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all group"
                                    >
                                        <ArrowLeft size={20} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
                                    </button>
                                    <h3 className="text-lg font-bold text-slate-800">Notification Details</h3>
                                    <div className="ml-auto">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                                        >
                                            <X size={20} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#f8f9fc]">
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={`p-3 rounded-full flex-shrink-0 ${getStyleConfig(selectedNotification.type).iconBg}`}>
                                                {React.createElement(getStyleConfig(selectedNotification.type).icon, {
                                                    size: 24,
                                                    className: getStyleConfig(selectedNotification.type).iconColor,
                                                    strokeWidth: 2
                                                })}
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-slate-900 leading-snug mb-1">
                                                    {selectedNotification.message}
                                                </p>
                                                <p className="text-sm text-slate-500 font-medium">
                                                    {formatTime(selectedNotification.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gray-100 my-4"></div>

                                        {/* Change Log Details */}
                                        {selectedNotification.changes && Object.keys(selectedNotification.changes).length > 0 ? (
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <FileText size={14} /> Full Change Log
                                                </h4>
                                                <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                                                    {Object.entries(selectedNotification.changes).map(([key, value], index) => (
                                                        <div key={key} className={`p-4 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 ${index !== 0 ? 'border-t border-slate-100' : ''}`}>
                                                            <span className="text-sm font-semibold text-slate-600">{formatFieldName(key)}</span>
                                                            <span className="text-sm text-slate-800 font-medium break-words bg-white px-2 py-1 rounded border border-slate-200 inline-block shadow-sm">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-lg">
                                                No specific field changes recorded.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Preview Footer Actions */}
                                <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 z-10">
                                    <button
                                        onClick={() => setSelectedNotification(null)}
                                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => handlePreviewNavigate(selectedNotification)}
                                        className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-blue hover:bg-primary-blue-dark shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                                    >
                                        View in Respective Page
                                        <ArrowLeft size={16} className="rotate-180" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // LIST MODE
                            <>
                                {/* Header - 24px Padding Rhythm */}
                                <div className="flex justify-between items-start px-8 py-6 bg-white border-b border-gray-100 shadow-sm z-20 relative">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    {unreadCount} Unread
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-sm font-medium text-slate-500 hover:text-primary-blue transition-colors mr-2"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                                        >
                                            <X size={20} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>

                                {/* Notification List - 16px Row Spacing, 24px Padding */}
                                <div className="max-h-[65vh] overflow-y-auto custom-scrollbar px-6 py-6 scroll-smooth">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="bg-white p-6 rounded-full shadow-sm mb-4 ring-1 ring-gray-100">
                                                <Bell size={40} className="text-slate-300" strokeWidth={1.5} />
                                            </div>
                                            <h4 className="text-slate-700 font-semibold text-lg">All caught up!</h4>
                                            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">You have no new notifications.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            {notifications.map((notification) => (
                                                <NotificationItem
                                                    key={notification._id}
                                                    notification={notification}
                                                    onRead={handleMarkAsRead}
                                                    onNavigate={handleNotificationClick}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer (Optional, mostly for aesthetic spacer) */}
                                <div className="bg-gray-50/80 p-3 text-center border-t border-gray-200/50">
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                        Global Knowledge Technologies
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// Sub-component for individual notification item
const NotificationItem = ({ notification, onRead, onNavigate }) => {
    // Helper function for field naming
    const formatFieldName = (field) => {
        return field
            .replace(/([A-Z])/g, ' $1') // Space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .replace('Common Details.', '')
            .replace('Type Specific Details.', '');
    };

    // Premium Color Logic based on type
    const getStyleConfig = (type) => {
        switch (type) {
            case 'approval_granted':
            case 'document_upload':
                return {
                    bg: 'bg-emerald-50/50',
                    iconBg: 'bg-emerald-100',
                    iconColor: 'text-emerald-700',
                    icon: Check,
                    hoverBorder: 'border-emerald-200'
                };
            case 'expense_edit':
            case 'gp_approval_request':
                return {
                    bg: 'bg-amber-50/50',
                    iconBg: 'bg-amber-100',
                    iconColor: 'text-amber-700',
                    icon: DollarSign,
                    hoverBorder: 'border-amber-200'
                };
            case 'opportunity_created':
            case 'approval_status_change':
                return {
                    bg: 'bg-blue-50/50',
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-700',
                    icon: Briefcase,
                    hoverBorder: 'border-blue-200'
                };
            default:
                return {
                    bg: 'bg-gray-50/50',
                    iconBg: 'bg-gray-100',
                    iconColor: 'text-gray-600',
                    icon: Bell,
                    hoverBorder: 'border-gray-200'
                };
        }
    };

    const style = getStyleConfig(notification.type);
    const Icon = style.icon;

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    return (
        <div
            onClick={() => onNavigate(notification)}
            className={`
                group relative mx-0 p-4 rounded-xl cursor-pointer transition-all duration-200 ease-in-out
                bg-white border border-transparent hover:border-gray-200 hover:shadow-md hover:z-10
                flex items-center gap-4 mb-3 last:mb-0
            `}
            style={{ borderRadius: '12px' }}
        >
            {/* Unread Indicator Dot - Perfectly Centered Vertically relative to Icon */}
            {!notification.isRead && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div>
            )}

            {/* Icon Container - Fixed 40px Circle, Perfectly Centered */}
            <div className={`
                flex-shrink-0 w-10 h-10 rounded-full ${style.iconBg} 
                flex items-center justify-center shadow-sm relative z-10
            `}>
                <Icon size={18} className={style.iconColor} strokeWidth={2.5} />
            </div>

            {/* Main Content Grid - Vertical Center Fix */}
            <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                {/* Header Row: Title & Time - Forced Vertical Center */}
                <div className="flex justify-between items-center gap-4">
                    <p className={`text-sm leading-[1.35] m-0 p-0 ${!notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notification.message}
                    </p>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap self-center">
                        {formatTime(notification.createdAt)}
                    </span>
                </div>

                {/* Read Action (Hover) */}
                {!notification.isRead && (
                    <div className="h-0 group-hover:h-auto overflow-hidden transition-all">
                        <button
                            onClick={(e) => onRead(notification._id, e)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] font-medium text-slate-400 hover:text-primary-blue transition-all mt-1"
                        >
                            Mark Read
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
