import { CURRENCIES } from '../constants';

export const formatUtils = {
  currency: (amount: number, currency: keyof typeof CURRENCIES = 'JPY'): string => {
    const { symbol, decimals } = CURRENCIES[currency];
    const formatted = amount.toFixed(decimals);
    return `${symbol}${Number(formatted).toLocaleString()}`;
  },
  
  phoneNumber: (phone: string): string => {
    // Format Japanese phone numbers
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  },
  
  userName: (name: string, maxLength = 10): string => {
    if (name.length <= maxLength) return name;
    return `${name.slice(0, maxLength - 1)}…`;
  },
  
  percentage: (value: number, total: number): string => {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(1)}%`;
  },
  
  fileSize: (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },
};