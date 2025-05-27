import { atom } from 'nanostores';

export type Language = 'en' | 'ar';

export const languageAtom = atom<Language>('en');
export const languageStore = languageAtom; // Alias for consistency if preferred

export function setLanguage(newLang: Language) {
  languageAtom.set(newLang);
}
