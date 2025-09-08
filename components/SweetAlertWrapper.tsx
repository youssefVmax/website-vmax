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
        // Fallback to browser alerts
        if (typeof window !== 'undefined') {
          (window as any).Swal = {
            fire: (options: any) => {
              if (options.icon === 'error') {
                alert(`Error: ${options.title}\n${options.text || ''}`);
              } else {
                alert(`${options.title}\n${options.text || ''}`);
              }
              return Promise.resolve({ isConfirmed: true });
            },
            mixin: () => ({
              fire: (options: any) => {
                if (options.icon === 'error') {
                  alert(`Error: ${options.title}\n${options.text || ''}`);
                } else {
                  alert(`${options.title}\n${options.text || ''}`);
                }
                return Promise.resolve({ isConfirmed: true });
              }
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
