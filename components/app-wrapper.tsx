"use client"

import React from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { SimpleLogin } from './simple-login';
import { RoleBasedWrapper } from './role-based-wrapper';
import FullPageDashboard from './full-page-dashboard';

function AppContent() {
  const { user, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading VMAX Sales System...</p>
        </div>
      </div>
    );
  }

  // Show login if no user
  if (!user) {
    return <SimpleLogin />;
  }

  // Show dashboard with role-based wrapper
  return (
    <RoleBasedWrapper>
      <FullPageDashboard />
    </RoleBasedWrapper>
  );
}

export function AppWrapper() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
