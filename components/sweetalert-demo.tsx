"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  showDealAdded, 
  showCallbackCreated, 
  showManagerNotification, 
  showSuccess, 
  showError, 
  showWarning, 
  showInfo 
} from '@/lib/sweetalert';

export function SweetAlertDemo() {
  const handleDealDemo = async () => {
    await showDealAdded(1250, "John Smith", "Deal completed successfully with premium package!");
  };

  const handleCallbackDemo = async () => {
    await showCallbackCreated("Sarah Johnson", "+1 (555) 123-4567", "Mike Wilson", "Callback scheduled for technical consultation!");
  };

  const handleManagerNotificationDemo = async () => {
    await showManagerNotification("Alex Rodriguez", 2500, "David Brown");
  };

  const handleLoginSuccessDemo = async () => {
    await showSuccess("Login Successful", "Welcome back to Vmax Sales System!");
  };

  const handleErrorDemo = async () => {
    await showError("Connection Error", "Unable to connect to the server. Please try again.");
  };

  const handleWarningDemo = async () => {
    await showWarning("Unsaved Changes", "You have unsaved changes. Do you want to continue?");
  };

  const handleInfoDemo = async () => {
    await showInfo("System Update", "A new version of the system is available. Update will be applied during maintenance window.");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🎨 Enhanced SweetAlert Designs Demo
          </CardTitle>
          <p className="text-slate-400">
            Test all the new professional animated SweetAlert notifications with logos and modern styling
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deal Notifications */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-cyan-400 flex items-center gap-2">
              💰 Deal Notifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleDealDemo}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🎉 Show Deal Success
              </Button>
              <Button
                onClick={handleManagerNotificationDemo}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                🎯 Manager Notification
              </Button>
            </div>
          </div>

          {/* Callback Notifications */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
              📞 Callback Notifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Button
                onClick={handleCallbackDemo}
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                📅 Show Callback Created
              </Button>
            </div>
          </div>

          {/* Standard Notifications */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
              🔔 Standard Notifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={handleLoginSuccessDemo}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                ✅ Success (Login)
              </Button>
              <Button
                onClick={handleErrorDemo}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                ❌ Error
              </Button>
              <Button
                onClick={handleWarningDemo}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                ⚠️ Warning
              </Button>
              <Button
                onClick={handleInfoDemo}
                className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                ℹ️ Info
              </Button>
            </div>
          </div>

          {/* Features List */}
          <div className="mt-8 p-6 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <h4 className="text-lg font-semibold text-slate-200 mb-4">✨ Enhanced Features</h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">🎨</span>
                Professional animated designs matching the login SweetAlert style
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">🚀</span>
                Smooth animations with bounce, fade, and slide effects
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">📱</span>
                Logo integration with the same TV icon from the landing page
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">⚡</span>
                Quick appear/disappear animations for manager notifications
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">🎯</span>
                Color-coded notifications for different types (deals, callbacks, etc.)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-red-400">📱</span>
                Mobile responsive design with proper scaling
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SweetAlertDemo;
