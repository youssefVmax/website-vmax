"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiService } from '@/lib/api-service';
import { CheckCircle, XCircle, AlertTriangle, Users, User, Shield } from 'lucide-react';

interface RoleTestResult {
  role: string;
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

interface CallbacksRoleVerificationProps {
  user: {
    id: string;
    name: string;
    role: 'manager' | 'team_leader' | 'salesman';
    managedTeam?: string;
    team?: string;
  };
}

export default function CallbacksRoleVerification({ user }: CallbacksRoleVerificationProps) {
  const [results, setResults] = useState<RoleTestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (role: string, test: string, status: RoleTestResult['status'], message: string, data?: any) => {
    setResults(prev => [...prev, { role, test, status, message, data }]);
  };

  const runRoleTests = async () => {
    setTesting(true);
    setResults([]);

    console.log('🔍 Starting role-based filtering verification for:', user);

    // Test 1: Manager Access (should see all callbacks)
    if (user.role === 'manager') {
      try {
        const allCallbacks = await apiService.getCallbacks({});
        addResult('Manager', 'All Callbacks Access', 'success', 
          `Manager can access all ${allCallbacks.length} callbacks`, 
          { count: allCallbacks.length }
        );

        // Test manager can see different teams
        const aliAshrafCallbacks = await apiService.getCallbacks({ salesTeam: 'ALI ASHRAF' });
        const csTeamCallbacks = await apiService.getCallbacks({ salesTeam: 'CS TEAM' });
        
        addResult('Manager', 'Cross-Team Access', 'success',
          `Manager can access ALI ASHRAF (${aliAshrafCallbacks.length}) and CS TEAM (${csTeamCallbacks.length}) callbacks`,
          { aliAshraf: aliAshrafCallbacks.length, csTeam: csTeamCallbacks.length }
        );
      } catch (error) {
        addResult('Manager', 'All Callbacks Access', 'error', `Manager access failed: ${error}`);
      }
    }

    // Test 2: Team Leader Access (should see managed team + personal)
    if (user.role === 'team_leader') {
      try {
        // Test team access
        if (user.managedTeam) {
          const teamCallbacks = await apiService.getCallbacks({ salesTeam: user.managedTeam });
          addResult('Team Leader', 'Team Callbacks Access', 'success',
            `Team leader can access ${teamCallbacks.length} callbacks from ${user.managedTeam} team`,
            { team: user.managedTeam, count: teamCallbacks.length }
          );

          // Test personal access
          const personalCallbacks = await apiService.getCallbacks({ salesAgentId: user.id });
          addResult('Team Leader', 'Personal Callbacks Access', 'success',
            `Team leader can access ${personalCallbacks.length} personal callbacks`,
            { count: personalCallbacks.length }
          );

          // Test restricted access (should not see other teams)
          const otherTeam = user.managedTeam === 'ALI ASHRAF' ? 'CS TEAM' : 'ALI ASHRAF';
          const restrictedCallbacks = await apiService.getCallbacks({ salesTeam: otherTeam });
          
          if (restrictedCallbacks.length === 0) {
            addResult('Team Leader', 'Access Restriction', 'success',
              `Team leader correctly restricted from ${otherTeam} team callbacks`);
          } else {
            addResult('Team Leader', 'Access Restriction', 'warning',
              `Team leader can see ${restrictedCallbacks.length} callbacks from ${otherTeam} (may be intended)`,
              { restrictedCount: restrictedCallbacks.length }
            );
          }
        } else {
          addResult('Team Leader', 'Team Assignment', 'error', 'Team leader has no managedTeam assigned');
        }
      } catch (error) {
        addResult('Team Leader', 'Team Access', 'error', `Team leader access failed: ${error}`);
      }
    }

    // Test 3: Salesman Access (should see only personal)
    if (user.role === 'salesman') {
      try {
        // Test personal access
        const personalCallbacks = await apiService.getCallbacks({ salesAgentId: user.id });
        addResult('Salesman', 'Personal Callbacks Access', 'success',
          `Salesman can access ${personalCallbacks.length} personal callbacks`,
          { count: personalCallbacks.length }
        );

        // Test restricted access (should not see all callbacks)
        const allCallbacks = await apiService.getCallbacks({});
        if (allCallbacks.length === personalCallbacks.length) {
          addResult('Salesman', 'Access Restriction', 'success',
            'Salesman correctly sees only personal callbacks');
        } else {
          addResult('Salesman', 'Access Restriction', 'warning',
            `Salesman sees ${allCallbacks.length} total vs ${personalCallbacks.length} personal (may indicate broader access)`,
            { total: allCallbacks.length, personal: personalCallbacks.length }
          );
        }
      } catch (error) {
        addResult('Salesman', 'Personal Access', 'error', `Salesman access failed: ${error}`);
      }
    }

    // Test 4: Unified Data API Role Filtering
    try {
      const unifiedResponse = await fetch(`/api/unified-data?userRole=${user.role}&userId=${user.id}&managedTeam=${user.managedTeam || ''}&dataTypes=callbacks&limit=100`);
      if (unifiedResponse.ok) {
        const unifiedData = await unifiedResponse.json();
        const unifiedCallbacks = unifiedData.data.callbacks || [];
        
        addResult('Unified API', 'Role-based Filtering', 'success',
          `Unified API returns ${unifiedCallbacks.length} callbacks for ${user.role}`,
          { count: unifiedCallbacks.length, role: user.role }
        );
      } else {
        addResult('Unified API', 'Role-based Filtering', 'error', 
          `Unified API failed: ${unifiedResponse.status}`);
      }
    } catch (error) {
      addResult('Unified API', 'Role-based Filtering', 'error', `Unified API error: ${error}`);
    }

    setTesting(false);
  };

  const getStatusIcon = (status: RoleTestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: RoleTestResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Callbacks Role-Based Access Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current User:</strong> {user.name} ({user.role})
                {user.managedTeam && <span> - Managing: {user.managedTeam}</span>}
                {user.team && <span> - Team: {user.team}</span>}
              </AlertDescription>
            </Alert>

            <Button onClick={runRoleTests} disabled={testing} className="w-full">
              {testing ? 'Running Tests...' : 'Run Role-Based Access Tests'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className={`border-l-4 ${getStatusColor(result.status)}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{result.role}</Badge>
                    <span className="font-medium">{result.test}</span>
                  </div>
                  {getStatusIcon(result.status)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
                {result.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">View Details</summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
