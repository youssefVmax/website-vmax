/**
 * Comprehensive timestamp sanitization utility
 * Converts all possible Firestore timestamp formats to serializable values
 */

export function sanitizeTimestamp(timestamp: any): string | null {
  if (!timestamp) return null;
  
  try {
    // If it's already a string, return it
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    // If it's a Date object, convert to ISO string
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // If it's a Firestore timestamp with seconds property
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toISOString();
    }
    
    // If it's a Firestore timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // If it's a number (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }
    
    return null;
  } catch (error) {
    console.error('Error sanitizing timestamp:', error, timestamp);
    return null;
  }
}

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if this looks like a timestamp field
    if (key.includes('date') || key.includes('Date') || key.includes('_at') || key === 'timestamp') {
      sanitized[key] = sanitizeTimestamp(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export function formatDisplayDate(timestamp: string | null): string {
  if (!timestamp) return 'N/A';
  
  try {
    return new Date(timestamp).toLocaleDateString();
  } catch (error) {
    console.error('Error formatting display date:', error);
    return 'N/A';
  }
}
