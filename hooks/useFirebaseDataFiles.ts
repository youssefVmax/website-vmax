"use client"

import { useState, useEffect } from 'react';
import { dataFilesService, numberAssignmentsService } from '@/lib/firebase-data-services';
import { sanitizeObject } from '@/lib/timestamp-utils';

export function useFirebaseDataFiles(userRole: string, userName: string) {
  const [files, setFiles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribeFiles: (() => void) | null = null;
    let unsubscribeAssignments: (() => void) | null = null;

    try {
      // Set up real-time listeners with comprehensive sanitization
      unsubscribeFiles = dataFilesService.onDataFilesChange(
        (updatedFiles) => {
          try {
            // Completely sanitize all data to prevent timestamp issues
            const sanitizedFiles = updatedFiles.map(file => sanitizeObject(file));
            setFiles(sanitizedFiles);
            setLoading(false);
          } catch (err) {
            console.error('Error processing files data:', err);
            setError('Failed to process files data');
            setLoading(false);
          }
        },
        userRole,
        userName
      );

      unsubscribeAssignments = numberAssignmentsService.onAssignmentsChange(
        (updatedAssignments) => {
          try {
            // Completely sanitize all data to prevent timestamp issues
            const sanitizedAssignments = updatedAssignments.map(assignment => sanitizeObject(assignment));
            setAssignments(sanitizedAssignments);
          } catch (err) {
            console.error('Error processing assignments data:', err);
            setError('Failed to process assignments data');
          }
        },
        userRole,
        userName
      );
    } catch (err) {
      console.error('Error setting up Firebase listeners:', err);
      setError('Failed to connect to Firebase');
      setLoading(false);
    }

    // Error handling
    const handleError = (err: any) => {
      console.error('Firebase data error:', err);
      setError('Failed to load data');
      setLoading(false);
    };

    return () => {
      try {
        if (unsubscribeFiles) unsubscribeFiles();
        if (unsubscribeAssignments) unsubscribeAssignments();
      } catch (err) {
        handleError(err);
      }
    };
  }, [userRole, userName]);

  return {
    files,
    assignments,
    loading,
    error,
    refresh: () => {
      setLoading(true);
      setError(null);
    }
  };
}
