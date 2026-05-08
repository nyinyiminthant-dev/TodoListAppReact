import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ColorTheme = 'default' | 'study' | 'work' | 'health' | 'ocean' | 'sunset';
export type ThemeMode = 'dark' | 'light';

interface ThemeCtx {
    mode: ThemeMode;
    colorTheme: ColorTheme;
    setMode: (m: ThemeMode) => void;
    setColorTheme: (t: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeCtx>({} as ThemeCtx);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeRaw] = useState<ThemeMode>(() => {
        const saved = (localStorage.getItem('theme-mode') as ThemeMode) ?? 'dark';
        document.documentElement.setAttribute('data-mode', saved);
        return saved;
    });

    const [colorTheme, setColorThemeRaw] = useState<ColorTheme>(() => {
        const saved = (localStorage.getItem('theme-color') as ColorTheme) ?? 'default';
        document.documentElement.setAttribute('data-theme', saved);
        return saved;
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-mode', mode);
    }, [mode]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', colorTheme);
    }, [colorTheme]);

    const setMode = (m: ThemeMode) => {
        setModeRaw(m);
        localStorage.setItem('theme-mode', m);
    };

    const setColorTheme = (t: ColorTheme) => {
        setColorThemeRaw(t);
        localStorage.setItem('theme-color', t);
    };

    return (
        <ThemeContext.Provider value={{ mode, colorTheme, setMode, setColorTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
