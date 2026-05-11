import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, CheckSquare, BarChart3, Target, Sparkles,
    Settings, LogOut, ChevronDown, Download, Upload, Trash2, Menu, X,
    Sun, Moon, Palette, BookOpen, Briefcase, HeartPulse, DownloadCloud, Waves, Sunset,
    Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../contexts/FirestoreContext';
import { useTheme, ColorTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../contexts/LanguageContext';
import ConfirmDialog from './ConfirmDialog';

const navItems = [
    { path: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const, end: true },
    { path: '/tasks', icon: CheckSquare, labelKey: 'tasks' as const, end: false },
    { path: '/plans', icon: Target, labelKey: 'plans' as const, end: false },
    { path: '/analytics', icon: BarChart3, labelKey: 'analytics' as const, end: false },
];

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const { user, signOut } = useAuth();
    const { exportData, importData, clearAllData } = useFirestore();
    const { mode, colorTheme, setMode, setColorTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const { isInstallable, install /*, isInstalled */ } = usePWAInstall();
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const colorThemes: { id: ColorTheme; label: string; color: string; Icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'default', label: 'Default', color: '#6366f1', Icon: Sparkles },
        { id: 'study', label: 'Study', color: '#06b6d4', Icon: BookOpen },
        { id: 'work', label: 'Work', color: '#4f46e5', Icon: Briefcase },
        { id: 'health', label: 'Health', color: '#10b981', Icon: HeartPulse },
        { id: 'ocean', label: 'Ocean', color: '#0ea5e9', Icon: Waves },
        { id: 'sunset', label: 'Sunset', color: '#f97316', Icon: Sunset },
    ];

    // Close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [setIsOpen]);

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
        reader.onload = async (ev) => {
            try {
                await importData(ev.target?.result as string);
                alert('Data imported successfully!');
            } catch {
                alert('Failed to import data. Check file format.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleClear = async () => {
        setShowClearConfirm(true);
    };

    const handleClearConfirm = async () => {
        setShowClearConfirm(false);
        await clearAllData();
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <>
            {/* Mobile hamburger button — only visible when sidebar is closed */}
            <button
                className={`lg:hidden fixed top-3 left-3 z-30 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white transition-opacity duration-200 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                onClick={() => setIsOpen(true)}
                aria-label="Open sidebar"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop (mobile) */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-[45] backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={`
          fixed top-0 left-0 h-[100dvh] w-72 z-[50]
          backdrop-blur-xl border-r border-white/10
          flex flex-col
          transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
                style={{ backgroundColor: 'var(--surface)' }}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-white flex-1">TodoList Pro</span>
                    {/* Close button — mobile only */}
                    <button
                        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive
                                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute left-0 inset-y-0 w-1 rounded-r-full bg-gradient-to-b from-violet-400 to-purple-500" />
                                    )}
                                    <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    <span className="font-medium text-sm">{t(item.labelKey)}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Appearance */}
                <div className="px-3 py-2 border-t border-white/10">
                    <button
                        onClick={() => setAppearanceOpen(!appearanceOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <Palette className="w-5 h-5 shrink-0" />
                        <span className="font-medium text-sm flex-1 text-left">{t('appearance')}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${appearanceOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: appearanceOpen ? '1fr' : '0fr',
                            transition: 'grid-template-rows 0.3s ease',
                        }}
                    >
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                className="mt-2 px-1 space-y-4 pb-1"
                                style={{
                                    opacity: appearanceOpen ? 1 : 0,
                                    transition: 'opacity 0.25s ease',
                                }}
                            >
                                {/* Mode */}
                                <div>
                                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 px-1">{t('mode')}</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setMode('dark')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border ${mode === 'dark'
                                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            <Moon className="w-3.5 h-3.5" /> {t('dark')}
                                        </button>
                                        <button
                                            onClick={() => setMode('light')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border ${mode === 'light'
                                                ? 'bg-amber-400/20 border-amber-400/40 text-amber-600'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            <Sun className="w-3.5 h-3.5" /> {t('light')}
                                        </button>
                                    </div>
                                </div>

                                {/* Color theme */}
                                <div>
                                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-2 px-1">{t('colorTheme')}</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {colorThemes.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setColorTheme(t.id)}
                                                className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl text-[11px] font-medium transition-all border"
                                                style={colorTheme === t.id
                                                    ? { background: `${t.color}22`, borderColor: `${t.color}80`, color: t.color }
                                                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }
                                                }
                                            >
                                                <span
                                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1"
                                                    style={{ background: t.color }}
                                                >
                                                    <t.Icon className="w-4 h-4 text-white" />
                                                </span>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Language */}
                <div className="px-3 py-2 border-t border-white/10">
                    <button
                        onClick={() => setLanguageOpen(!languageOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <Globe className="w-5 h-5 shrink-0" />
                        <span className="font-medium text-sm flex-1 text-left">{t('language')}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${languageOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: languageOpen ? '1fr' : '0fr',
                            transition: 'grid-template-rows 0.3s ease',
                        }}
                    >
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                className="mt-2 px-1"
                                style={{
                                    opacity: languageOpen ? 1 : 0,
                                    transition: 'opacity 0.25s ease',
                                }}
                            >
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                                            language === 'en'
                                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        🇬🇧 English
                                    </button>
                                    <button
                                        onClick={() => setLanguage('my')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                                            language === 'my'
                                                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        🇲🇲 မြန်မာ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="px-3 py-2 border-t border-white/10">
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <Settings className="w-5 h-5 shrink-0" />
                        <span className="font-medium text-sm flex-1 text-left">{t('settings')}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${settingsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: settingsOpen ? '1fr' : '0fr',
                            transition: 'grid-template-rows 0.3s ease',
                        }}
                    >
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                className="mt-1 ml-2 space-y-1"
                                style={{
                                    opacity: settingsOpen ? 1 : 0,
                                    transition: 'opacity 0.25s ease',
                                }}
                            >
                                <button
                                    onClick={handleExport}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                                >
                                    <Download className="w-4 h-4" /> {t('exportData')}
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                                >
                                    <Upload className="w-4 h-4" /> {t('importData')}
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-sm"
                                >
                                    <Trash2 className="w-4 h-4" /> {t('clearAllData')}
                                </button>
                                {/*isInstallable && (
                                    <button
                                        onClick={install}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all text-sm"
                                    >
                                        <DownloadCloud className="w-4 h-4" /> Install App
                                    </button>
                                )*/}
                                <button
                                    onClick={() => {
                                        if (deferredPrompt) {
                                            install();
                                        } else {
                                            // Fallback - show instructions
                                            alert('To install: Open browser menu → Add to Home Screen');
                                        }
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all text-sm"
                                >
                                    <DownloadCloud className="w-4 h-4" /> Install App
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImport}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* User card + Sign out */}
                <div className="px-3 py-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10 mb-2">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" className="w-9 h-9 rounded-full shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {user?.displayName?.[0] ?? 'U'}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{user?.displayName ?? t('user')}</p>
                            <p className="text-slate-400 text-xs truncate">{user?.email ?? ''}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span className="font-medium text-sm">{t('signOut')}</span>
                    </button>
                </div>
            </aside>
        <AnimatePresence>
                {showClearConfirm && (
                    <ConfirmDialog
                        title={t('clearAllData')}
                        message="Are you sure you want to delete ALL tasks and plans? This cannot be undone."
                        confirmLabel={t('delete')}
                        onConfirm={handleClearConfirm}
                        onCancel={() => setShowClearConfirm(false)}
                    />
                )}
            </AnimatePresence>
            </>
    );
}
