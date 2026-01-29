import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, FileText, DollarSign, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

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

        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Handle outside click to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, isRead: true } : n
            ));
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

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            await handleMarkAsRead(notification._id, { stopPropagation: () => { } });
        }

        setIsOpen(false);

        // Navigate based on type
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
            // Support specific tab navigation
            const state = notification.targetTab ? { activeTab: notification.targetTab } : {};
            navigate(`/opportunities/${notification.opportunityId}`, { state });
        } else {
            navigate('/dashboard');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'expense_edit':
                return <DollarSign size={16} className="text-yellow-600" />;
            case 'opportunity_created':
                return <Briefcase size={16} className="text-blue-600" />;
            case 'document_upload':
                return <FileText size={16} className="text-green-600" />;
            default:
                return <Bell size={16} className="text-gray-600" />;
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-primary-blue hover:bg-gray-100 rounded-full transition-colors"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-brand-blue hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">
                                No notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
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
                </div>
            )}
        </div>
    );
};

// Sub-component for individual notification item to manage expand state
const NotificationItem = ({ notification, onRead, onNavigate }) => {
    const [expanded, setExpanded] = useState(false);
    const hasChanges = notification.changes && Object.keys(notification.changes).length > 0;

    const handleExpand = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };



    const formatFieldName = (field) => {
        return field
            .replace(/([A-Z])/g, ' $1') // Space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .replace('Common Details.', '')
            .replace('Type Specific Details.', '');
    };

    const getIcon = (type) => {
        switch (type) {
            case 'expense_edit':
                return <DollarSign size={16} className="text-yellow-600" />;
            case 'opportunity_created':
                return <Briefcase size={16} className="text-blue-600" />;
            case 'document_upload':
                return <FileText size={16} className="text-green-600" />;
            default:
                return <Bell size={16} className="text-gray-600" />;
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

    return (
        <div
            onClick={() => onNavigate(notification)}
            className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 ${!notification.isRead ? 'bg-blue-50' : ''}`}
        >
            <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-white' : 'bg-gray-100'}`}>
                    {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                        {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 mb-2">
                        {formatTime(notification.createdAt)}
                    </p>

                    {/* Actions Row */}
                    {hasChanges && (
                        <div className="flex items-center gap-3 mt-1">
                            {/* Preview Toggle (if changes exist) */}
                            <button
                                onClick={handleExpand}
                                className="text-xs font-medium text-gray-500 hover:text-gray-800 underline decoration-dotted"
                            >
                                {expanded ? 'Hide Changes' : 'Preview Changes'}
                            </button>
                        </div>
                    )}

                    {/* Changes Preview Panel */}
                    {expanded && hasChanges && (
                        <div className="mt-2 text-xs bg-gray-100 p-2 rounded border border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <p className="font-semibold text-gray-500 mb-1">Updated Fields:</p>
                            <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                                {Object.entries(notification.changes).map(([key, value]) => (
                                    <li key={key} className="truncate">
                                        <span className="font-medium">{formatFieldName(key)}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                {!notification.isRead && (
                    <button
                        onClick={(e) => onRead(notification._id, e)}
                        className="text-gray-400 hover:text-brand-blue"
                        title="Mark as read"
                    >
                        <div className="h-2 w-2 rounded-full bg-brand-blue"></div>
                    </button>
                )}
            </div>
        </div>
    );
};


export default NotificationDropdown;
