export const validationUtils = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidPhoneNumber: (phone: string): boolean => {
    // Japanese phone number validation
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
  },
  
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidLineUserId: (userId: string): boolean => {
    // LINE user IDs are 33 characters long and start with 'U'
    return userId.length === 33 && userId.startsWith('U');
  },
  
  isValidAmount: (amount: number): boolean => {
    return amount > 0 && amount <= 10000000; // Max 10 million
  },
  
  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  },
};