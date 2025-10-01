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
    position: 'center',
    showClass: {
      popup: 'animate__animated animate__zoomIn animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__zoomOut animate__faster'
    }
  });
};

// Success notification
export const showSuccess = async (title: string, message?: string, options: any = {}) => {
  const customSwal = await getCustomSwal();
  const defaultOptions = {
    icon: 'success',
    title,
    text: message,
    timer: 2200,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: false,
    position: 'center',
    background: '#0f172a',
    color: '#ffffff',
    customClass: {
      popup: 'animate__animated animate__zoomIn animate__faster border border-emerald-500/30 shadow-2xl shadow-emerald-500/20',
      title: 'text-2xl font-bold text-emerald-400',
      htmlContainer: 'text-slate-200',
      timerProgressBar: 'bg-emerald-500',
    },
    ...options
  };
  // Fire without blocking caller
  setTimeout(() => { customSwal.fire(defaultOptions); }, 0);
  return Promise.resolve();
};

// Error notification with red text and black background
export const showError = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  setTimeout(() => { customSwal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'OK',
    showConfirmButton: true,
    position: 'center',
    background: '#000000', // Black background
    color: '#ffffff', // White text for readability
    customClass: {
      popup: 'animate__animated animate__zoomIn animate__faster border border-red-500/50 shadow-2xl shadow-red-500/30',
      title: 'text-2xl font-bold text-red-400', // Red title
      htmlContainer: 'text-red-300', // Light red message text
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors',
      icon: 'text-red-500'
    },
    showClass: {
      popup: 'animate__animated animate__zoomIn animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__zoomOut animate__faster'
    }
  }); }, 0);
  return Promise.resolve();
};

// Warning notification
export const showWarning = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  setTimeout(() => { customSwal.fire({
    icon: 'warning',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonText: 'Continue',
    cancelButtonText: 'Cancel',
    position: 'center'
  }); }, 0);
  return Promise.resolve();
};

// Info notification
export const showInfo = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  setTimeout(() => { customSwal.fire({
    icon: 'info',
    title,
    text: message,
    confirmButtonText: 'Got it',
    timer: 500,
    timerProgressBar: true,
    position: 'center'
  }); }, 0);
  return Promise.resolve();
};

// Confirmation dialog
export const showConfirm = async (title: string, message?: string, confirmText = 'Yes', cancelText = 'No') => {
  const customSwal = await getCustomSwal();
  // Confirmation dialogs should still return the promise for user choice
  return customSwal.fire({
    title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    position: 'center'
  });
};

// Loading notification
export const showLoading = async (title: string, message?: string) => {
  const customSwal = await getCustomSwal();
  setTimeout(() => { customSwal.fire({
    title,
    text: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    position: 'center',
    didOpen: () => {
      const swal = customSwal;
      if (swal.showLoading) {
        swal.showLoading();
      }
    }
  }); }, 0);
  return Promise.resolve();
};

// Toast notification (small, non-intrusive)
export const showToast = async (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  // Replace top-right toast with centered animated modal
  return showSuccess(title, undefined, { icon });
};

// Enhanced Deal Added notification with OK button and green design
export const showDealAdded = async (dealAmount: number, customerName: string, customMessage?: string) => {
  try {
    const customSwal = await getCustomSwal();
    setTimeout(() => {
      customSwal.fire({
        title: '🎉 Deal Added Successfully!',
        html: `
          <div class="text-center space-y-3">
            <div class="text-2xl font-bold text-green-400">$${dealAmount.toLocaleString()}</div>
            <div class="text-lg text-slate-300">Customer: ${customerName}</div>
            ${customMessage ? `<div class="text-sm text-slate-400">${customMessage}</div>` : ''}
          </div>
        `,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        position: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        customClass: {
          popup: 'animate__animated animate__zoomIn animate__faster border border-green-500/30 shadow-2xl shadow-green-500/20',
          title: 'text-2xl font-bold text-green-400',
          htmlContainer: 'text-slate-200',
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors',
        },
        showClass: {
          popup: 'animate__animated animate__zoomIn animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__zoomOut animate__faster'
        },
        // Ensure modal closes properly
        willClose: () => {
          // Clean up any lingering modal state
          const modal = document.querySelector('.swal2-container');
          if (modal) {
            modal.remove();
          }
        }
      });
    }, 100); // Small delay to ensure proper initialization
  } catch (error) {
    console.error('Error showing deal added notification:', error);
    // Fallback to simple alert if SweetAlert fails
    setTimeout(() => {
      alert(`Deal Added Successfully!\n$${dealAmount.toLocaleString()}\nCustomer: ${customerName}`);
    }, 100);
  }
  return Promise.resolve();
};

// Enhanced Callback Added notification with OK button and green design
export const showCallbackAdded = async (customerName: string, callbackDate: string, customMessage?: string) => {
  try {
    const customSwal = await getCustomSwal();
    setTimeout(() => {
      customSwal.fire({
        title: '📞 Callback Scheduled!',
        html: `
          <div class="text-center space-y-3">
            <div class="text-lg text-green-400 font-semibold">${customerName}</div>
            <div class="text-sm text-slate-300">Scheduled for: ${callbackDate}</div>
            ${customMessage ? `<div class="text-sm text-slate-400">${customMessage}</div>` : ''}
          </div>
        `,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        position: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        customClass: {
          popup: 'animate__animated animate__slideInRight animate__faster border border-green-500/30 shadow-2xl shadow-green-500/20',
          title: 'text-xl font-bold text-green-400',
          htmlContainer: 'text-slate-200',
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors',
        },
        showClass: {
          popup: 'animate__animated animate__slideInRight animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__slideOutRight animate__faster'
        },
        // Ensure modal closes properly
        willClose: () => {
          // Clean up any lingering modal state
          const modal = document.querySelector('.swal2-container');
          if (modal) {
            modal.remove();
          }
        }
      });
    }, 100); // Small delay to ensure proper initialization
  } catch (error) {
    console.error('Error showing callback added notification:', error);
    // Fallback to simple alert if SweetAlert fails
    setTimeout(() => {
      alert(`Callback Scheduled Successfully!\nCustomer: ${customerName}\nScheduled for: ${callbackDate}`);
    }, 100);
  }
  return Promise.resolve();
};

// Enhanced User Added notification with OK button and green design
export const showUserAdded = async (userName: string, userRole: string, customMessage?: string) => {
  try {
    const customSwal = await getCustomSwal();
    setTimeout(() => {
      customSwal.fire({
        title: '👤 User Created Successfully!',
        html: `
          <div class="text-center space-y-3">
            <div class="text-lg text-green-400 font-semibold">${userName}</div>
            <div class="text-sm text-slate-300 capitalize">Role: ${userRole}</div>
            ${customMessage ? `<div class="text-sm text-slate-400">${customMessage}</div>` : ''}
          </div>
        `,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        position: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        customClass: {
          popup: 'animate__animated animate__rotateIn animate__faster border border-green-500/30 shadow-2xl shadow-green-500/20',
          title: 'text-xl font-bold text-green-400',
          htmlContainer: 'text-slate-200',
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors',
        },
        showClass: {
          popup: 'animate__animated animate__rotateIn animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__rotateOut animate__faster'
        },
        // Ensure modal closes properly
        willClose: () => {
          // Clean up any lingering modal state
          const modal = document.querySelector('.swal2-container');
          if (modal) {
            modal.remove();
          }
        }
      });
    }, 100); // Small delay to ensure proper initialization
  } catch (error) {
    console.error('Error showing user added notification:', error);
    // Fallback to simple alert if SweetAlert fails
    setTimeout(() => {
      alert(`User Created Successfully!\nName: ${userName}\nRole: ${userRole}`);
    }, 100);
  }
  return Promise.resolve();
};

// Enhanced Feedback Added notification with OK button and green design
export const showFeedbackAdded = async (feedbackType: string, customerName?: string, customMessage?: string) => {
  try {
    const customSwal = await getCustomSwal();
    setTimeout(() => {
      customSwal.fire({
        title: '💬 Feedback Submitted!',
        html: `
          <div class="text-center space-y-3">
            <div class="text-lg text-green-400 font-semibold capitalize">${feedbackType} Feedback</div>
            ${customerName ? `<div class="text-sm text-slate-300">From: ${customerName}</div>` : ''}
            ${customMessage ? `<div class="text-sm text-slate-400">${customMessage}</div>` : ''}
          </div>
        `,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'OK',
        position: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        customClass: {
          popup: 'animate__animated animate__flipInX animate__faster border border-green-500/30 shadow-2xl shadow-green-500/20',
          title: 'text-xl font-bold text-green-400',
          htmlContainer: 'text-slate-200',
          confirmButton: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors',
        },
        showClass: {
          popup: 'animate__animated animate__flipInX animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__flipOutX animate__faster'
        },
        // Ensure modal closes properly
        willClose: () => {
          // Clean up any lingering modal state
          const modal = document.querySelector('.swal2-container');
          if (modal) {
            modal.remove();
          }
        }
      });
    }, 100); // Small delay to ensure proper initialization
  } catch (error) {
    console.error('Error showing feedback added notification:', error);
    // Fallback to simple alert if SweetAlert fails
    setTimeout(() => {
      alert(`Feedback Submitted Successfully!\nType: ${feedbackType}${customerName ? `\nFrom: ${customerName}` : ''}`);
    }, 100);
  }
  return Promise.resolve();
};

// Enhanced Login Success notification
export const showLoginSuccess = async (userName: string, userRole: string) => {
  const customSwal = await getCustomSwal();
  setTimeout(() => { customSwal.fire({
    title: '🚀 Welcome Back!',
    html: `
      <div class="text-center space-y-3">
        <div class="text-xl text-cyan-400 font-bold">${userName}</div>
        <div class="text-sm text-slate-300 capitalize">Logged in as ${userRole}</div>
        <div class="text-xs text-slate-400">Ready to boost your sales!</div>
      </div>
    `,
    icon: 'success',
    timer: 2500,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: '#ffffff',
    customClass: {
      popup: 'animate__animated animate__zoomIn animate__faster border border-cyan-500/30 shadow-2xl shadow-cyan-500/20',
      title: 'text-2xl font-bold text-cyan-400',
      htmlContainer: 'text-slate-200',
      timerProgressBar: 'bg-gradient-to-r from-cyan-400 to-blue-500',
    },
    showClass: {
      popup: 'animate__animated animate__zoomIn animate__faster'
    },
    hideClass: {
      popup: 'animate__animated animate__zoomOut animate__faster'
    }
  }); }, 0);
  return Promise.resolve();
};

// Manager notification for new deals
export const showManagerNotification = async (salesmanName: string, dealAmount: number, customerName: string) => {
  const customSwal = await getCustomSwal();
  setTimeout(() => { customSwal.fire({
    title: `💰 New Deal Alert!`,
    html: `
      <div class="text-center space-y-2">
        <div class="text-lg text-green-400 font-bold">$${dealAmount.toLocaleString()}</div>
        <div class="text-sm text-slate-300">by ${salesmanName}</div>
        <div class="text-xs text-slate-400">Customer: ${customerName}</div>
      </div>
    `,
    icon: 'success',
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
    position: 'center',
    background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    color: '#ffffff',
    customClass: {
      popup: 'animate__animated animate__zoomIn animate__faster border border-green-500/30 shadow-xl shadow-green-500/20',
      title: 'text-lg font-bold text-green-400',
      htmlContainer: 'text-slate-200',
      timerProgressBar: 'bg-gradient-to-r from-green-400 to-emerald-500',
    }
  }); }, 0);
  return Promise.resolve();
};

// Export a function that returns the custom swal instance
export default async function getCustomSwalInstance() {
  return getCustomSwal();
}