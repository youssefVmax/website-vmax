"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Users, UserCheck } from 'lucide-react';

export function SimpleLogin() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      setError('Login failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: 'manager' | 'team_leader' | 'salesman') => {
    setLoading(true);
    setError('');

    const credentials = {
      manager: { username: 'manager', password: 'manage@Vmax' },
      'team_leader': { username: 'team-lead', password: 'team-lead' },
      salesman: { username: 'sales', password: 'sales' }
    };

    const cred = credentials[role];
    
    try {
      const success = await login(cred.username, cred.password);
      if (!success) {
        setError(`Failed to login as ${role}`);
      }
    } catch (error) {
      setError('Login failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">VMAX Sales System</h1>
          <p className="text-slate-400">Please login to continue</p>
        </div>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                  disabled={loading}
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                disabled={loading || !username || !password}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-400">Or quick login as</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => quickLogin('manager')}
                disabled={loading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Manager
              </Button>
              
              <Button
                onClick={() => quickLogin('team_leader')}
                disabled={loading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Team Leader
              </Button>
              
              <Button
                onClick={() => quickLogin('salesman')}
                disabled={loading}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Salesman
              </Button>
            </div>

            <div className="text-xs text-slate-500 text-center">
              <p>Test Credentials:</p>
              <p>Manager: manager / manage@Vmax</p>
              <p>Team Leader: team-lead / team-lead</p>
              <p>Salesman: sales / sales</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
