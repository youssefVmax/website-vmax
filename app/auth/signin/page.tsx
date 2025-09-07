"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthSignInPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the root with a flag to show the login form
    router.push('/?login=1');
  }, [router]);

  return null; // This page will immediately redirect
}
