import { useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';
import nlTranslations from '../locales/nl.json';

const translations = {
  en: enTranslations,
  fr: frTranslations,
  nl: nlTranslations
};

const detectBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.languages[0];
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('nl')) return 'nl';
  return 'en';
};

export const useTranslation = () => {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('dattivox-language');
    return saved || detectBrowserLanguage();
  });

  // Only remember an explicit choice, so visitors who never pick a language
  // keep following their browser language.
  const setLanguage = (lang) => {
    localStorage.setItem('dattivox-language', lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, language, setLanguage };
};