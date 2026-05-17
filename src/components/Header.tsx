import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDown, LogOut, Sparkles, Sun, Moon } from 'lucide-react';

export default function Header() {
    const { user, signOut } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const { mode, colorTheme, setMode, setColorTheme } = useTheme();
    const [profileOpen, setProfileOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setProfileOpen(false);
            }
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    return (
        <header className="hidden lg:flex items-center justify-end gap-4 px-4 py-3 rounded-xl mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {/* Language Toggle */}
            <div className="relative" ref={langRef}>
                <button
                    onClick={() => setLangOpen(!langOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--primary)', color: '#fff' }}
                >
                    <span>{language === 'en' ? 'EN' : 'MY'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>

                {langOpen && (
                    <div className="absolute right-0 top-full mt-2 py-2 rounded-xl shadow-lg border z-50"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', minWidth: '200px' }}>
                        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{t('language')}</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => { setLanguage('en'); setLangOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                                style={language === 'en' ? { background: 'var(--primary)', color: '#fff' } : { color: 'var(--text-1)' }}
                            >
                                🇬🇧 English
                            </button>
                            <button
                                onClick={() => { setLanguage('my'); setLangOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
                                style={language === 'my' ? { background: 'var(--primary)', color: '#fff' } : { color: 'var(--text-1)' }}
                            >
                                🇲🇲 မြန်မာ
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
                <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all"
                >
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>
                            {user?.displayName?.[0] ?? 'U'}
                        </div>
                    )}
                    <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {user?.displayName ?? 'User'}
                    </span>
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
        </header>
    );
}