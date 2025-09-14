// Dynamic import for SweetAlert2 with CDN fallback
let Swal: any;

// Function to ensure SweetAlert2 is loaded
const ensureSwal = async () => {
  if (!Swal) {
    // First try to load from CDN
    if (typeof window !== 'undefined' && (window as any).Swal) {
      Swal = (window as any).Swal;
      return Swal;
    }

    try {
      // Try to import the module
      const module = await import('sweetalert2');
      Swal = module.default;
      return Swal;
    } catch (error) {
      console.error('Failed to load SweetAlert2 module, trying CDN...', error);
      
      // If we're in a browser environment, try to load from CDN
      if (typeof window !== 'undefined') {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
          script.onload = () => {
            Swal = (window as any).Swal;
            resolve(Swal);
          };
          script.onerror = () => {
            console.error('Failed to load SweetAlert2 from CDN');
            // Fallback to browser alert if all else fails
            const fallbackSwal = {
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
                },
                showLoading: () => {},
                stopTimer: () => {},
                resumeTimer: () => {}
              })
            };
            resolve(fallbackSwal);
          };
          document.head.appendChild(script);
        });
      }
      
      // If not in browser, return a minimal implementation
      return {
        fire: (options: any) => {
          console.log('SweetAlert2 not available:', options);
          return Promise.resolve({ isConfirmed: true });
        },
        mixin: () => ({
          fire: (options: any) => {
            console.log('SweetAlert2 not available:', options);
            return Promise.resolve({ isConfirmed: true });
          },
          showLoading: () => {},
          stopTimer: () => {},
          resumeTimer: () => {}
        })
      };
    }
  }
  return Swal;
};

// Custom SweetAlert2 configuration matching the app's futuristic design
const getCustomSwal = async () => {
  const swal = await ensureSwal();
  return swal.mixin({
    customClass: {
      popup: 'custom-swal-popup',
      title: 'custom-swal-title',
      htmlContainer: 'custom-swal-content',
      confirmButton: 'custom-swal-confirm',
      cancelButton: 'custom-swal-cancel',
      denyButton: 'custom-swal-deny',
      icon: 'custom-swal-icon'
    },
    buttonsStyling: false,
    background: 'transparent',
    backdrop: 'rgba(0, 0, 0, 0.8)',
    position: 'top',
    showClass: {
      popup: 'animate__animated animate__slideInDown animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__slideOutUp animate__faster'
    }
  });
};

// Success notification
export const showSuccess = async (title: string, message?: string, options: any = {}) => {
  const customSwal = await getCustomSwal();
  
  // Default options
  const defaultOptions = {
    icon: 'success',
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: false,
    position: 'top',
    customClass: {
      popup: 'animate__animated animate__fadeInDown',
      title: 'text-2xl font-bold text-green-500',
      htmlContainer: 'text-slate-700',
      timerProgressBar: 'bg-green-500',
    },
    ...options // Allow overriding defaults
  };

  // Special styling for login success
  if (title === 'Login Successful') {
    defaultOptions.position = 'center';
    defaultOptions.background = '#0f172a';
    defaultOptions.color = '#ffffff';
    defaultOptions.timer = 2000;
    defaultOptions.customClass = {
      popup: 'animate__animated animate__zoomIn animate__faster',
      title: 'text-2xl font-bold text-emerald-400',
      htmlContainer: 'text-slate-200',
      timerProgressBar: 'bg-emerald-500',
    };
    defaultOptions.showClass = {
      popup: 'animate__animated animate__zoomIn animate__faster',
    };
    defaultOptions.hideClass = {
      popup: 'animate__animated animate__zoomOut animate__faster',
    };
  }

  return customSwal.fire(defaultOptions);
};

// Error notification
export const showError = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'OK',
    showConfirmButton: true,
    position: 'top'
  });
};

// Warning notification
export const showWarning = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: 'Continue',
    cancelButtonText: 'Cancel',
    position: 'top'
  });
};

// Info notification
export const showInfo = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonText: 'Got it',
    timer: 5000,
    timerProgressBar: true,
    position: 'top'
  });
};

// Confirmation dialog
export const showConfirm = async (title: string, message?: string, confirmText = 'Yes', cancelText = 'No') => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    position: 'top'
  });
};

// Loading notification
export const showLoading = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    title,
    text: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    position: 'top',
    didOpen: () => {
      const swal = customSwal;
      if (swal.showLoading) {
        swal.showLoading();
      }
    }
  });
};

// Toast notification (small, non-intrusive)
export const showToast = async (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast: any) => {
      const swal = customSwal;
      toast.addEventListener('mouseenter', () => {
        if (swal.stopTimer) swal.stopTimer();
      });
      toast.addEventListener('mouseleave', () => {
        if (swal.resumeTimer) swal.resumeTimer();
      });
    }
  });
};

// Deal added notification (no longer showing as per user request)
export const showDealAdded = async (dealAmount: number, customerName: string, customMessage?: string) => {
  // No-op function - notifications removed as per user request
  return Promise.resolve();
};

// Manager notification for new deals
export const showManagerNotification = async (salesmanName: string, dealAmount: number, customerName: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    title: `New deal: $${dealAmount.toLocaleString()} by ${salesmanName}`,
    icon: 'success',
    position: 'top'
  });
};

// Export a function that returns the custom swal instance
export default async function getCustomSwalInstance() {
  return getCustomSwal();
}