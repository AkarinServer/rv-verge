import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Minimal i18n setup for testing
i18n.use(initReactI18next).init({
  resources: {
    zh: {
      translation: {
        // Placeholder translations
        "app.title": "RV Verge",
        "app.description": "Clash Verge Rev - Lightweight version for RISC-V devices",
      },
    },
    en: {
      translation: {
        "app.title": "RV Verge",
        "app.description": "Clash Verge Rev - Lightweight version for RISC-V devices",
      },
    },
  },
  lng: "zh",
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

export const initializeLanguage = async (language: string = "zh") => {
  await i18n.changeLanguage(language);
};

export const changeLanguage = async (language: string) => {
  await i18n.changeLanguage(language);
};

