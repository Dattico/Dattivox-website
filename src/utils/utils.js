import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';
import nlTranslations from '../locales/nl.json';

const translations = {
  en: enTranslations,
  fr: frTranslations,
  nl: nlTranslations
};

export const getTranslation = (language) => {
  return translations[language] || translations.en;
};