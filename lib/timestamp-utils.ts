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
    
    // If it's a Firestore timestamp with seconds property (handle seconds === 0)
    if (
      timestamp &&
      typeof timestamp === 'object' &&
      typeof (timestamp as any).seconds === 'number'
    ) {
      return new Date((timestamp as any).seconds * 1000).toISOString();
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
  if (obj == null) return obj;

  // If this value itself is a Firestore Timestamp-like object, convert it directly
  // This catches cases where the key name does not hint it's a date (e.g., createdAt)
  if (typeof obj === 'object') {
    const maybeHasToDate = typeof (obj as any)?.toDate === 'function';
    const maybeSeconds = typeof (obj as any)?.seconds === 'number' && typeof (obj as any)?.nanoseconds === 'number';
    if (maybeHasToDate || maybeSeconds) {
      return sanitizeTimestamp(obj);
    }
  }

  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if this looks like a timestamp field
    if (key.includes('date') || key.includes('Date') || key.includes('_at') || key === 'timestamp') {
      sanitized[key] = sanitizeTimestamp(value);
      continue;
    }

    // If the value is a Firestore Timestamp-like object, convert regardless of key
    if (value && typeof value === 'object') {
      const hasToDate = typeof (value as any)?.toDate === 'function';
      const hasSeconds = typeof (value as any)?.seconds === 'number' && typeof (value as any)?.nanoseconds === 'number';
      if (hasToDate || hasSeconds) {
        sanitized[key] = sanitizeTimestamp(value);
        continue;
      }
      sanitized[key] = sanitizeObject(value);
      continue;
    }

    sanitized[key] = value;
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
