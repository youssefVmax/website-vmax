'use client';

import { useEffect, useState } from 'react';

// This component will handle the SweetAlert2 initialization
const SweetAlertWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Try to dynamically import SweetAlert2
    const initializeSweetAlert = async () => {
      try {
        const module = await import('sweetalert2');
        if (typeof window !== 'undefined') {
          (window as any).Swal = module.default;
        }
      } catch (error) {
        console.warn('SweetAlert2 could not be loaded. Using fallback alerts.');
        // Fallback to enhanced browser alerts with better formatting
        if (typeof window !== 'undefined') {
          const createFallbackAlert = (options: any) => {
            const iconEmojis: Record<string, string> = {
              'success': '✅',
              'error': '❌',
              'warning': '⚠️',
              'info': 'ℹ️',
              'question': '❓'
            };
            const iconEmoji = iconEmojis[options.icon] || '';
            
            const message = `${iconEmoji} ${options.title}${options.text ? '\n\n' + options.text : ''}`;
            
            // Use confirm for questions, alert for others
            if (options.icon === 'question' || options.showCancelButton) {
              return Promise.resolve({ isConfirmed: confirm(message) });
            } else {
              alert(message);
              return Promise.resolve({ isConfirmed: true });
            }
          };

          (window as any).Swal = {
            fire: createFallbackAlert,
            mixin: () => ({
              fire: createFallbackAlert
            })
          };
        }
      }
    };
    
    initializeSweetAlert();
  }, []);

  return <>{children}</>;
};

export default SweetAlertWrapper;
