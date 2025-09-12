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

    // Set up real-time listeners with error handling
    const unsubscribeFiles = dataFilesService.onDataFilesChange(
      (updatedFiles) => {
        try {
          // Ensure all timestamps are properly serialized
          const serializedFiles = updatedFiles.map(file => ({
            ...file,
            uploadDate: file.uploadDate instanceof Date ? file.uploadDate : 
                       file.uploadDate?.toDate?.() || file.uploadDate,
            created_at: file.created_at instanceof Date ? file.created_at : 
                       file.created_at?.toDate?.() || file.created_at,
            updated_at: file.updated_at instanceof Date ? file.updated_at : 
                       file.updated_at?.toDate?.() || file.updated_at
          }));
          setFiles(serializedFiles);
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

    const unsubscribeAssignments = numberAssignmentsService.onAssignmentsChange(
      (updatedAssignments) => {
        try {
          // Ensure all timestamps are properly serialized
          const serializedAssignments = updatedAssignments.map(assignment => ({
            ...assignment,
            assignDate: assignment.assignDate instanceof Date ? assignment.assignDate : 
                       assignment.assignDate?.toDate?.() || assignment.assignDate,
            created_at: assignment.created_at instanceof Date ? assignment.created_at : 
                       assignment.created_at?.toDate?.() || assignment.created_at,
            updated_at: assignment.updated_at instanceof Date ? assignment.updated_at : 
                       assignment.updated_at?.toDate?.() || assignment.updated_at
          }));
          setAssignments(serializedAssignments);
        } catch (err) {
          console.error('Error processing assignments data:', err);
          setError('Failed to process assignments data');
        }
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
