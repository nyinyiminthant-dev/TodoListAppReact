import { useState } from 'react';
import { Sparkles, Zap, Target, BarChart3, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const features = [
    { icon: Zap, title: 'Smart priorities', desc: 'High, medium & low priority to focus on what matters most.' },
    { icon: Target, title: 'Goal tracking', desc: 'Create plans and link tasks to hit your goals on time.' },
    { icon: BarChart3, title: 'Analytics', desc: 'Visual charts showing your productivity trends over time.' },
    { icon: Shield, title: 'Secure sync', desc: 'Your tasks sync safely with Firebase across all your devices.' },
];

export default function Login() {
    const { signIn } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            await signIn();
        } catch {
            setError('Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
            {/* Animated background orbs */}
            <div className="absolute top-1/4 -left-40 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none animate-float" />
            <div className="absolute bottom-1/4 -right-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none animate-float" style={{ animationDelay: '1.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Card */}
                <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-2xl animate-scale-in">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/40 mb-4 animate-glow">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold gradient-text mb-1">TodoList Pro</h1>
                        <p className="text-slate-400 text-sm">Your productivity companion</p>
                    </div>

                    {/* Feature cards */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {features.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center mb-2">
                                    <Icon className="w-4 h-4 text-violet-400" />
                                </div>
                                <p className="text-white text-xs font-medium mb-0.5">{title}</p>
                                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Google Sign-In */}
                    <button
                        onClick={handleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {loading ? 'Signing in…' : 'Continue with Google'}
                    </button>

                    <p className="text-center text-slate-500 text-xs mt-5">
                        By signing in you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
