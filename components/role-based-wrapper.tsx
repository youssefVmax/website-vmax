"use client"

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface RoleBasedWrapperProps {
  children: React.ReactNode;
  requiredRoles?: ('manager' | 'team_leader' | 'salesman')[];
}

export function RoleBasedWrapper({ children, requiredRoles }: RoleBasedWrapperProps) {
  const { user, loading, logout } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Check if user exists and has required properties
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-red-400 mb-4">🔒 Authentication Required</div>
          <p className="text-slate-300 mb-4">Please log in to access the VMAX Sales System.</p>
          <Button 
            onClick={() => window.location.href = '/login'} 
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has role property
  if (!user.role) {
    console.error('RoleBasedWrapper: User missing role property:', user);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ Invalid User Data</div>
          <p className="text-slate-300 mb-4">User role is not properly set. Please contact support.</p>
          <div className="space-x-2">
            <Button 
              onClick={logout} 
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Logout
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has required role
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-red-400 mb-4">🚫 Access Denied</div>
          <p className="text-slate-300 mb-2">
            You don't have permission to access this area.
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Required roles: {requiredRoles.join(', ')} | Your role: {user.role}
          </p>
          <Button 
            onClick={() => window.history.back()} 
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Validate role is one of the expected values
  const validRoles = ['manager', 'team_leader', 'salesman'];
  if (!validRoles.includes(user.role)) {
    console.error('RoleBasedWrapper: Invalid user role:', user.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ Invalid Role</div>
          <p className="text-slate-300 mb-2">
            Your user role "{user.role}" is not recognized.
          </p>
          <p className="text-slate-400 text-sm mb-4">
            Valid roles: {validRoles.join(', ')}
          </p>
          <div className="space-x-2">
            <Button 
              onClick={logout} 
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Logout
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Helper component for role-specific content
interface RoleContentProps {
  allowedRoles: ('manager' | 'team_leader' | 'salesman')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleContent({ allowedRoles, children, fallback }: RoleContentProps) {
  const { user } = useAuth();
  
  if (!user || !user.role || !allowedRoles.includes(user.role)) {
    return fallback || null;
  }
  
  return <>{children}</>;
}

// Helper hook for role checking
export function useRoleCheck() {
  const { user } = useAuth();
  
  const hasRole = (role: 'manager' | 'team_leader' | 'salesman') => {
    return user?.role === role;
  };
  
  const hasAnyRole = (roles: ('manager' | 'team_leader' | 'salesman')[]) => {
    return user?.role ? roles.includes(user.role) : false;
  };
  
  const isManager = () => hasRole('manager');
  const isTeamLeader = () => hasRole('team_leader');
  const isSalesman = () => hasRole('salesman');
  
  return {
    user,
    hasRole,
    hasAnyRole,
    isManager,
    isTeamLeader,
    isSalesman,
    userRole: user?.role,
    isAuthenticated: !!user && !!user.role
  };
}
