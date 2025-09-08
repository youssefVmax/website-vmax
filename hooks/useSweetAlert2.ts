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
  showDenyButton?: boolean;
  timer?: number;
  timerProgressBar?: boolean;
  toast?: boolean;
  position?: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end';
  [key: string]: any; // Allow any other properties
}

interface SweetAlertResult {
  isConfirmed: boolean;
  isDenied: boolean;
  isDismissed: boolean;
  value?: any;
  dismiss?: string;
}

const SWEETALERT2_CDN = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';

// Fallback implementation when SweetAlert2 fails to load
const createFallbackSwal = () => {
  const fallback = {
    fire: (options: SweetAlertOptions): Promise<SweetAlertResult> => {
      if (options.icon === 'error') {
        alert(`Error: ${options.title}\n${options.text || ''}`);
      } else if (options.icon === 'warning') {
        alert(`Warning: ${options.title}\n${options.text || ''}`);
      } else if (options.icon === 'success') {
        alert(`Success: ${options.title}\n${options.text || ''}`);
      } else if (options.icon === 'info') {
        alert(`Info: ${options.title}\n${options.text || ''}`);
      } else if (options.icon === 'question' || options.showCancelButton || options.showDenyButton) {
        const result = confirm(`${options.title}\n${options.text || ''}\n\nOK to confirm, Cancel to cancel.`);
        return Promise.resolve({ 
          isConfirmed: result, 
          isDenied: !result,
          isDismissed: !result,
          value: result,
          dismiss: result ? undefined : 'cancel'
        });
      } else {
        alert(`${options.title}\n${options.text || ''}`);
      }
      return Promise.resolve({ 
        isConfirmed: true, 
        isDenied: false, 
        isDismissed: false,
        value: true
      });
    },
    mixin: (options: any = {}) => ({
      fire: (opts: SweetAlertOptions) => fallback.fire({ ...options, ...opts }),
      showLoading: () => { /* no-op */ },
      stopTimer: () => { /* no-op */ },
      resumeTimer: () => { /* no-op */ },
      update: (opts: any) => ({ ...fallback, ...opts })
    })
  };
  return fallback;
};

const useSweetAlert = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const setupFallback = () => {
      if (!window.Swal) {
        window.Swal = createFallbackSwal();
        setIsLoaded(true);
      }
    };

    // Check if already loaded
    if (window.Swal) {
      setIsLoaded(true);
      return;
    }

    // Try to load from CDN
    const script = document.createElement('script');
    script.src = SWEETALERT2_CDN;
    script.async = true;
    
    script.onload = () => {
      if (window.Swal) {
        // Add default styling
        const style = document.createElement('link');
        style.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
        style.rel = 'stylesheet';
        document.head.appendChild(style);
        
        setIsLoaded(true);
      } else {
        console.error('SweetAlert2 failed to load from CDN');
        setupFallback();
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load SweetAlert2 script');
      setupFallback();
    };
    
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Helper function to safely call SweetAlert
  const fire = (options: SweetAlertOptions): Promise<SweetAlertResult> => {
    // First try to use SweetAlert2 if available
    if (window.Swal) {
      return window.Swal.fire(options)
        .then((result: any) => {
          const typedResult: SweetAlertResult = {
            isConfirmed: Boolean(result?.isConfirmed),
            isDenied: Boolean(result?.isDenied),
            isDismissed: Boolean(result?.isDismissed),
            value: result?.value,
            dismiss: result?.dismiss
          };
          return typedResult;
        })
        .catch((error: Error) => {
          console.error('Error in SweetAlert2:', error);
          // Continue to fallback if there's an error
          return Promise.reject(error);
        });
    }
    
      // Fallback to browser dialogs if SweetAlert2 is not available
    if (options.icon === 'question' || options.showCancelButton || options.showDenyButton) {
      const confirmed = window.confirm(`${options.title}\n${options.text || ''}\n\nOK to confirm, Cancel to cancel.`);
      const result: SweetAlertResult = {
        isConfirmed: confirmed,
        isDenied: false,
        isDismissed: !confirmed,
        value: confirmed,
        dismiss: confirmed ? undefined : 'cancel'
      };
      return Promise.resolve(result);
    }
    
    // Default fallback for other cases
    window.alert(`${options.title}\n${options.text || ''}`);
    const defaultResult: SweetAlertResult = {
      isConfirmed: true,
      isDenied: false,
      isDismissed: false,
      value: true
    };
    return Promise.resolve(defaultResult);
  };

  // Convenience methods
  const success = (title: string, text?: string) => 
    fire({ title, text, icon: 'success' });

  const error = (title: string, text?: string) => 
    fire({ title, text, icon: 'error' });

  const warning = (title: string, text?: string) => 
    fire({ title, text, icon: 'warning' });

  const info = (title: string, text?: string) => 
    fire({ title, text, icon: 'info' });

  const question = (title: string, text?: string, confirmText = 'OK', cancelText = 'Cancel'): Promise<SweetAlertResult> => 
    fire({ 
      title, 
      text, 
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    });

  const confirm = (title: string, text?: string, confirmText = 'Yes', cancelText = 'No'): Promise<boolean> => {
    return fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    }).then(result => result.isConfirmed);
  };

  const toast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => 
    fire({
      title,
      icon,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });

  const loading = (title: string, text?: string) => {
    if (window.Swal) {
      if ((window.Swal as any).isLoading) {
        (window.Swal as any).update({
          title,
          text,
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: false,
          showCancelButton: false
        });
      } else {
        window.Swal.fire({
          title,
          text,
          didOpen: () => {
            if (window.Swal) {
              (window.Swal as any).showLoading();
            }
          },
          showConfirmButton: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          allowEnterKey: false,
          showCancelButton: false
        });
      }
    } else {
      console.log(`${title}: ${text || ''} (loading...)`);
    }
  };

  const close = () => {
    if (window.Swal) {
      (window.Swal as any).close();
    }
  };

  return {
    isLoaded,
    fire,
    success,
    error,
    warning,
    info,
    question,
    confirm,
    toast,
    loading,
    close,
    getInstance: () => window.Swal
  };
};

export default useSweetAlert;
