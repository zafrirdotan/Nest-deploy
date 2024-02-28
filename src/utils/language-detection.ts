// language detection
export function containsHebrew(text) {
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
}

export function getLanguage(text) {
  return containsHebrew(text) ? 'he' : 'en';
}
