import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import he from "./locales/he.json";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import ru from "./locales/ru.json";
import fa from "./locales/fa.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import uk from "./locales/uk.json";

const RTL_LANGUAGES = ["he", "ar", "fa"];

function applyDirection(lng) {
  const dir = RTL_LANGUAGES.includes(lng) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lng);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
      ar: { translation: ar },
      fr: { translation: fr },
      es: { translation: es },
      ru: { translation: ru },
      fa: { translation: fa },
      zh: { translation: zh },
      ja: { translation: ja },
      uk: { translation: uk },
    },
    fallbackLng: "he",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

i18n.on("languageChanged", (lng) => {
  applyDirection(lng);
});

// Apply initial direction
applyDirection(i18n.language || "he");

export { RTL_LANGUAGES };
export default i18n;
