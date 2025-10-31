import ja from '@/../public/locales/ja/common.json';

type Locale = 'ja';

const resources: Record<Locale, Record<string, string>> = {
  ja
};

let currentLocale: Locale = 'ja';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(key: string): string {
  return resources[currentLocale][key] ?? key;
}
