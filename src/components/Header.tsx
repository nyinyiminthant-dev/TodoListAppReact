import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Sparkles, Sun, Moon, Bell, Download, Upload } from 'lucide-react';
import { useFirestore } from '../contexts/FirestoreContext';

export default function Header() {
    const { user, signOut } = useAuth();
    const { t } = useLanguage();
    const { mode, colorTheme, setMode, setColorTheme } = useTheme();
    const { exportData, importData } = useFirestore();
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const checkNotificationPermission = async () => {
            if ('Notification' in window) {
                setNotificationsEnabled(Notification.permission === 'granted');
            }
        };
        checkNotificationPermission();
    }, []);

    const handleEnableNotifications = async () => {
        try {
            if (!('Notification' in window)) {
                alert('Notifications not supported in this browser');
                return;
            }
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
            } else {
                alert('Notification permission denied');
            }
        } catch (error) {
            console.error('Failed:', error);
        }
    };

    const handleExport = () => {
        const json = exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todolist-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                importData(data);
            } catch {
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleSignOut = () => {
        signOut();
    };

    const colorThemes = [
        { id: 'default' as const, label: 'Default', color: '#6366f1' },
        { id: 'study' as const, label: 'Study', color: '#06b6d4' },
        { id: 'work' as const, label: 'Work', color: '#4f46e5' },
        { id: 'health' as const, label: 'Health', color: '#10b981' },
        { id: 'ocean' as const, label: 'Ocean', color: '#0ea5e9' },
        { id: 'sunset' as const, label: 'Sunset', color: '#f97316' },
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning');
        if (hour < 18) return t('goodAfternoon');
        return t('goodEvening');
    };

    return (
        <header className="hidden lg:flex items-center justify-between gap-4 px-4 py-3 rounded-xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {/* Left Side - Greeting */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">
                        {getGreeting()}, <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user?.displayName?.split(' ')[0] || t('user')}</span>
                    </h1>
                    <p className="text-xs text-slate-400">{t('todayOverview')}</p>
                </div>
            </div>

            {/* Right Side - Profile + Icons */}
            <div className="flex items-center gap-3">
                {/* Profile Avatar First */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center p-1 rounded-lg hover:bg-white/5 transition-all"
                    >
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                                {user?.displayName?.[0] ?? 'U'}
                            </div>
                        )}
                    </button>

                    {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 py-3 rounded-xl shadow-lg border z-50"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', minWidth: '280px' }}>
                        {/* Profile Info */}
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center gap-3">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="avatar" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                                        {user?.displayName?.[0] ?? 'U'}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{user?.displayName ?? 'User'}</p>
                                    <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{user?.email ?? ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* Settings Section */}
                        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-[11px] uppercase tracking-wider px-2 mb-2" style={{ color: 'var(--text-3)' }}>{t('settings')}</p>
                            
                            {/* Mode Toggle */}
                            <button
                                onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
                                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all"
                                style={{ color: 'var(--text-1)' }}
                            >
                                {mode === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                <span>{mode === 'light' ? t('darkMode') : t('lightMode')}</span>
                            </button>

                            {/* Color Theme */}
                            <div className="mt-2">
                                <p className="text-xs text-slate-500 px-2 mb-2">{t('colorTheme')}</p>
                                <div className="grid grid-cols-3 gap-1">
                                    {colorThemes.map(ct => (
                                        <button
                                            key={ct.id}
                                            onClick={() => setColorTheme(ct.id)}
                                            className="flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all border"
                                            style={colorTheme === ct.id
                                                ? { background: `${ct.color}22`, borderColor: `${ct.color}80`, color: ct.color }
                                                : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                                            }
                                        >
                                            <span className="w-4 h-4 rounded-full" style={{ background: ct.color }} />
                                            {ct.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sign Out */}
                        <div className="px-3 py-2">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all"
                                style={{ color: '#f43f5e' }}
                            >
                                <LogOut className="w-4 h-4" />
                                <span>{t('signOut')}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

                {/* Install App Button */}
                <button
                    onClick={handleEnableNotifications}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                    style={{ background: 'transparent', border: '1px solid var(--border)' }}
                    title="Install App"
                >
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--text-2)' }} />
                </button>

                {/* Notifications Button */}
                <button
                    onClick={handleEnableNotifications}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                    style={{ 
                        background: notificationsEnabled ? 'rgba(16,185,129,0.1)' : 'transparent',
                        border: `1px solid ${notificationsEnabled ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`
                    }}
                    title={notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
                >
                    <Bell className="w-4 h-4" style={{ color: notificationsEnabled ? '#10b981' : 'var(--text-2)' }} />
                </button>
            </div>

            {/* Hidden file input for import */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
            />
        </header>
    );
}