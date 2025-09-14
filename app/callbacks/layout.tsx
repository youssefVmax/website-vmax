"use client";

import React from "react";

// Passthrough layout: render children only, so callbacks pages adopt the app's main layout/shell
export default function CallbacksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}