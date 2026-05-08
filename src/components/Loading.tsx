import { Sparkles } from 'lucide-react';

export default function Loading() {
    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center z-50"
            style={{ backgroundColor: 'var(--background)' }}
        >
            <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/50 animate-glow">
                    <Sparkles className="w-10 h-10 text-white" />
                </div>

                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full bg-violet-400"
                            style={{
                                animation: 'pulse-dot 1.2s ease-in-out infinite',
                                animationDelay: `${i * 0.2}s`,
                            }}
                        />
                    ))}
                </div>

                <p className="text-slate-400 text-sm">Loading your tasks…</p>
            </div>
        </div>
    );
}
