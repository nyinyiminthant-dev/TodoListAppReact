import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, TranslationKey } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'todolist_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'en' || saved === 'my') {
                return saved;
            }
        }
        return 'en';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations.en[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export type { Language, TranslationKey };
