import { format, parseISO } from 'date-fns';

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currencyCode The ISO currency code (e.g., USD, EUR)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
};

/**
 * Format a date string to a readable format
 * @param dateString ISO date string
 * @param formatStr Format string for date-fns
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, formatStr = 'MMM d, yyyy'): string => {
  try {
    return format(parseISO(dateString), formatStr);
  } catch (error) {
    return dateString;
  }
};

/**
 * Format a date to a relative time (e.g., "2 days ago")
 * @param dateString ISO date string
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  } catch (error) {
    return dateString;
  }
};
