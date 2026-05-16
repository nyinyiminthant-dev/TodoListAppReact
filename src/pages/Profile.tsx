import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Sun, Moon, Sparkles, BookOpen, Briefcase, HeartPulse, Waves, Sunset } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Profile() {
    const { user, signOut } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const { mode, colorTheme, setMode, setColorTheme } = useTheme();
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

    const colorThemes: { id: 'default' | 'study' | 'work' | 'health' | 'ocean' | 'sunset'; label: string; color: string; Icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'default', label: 'Default', color: '#6366f1', Icon: Sparkles },
        { id: 'study', label: 'Study', color: '#06b6d4', Icon: BookOpen },
        { id: 'work', label: 'Work', color: '#4f46e5', Icon: Briefcase },
        { id: 'health', label: 'Health', color: '#10b981', Icon: HeartPulse },
        { id: 'ocean', label: 'Ocean', color: '#0ea5e9', Icon: Waves },
        { id: 'sunset', label: 'Sunset', color: '#f97316', Icon: Sunset },
    ];

    return (
        <div className="lg:hidden">
            {/* Profile Header */}
            <div className="text-center py-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}>
                <div className="inline-flex">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="avatar" className="w-20 h-20 rounded-full border-4" style={{ borderColor: 'rgba(255,255,255,0.3)' }} referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4" style={{ borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.2)' }}>
                            {user?.displayName?.[0] ?? 'U'}
                        </div>
                    )}
                </div>
                <h1 className="mt-4 text-xl font-bold text-white">{user?.displayName ?? t('user')}</h1>
                <p className="mt-1 text-sm text-white/70">{user?.email ?? ''}</p>
            </div>

            {/* Settings Section */}
            <div className="px-4 py-4 space-y-3">
                        {/* Appearance - Mode */}
                        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-1)' }}>{t('appearance')}</p>
                            
                            {/* Light/Dark Mode */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setMode('light')}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border"
                                    style={mode === 'light'
                                        ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                                        : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                                    }
                                >
                                    <Sun className="w-4 h-4" /> {t('light')}
                                </button>
                                <button
                                    onClick={() => setMode('dark')}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border"
                                    style={mode === 'dark'
                                        ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                                        : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                                    }
                                >
                                    <Moon className="w-4 h-4" /> {t('dark')}
                                </button>
                            </div>

                            {/* Color Theme */}
                            <div>
                                <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>{t('colorTheme')}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {colorThemes.map(ct => (
                                        <button
                                            key={ct.id}
                                            onClick={() => setColorTheme(ct.id)}
                                            className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium transition-all border"
                                            style={colorTheme === ct.id
                                                ? { background: `${ct.color}22`, borderColor: `${ct.color}80`, color: ct.color }
                                                : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                                            }
                                        >
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center">
                                                <ct.Icon className="w-4 h-4" style={{ color: ct.color }} />
                                            </span>
                                            {ct.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-1)' }}>{t('language')}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                        language === 'en'
                                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                            : ''
                                    }`}
                                    style={language === 'en'
                                        ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                                        : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                                    }
                                >
                                    🇬🇧 English
                                </button>
                                <button
                                    onClick={() => setLanguage('my')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                        language === 'my'
                                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                            : ''
                                    }`}
                                    style={language === 'my'
                                        ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                                        : { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                                    }
                                >
                                    🇲🇲 မြန်မာ
                                </button>
                            </div>
                        </div>

                        {/* Sign Out */}
                        <button
                            onClick={() => setShowSignOutConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl transition-all"
                            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e' }}
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">{t('signOut')}</span>
                        </button>
            </div>

            {showSignOutConfirm && (
                <ConfirmDialog
                    title={t('signOut')}
                    message="Are you sure you want to sign out?"
                    confirmLabel={t('signOut')}
                    icon={LogOut}
                    onConfirm={signOut}
                    onCancel={() => setShowSignOutConfirm(false)}
                />
            )}
        </div>
    );
}