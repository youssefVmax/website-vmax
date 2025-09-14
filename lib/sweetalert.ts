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
export const showSuccess = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    icon: 'success',
    title,
    text: message,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: false,
    position: 'top'
  });
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

// Deal added notification (custom for this app)
export const showDealAdded = async (dealAmount: number, customerName: string, customMessage?: string) => {
  const customSwal = await getCustomSwal();
  return customSwal.fire({
    icon: 'success',
    title: '🎉 Deal Added Successfully!',
    html: `
      <div style="
        background: linear-gradient(145deg, #f8fafc, #f1f5f9);
        border-radius: 12px;
        padding: 20px;
        border: 2px solid #dbeafe;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      ">
        <div style="
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 12px;
          text-align: center;
        ">$${dealAmount.toLocaleString()}</div>
        
        <div style="
          font-size: 1.25rem;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 8px;
          text-align: center;
        ">${customerName}</div>
        
        <div style="
          color: #4b5563;
          text-align: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        ">
          <svg class="animate-bounce w-5 h-5 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
          </svg>
          ${customMessage || (dealAmount > 0 ? 'Deal has been added and all KPIs updated in real-time!' : 'Callback has been scheduled successfully!')}
        </div>
      </div>
    `,
    timer: 4500,
    timerProgressBar: true,
    showConfirmButton: false,
    width: '380px',
    padding: '0',
    background: 'transparent',
    backdrop: `
      rgba(0, 0, 0, 0.7)
      url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23dbeafe' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/svg%3E")
    `,
    customClass: {
      popup: '!bg-transparent !shadow-none',
      title: '!text-white !text-xl !font-bold !mb-4',
      htmlContainer: '!overflow-visible',
    },
    didOpen: (toast: any) => {
      toast.style.background = 'transparent';
      toast.style.boxShadow = 'none';
    }
  });
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