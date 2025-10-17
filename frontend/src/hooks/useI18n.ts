import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../i18n';

export interface I18nFeatures {
  t: (key: string, options?: any) => string;
  currentLanguage: {
    code: string;
    name: string;
    nativeName: string;
    rtl: boolean;
  };
  changeLanguage: (languageCode: string) => Promise<void>;
  isRTL: boolean;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;
  getLanguageDirection: () => 'ltr' | 'rtl';
  getSupportedLanguages: () => typeof supportedLanguages;
}

export const useI18n = (): I18nFeatures => {
  const { t, i18n } = useTranslation();

  const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];
  const isRTL = currentLanguage.rtl;

  const changeLanguage = async (languageCode: string): Promise<void> => {
    await i18n.changeLanguage(languageCode);
    
    // Update document direction and language
    const selectedLang = supportedLanguages.find(lang => lang.code === languageCode);
    if (selectedLang) {
      document.documentElement.dir = selectedLang.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = languageCode;
      
      // Store preference
      localStorage.setItem('preferred-language', languageCode);
    }
  };

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options,
    };

    return new Intl.DateTimeFormat(currentLanguage.code, defaultOptions).format(date);
  };

  const formatNumber = (number: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(currentLanguage.code, options).format(number);
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat(currentLanguage.code, {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Use Intl.RelativeTimeFormat if available
    if ('RelativeTimeFormat' in Intl) {
      const rtf = new Intl.RelativeTimeFormat(currentLanguage.code, { numeric: 'auto' });
      
      if (diffInSeconds < 60) {
        return rtf.format(-diffInSeconds, 'second');
      } else if (diffInSeconds < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
      } else if (diffInSeconds < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
      } else if (diffInSeconds < 2592000) {
        return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
      } else if (diffInSeconds < 31536000) {
        return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
      } else {
        return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
      }
    }
    
    // Fallback for browsers without RelativeTimeFormat
    if (diffInSeconds < 60) {
      return t('common.justNow', 'just now');
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('common.minutesAgo', `${minutes} minutes ago`, { count: minutes });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('common.hoursAgo', `${hours} hours ago`, { count: hours });
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return t('common.daysAgo', `${days} days ago`, { count: days });
    }
  };

  const getLanguageDirection = (): 'ltr' | 'rtl' => {
    return isRTL ? 'rtl' : 'ltr';
  };

  const getSupportedLanguages = () => {
    return supportedLanguages;
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    isRTL,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    getLanguageDirection,
    getSupportedLanguages,
  };
};