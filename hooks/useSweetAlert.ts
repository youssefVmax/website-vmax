import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Swal: any;
  }
}

interface SweetAlertOptions {
  title: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  timer?: number;
  timerProgressBar?: boolean;
  toast?: boolean;
  position?: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';
}

const useSweetAlert = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSweetAlert = async () => {
      // Check if already loaded
      if (window.Swal) {
        setIsLoaded(true);
        return;
      }

      try {
        // Try to import the module
        const module = await import('sweetalert2');
        window.Swal = module.default;
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load SweetAlert2 module, trying CDN...', error);
        
        // If import fails, try loading from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
        script.async = true;
        
        script.onload = () => {
          setIsLoaded(true);
        };
        
        script.onerror = () => {
          console.error('Failed to load SweetAlert2 from CDN');
          // Provide a fallback implementation
          window.Swal = {
            fire: (options: SweetAlertOptions) => {
              if (options.icon === 'error') {
                alert(`Error: ${options.title}\n${options.text || ''}`);
              } else {
                alert(`${options.title}\n${options.text || ''}`);
              }
              return Promise.resolve({ isConfirmed: true });
            },
            mixin: () => ({
              fire: (options: SweetAlertOptions) => {
                if (options.icon === 'error') {
                  alert(`Error: ${options.title}\n${options.text || ''}`);
                } else {
                  alert(`${options.title}\n${options.text || ''}`);
                }
                return Promise.resolve({ isConfirmed: true });
              },
              showLoading: () => {},
              stopTimer: () => {},
              resumeTimer: () => {}
            })
          };
          setIsLoaded(true);
        };
        
        document.head.appendChild(script);
      }
    };

    loadSweetAlert();

    return () => {
      // Cleanup if needed
    };
  }, []);

  const fire = (options: SweetAlertOptions) => {
    if (window.Swal) {
      return window.Swal.fire(options);
    }
    // Fallback if Swal is not loaded yet
    alert(`${options.title}\n${options.text || ''}`);
    return Promise.resolve({ isConfirmed: true });
  };

  const success = (title: string, text?: string) => {
    return fire({ title, text, icon: 'success' });
  };

  const error = (title: string, text?: string) => {
    return fire({ title, text, icon: 'error' });
  };

  const warning = (title: string, text?: string) => {
    return fire({ title, text, icon: 'warning' });
  };

  const info = (title: string, text?: string) => {
    return fire({ title, text, icon: 'info' });
  };

  const confirm = (title: string, text?: string, confirmText = 'Yes', cancelText = 'No') => {
    return fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });
  };

  const toast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    return fire({
      title,
      icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  };

  return {
    isLoaded,
    fire,
    success,
    error,
    warning,
    info,
    confirm,
    toast,
    getInstance: () => window.Swal
  };
};

export default useSweetAlert;
