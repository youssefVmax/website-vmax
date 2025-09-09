"use client"

import { useState, useEffect } from 'react';
import { dataFilesService, numberAssignmentsService } from '@/lib/firebase-data-services';

export function useFirebaseDataFiles(userRole: string, userName: string) {
  const [files, setFiles] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Set up real-time listeners
    const unsubscribeFiles = dataFilesService.onDataFilesChange(
      (updatedFiles) => {
        setFiles(updatedFiles);
        setLoading(false);
      },
      userRole,
      userName
    );

    const unsubscribeAssignments = numberAssignmentsService.onAssignmentsChange(
      (updatedAssignments) => {
        setAssignments(updatedAssignments);
      },
      userRole,
      userName
    );

    // Error handling
    const handleError = (err: any) => {
      console.error('Firebase data error:', err);
      setError('Failed to load data');
      setLoading(false);
    };

    return () => {
      try {
        unsubscribeFiles();
        unsubscribeAssignments();
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
