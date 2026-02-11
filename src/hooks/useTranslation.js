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
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('dattivox-language');
    return saved || detectBrowserLanguage();
  });

  useEffect(() => {
    localStorage.setItem('dattivox-language', language);
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