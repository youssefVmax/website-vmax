"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

export function FirebaseMigration() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const runMigration = async () => {
    setMigrationStatus('running');
    setMessage('Starting migration to Firebase...');

    try {
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setMigrationStatus('success');
        setMessage('Migration completed successfully! All data has been moved to Firebase.');
      } else {
        setMigrationStatus('error');
        setMessage(`Migration failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setMigrationStatus('error');
      setMessage(`Migration failed: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  const testFirebaseConnection = async () => {
    setMigrationStatus('running');
    setMessage('Testing Firebase connection...');

    try {
      const response = await fetch('/api/firebase/sales?userRole=manager');
      
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus('success');
        setMessage(`Firebase connection successful! Found ${data.length} sales records.`);
      } else {
        setMigrationStatus('error');
        setMessage('Firebase connection failed. Check your configuration.');
      }
    } catch (error) {
      setMigrationStatus('error');
      setMessage(`Connection test failed: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Firebase Migration & Testing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={runMigration}
            disabled={migrationStatus === 'running'}
            className="h-12"
          >
            {migrationStatus === 'running' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Migrate CSV to Firebase
          </Button>

          <Button 
            onClick={testFirebaseConnection}
            disabled={migrationStatus === 'running'}
            variant="outline"
            className="h-12"
          >
            {migrationStatus === 'running' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Test Firebase Connection
          </Button>
        </div>

        {message && (
          <Alert className={
            migrationStatus === 'success' ? 'border-green-200 bg-green-50' :
            migrationStatus === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }>
            {migrationStatus === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : migrationStatus === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
            <AlertDescription className={
              migrationStatus === 'success' ? 'text-green-800' :
              migrationStatus === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Migration Process:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Reads existing CSV data from public/data/aug-ids-new.csv</li>
            <li>Converts and uploads to Firebase Firestore</li>
            <li>Creates sample users and notifications</li>
            <li>Enables real-time data synchronization</li>
          </ul>
          
          <p className="mt-4"><strong>After Migration:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>All dashboard data will be real-time</li>
            <li>CSV files are no longer needed</li>
            <li>Data persists in Firebase cloud</li>
            <li>Multiple users can collaborate simultaneously</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
