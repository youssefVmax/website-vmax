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
        title: 'Callback Scheduled!',
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

// Manager notification for new deals (enhanced with right positioning)
export const showManagerNotification = async (salesmanName: string, dealAmount: number, customerName: string) => {
  return showNotificationToast(
    '💰 New Deal Created!',
    `$${dealAmount.toLocaleString()} deal by ${salesmanName} for ${customerName}`,
    'success'
  );
};

// Manager notification for new callbacks
export const showCallbackNotification = async (customerName: string, salesmanName: string, scheduledDate: string) => {
  return showNotificationToast(
    '📞 New Callback Scheduled!',
    `${customerName} callback scheduled for ${scheduledDate} by ${salesmanName}`,
    'info'
  );
};

// Manager notification for new feedback
export const showFeedbackNotification = async (feedbackType: string, customerName?: string, salesmanName?: string) => {
  return showNotificationToast(
    '💬 New Feedback Received!',
    `${feedbackType} feedback${customerName ? ` from ${customerName}` : ''}${salesmanName ? ` via ${salesmanName}` : ''}`,
    'warning'
  );
};

// Real-time notification toast (small, positioned right, clickable)
export const showNotificationToast = async (
  title: string, 
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  options: any = {}
) => {
  try {
    const customSwal = await getCustomSwal();
    
    // Color scheme based on notification type
    const typeColors = {
      info: {
        border: 'border-blue-500/30',
        shadow: 'shadow-blue-500/20',
        title: 'text-blue-400',
        bg: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        icon: '📢'
      },
      success: {
        border: 'border-green-500/30',
        shadow: 'shadow-green-500/20', 
        title: 'text-green-400',
        bg: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
        icon: '✅'
      },
      warning: {
        border: 'border-yellow-500/30',
        shadow: 'shadow-yellow-500/20',
        title: 'text-yellow-400', 
        bg: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
        icon: '⚠️'
      },
      error: {
        border: 'border-red-500/30',
        shadow: 'shadow-red-500/20',
        title: 'text-red-400',
        bg: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
        icon: '❌'
      }
    };

    const colors = typeColors[type];
    
    setTimeout(() => {
      customSwal.fire({
        title: `${colors.icon} ${title}`,
        html: `
          <div class="text-left space-y-2">
            <div class="text-sm text-slate-200 leading-relaxed">${message}</div>
            <div class="text-xs text-slate-400 mt-3 text-right">Click to dismiss</div>
          </div>
        `,
        toast: false,
        position: 'top-end',
        background: colors.bg,
        color: '#ffffff',
        width: '320px',
        timer: 8000,
        timerProgressBar: true,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: {
          popup: `animate__animated animate__slideInRight animate__faster ${colors.border} ${colors.shadow} border shadow-2xl rounded-lg`,
          title: `text-sm font-bold ${colors.title}`,
          htmlContainer: 'text-slate-200 text-left',
          timerProgressBar: 'bg-white/30',
          closeButton: 'text-white/70 hover:text-white text-lg'
        },
        showClass: {
          popup: 'animate__animated animate__slideInRight animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__slideOutRight animate__faster'
        },
        // Make it clickable to dismiss
        didOpen: (popup: any) => {
          popup.addEventListener('click', () => {
            customSwal.close();
          });
          // Add hover effect
          popup.style.cursor = 'pointer';
          popup.addEventListener('mouseenter', () => {
            popup.style.transform = 'scale(1.02)';
            popup.style.transition = 'transform 0.2s ease';
          });
          popup.addEventListener('mouseleave', () => {
            popup.style.transform = 'scale(1)';
          });
        },
        willClose: () => {
          // Clean up any lingering modal state
          const modal = document.querySelector('.swal2-container');
          if (modal) {
            modal.remove();
          }
        },
        ...options
      });
    }, 100);
  } catch (error) {
    console.error('Error showing notification toast:', error);
    // Fallback to simple notification
    setTimeout(() => {
      const fallbackDiv = document.createElement('div');
      fallbackDiv.innerHTML = `
        <div style="
          position: fixed; 
          top: 20px; 
          right: 20px; 
          background: #1e3a8a; 
          color: white; 
          padding: 12px 16px; 
          border-radius: 8px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 9999;
          max-width: 320px;
          cursor: pointer;
        ">
          <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
          <div style="font-size: 14px; opacity: 0.9;">${message}</div>
        </div>
      `;
      document.body.appendChild(fallbackDiv);
      
      // Auto remove after 5 seconds or on click
      const removeDiv = () => {
        if (fallbackDiv.parentNode) {
          fallbackDiv.parentNode.removeChild(fallbackDiv);
        }
      };
      fallbackDiv.addEventListener('click', removeDiv);
      setTimeout(removeDiv, 5000);
    }, 100);
  }
  return Promise.resolve();
};

// Enhanced validation error notification for missing fields
export const showValidationError = async (missingFields: string[], formType: 'deal' | 'callback' = 'deal') => {
  try {
    const customSwal = await getCustomSwal();
    
    // Create formatted list of missing fields
    const fieldsList = missingFields.map(field => `• ${field}`).join('<br>');
    const fieldCount = missingFields.length;
    const fieldWord = fieldCount === 1 ? 'field' : 'fields';
    
    setTimeout(() => {
      customSwal.fire({
        title: '⚠️ Missing Required Information',
        html: `
          <div class="text-left space-y-4">
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div class="text-sm text-red-300 mb-3">
                Please fill in the following required ${fieldWord} to ${formType === 'deal' ? 'create the deal' : 'schedule the callback'}:
              </div>
              <div class="text-sm font-medium text-red-200 leading-relaxed">
                ${fieldsList}
              </div>
            </div>
            <div class="text-xs text-slate-400 text-center">
              <strong>Note:</strong> Only "Comments/Notes" fields are optional
            </div>
          </div>
        `,
        icon: 'warning',
        showConfirmButton: true,
        confirmButtonText: 'Got it, I\'ll fill them',
        position: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        width: '480px',
        customClass: {
          popup: 'animate__animated animate__shake animate__faster border border-red-500/30 shadow-2xl shadow-red-500/20',
          title: 'text-xl font-bold text-red-400',
          htmlContainer: 'text-slate-200 text-left',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors',
        },
        showClass: {
          popup: 'animate__animated animate__shake animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOut animate__faster'
        },
        willClose: () => {
          // Clean up any lingering modal state
          const modal = document.querySelector('.swal2-container');
          if (modal) {
            modal.remove();
          }
        }
      });
    }, 100);
  } catch (error) {
    console.error('Error showing validation error:', error);
    // Fallback to simple alert
    setTimeout(() => {
      alert(`Missing Required Fields:\n${missingFields.join('\n')}\n\nPlease fill in all required fields before submitting.`);
    }, 100);
  }
  return Promise.resolve();
};

// Beautiful Target Added notification - Simplified for reliability
export const showTargetAdded = async (opts: {
  type: 'individual' | 'team'
  name: string
  amount: number
  deals: number
  period: string
}) => {
  try {
    const swal = await ensureSwal(); // Use ensureSwal directly instead of custom wrapper
    const { type, name, amount, deals, period } = opts;
    const title = type === 'team' ? '🎯 Team Target Created!' : '🎯 Target Created!';

    // Simple, reliable SweetAlert configuration
    return swal.fire({
      title: title,
      html: `
        <div style="text-align: center; padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="font-size: 20px; font-weight: 600; color: #0891b2; margin-bottom: 20px;">
            ${name}
          </div>
          <div style="display: flex; justify-content: space-around; margin-bottom: 15px;">
            <div style="text-align: center; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #0891b2;">
              <div style="font-size: 18px; font-weight: bold; color: #065f46;">$${(amount || 0).toLocaleString()}</div>
              <div style="font-size: 12px; color: #059669;">Revenue Target</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #eff6ff; border-radius: 8px; border: 1px solid #2563eb;">
              <div style="font-size: 18px; font-weight: bold; color: #1d4ed8;">${deals || 0}</div>
              <div style="font-size: 12px; color: #2563eb;">Deals Target</div>
            </div>
          </div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 10px;">
            Period: ${period || 'N/A'}
          </div>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'Awesome! 🎉',
      confirmButtonColor: '#0891b2',
      allowOutsideClick: true,
      allowEscapeKey: true,
      focusConfirm: true,
      width: 450,
      padding: '2em',
      background: '#ffffff',
      backdrop: `
        rgba(0,0,0,0.4)
        left top
        no-repeat
      `
    }).then((result: any) => {
      console.log('SweetAlert closed:', result);
      return result;
    });
  } catch (error) {
    console.error('Error showing target added notification:', error);
    // Immediate fallback to browser alert
    alert(`🎯 Target Created!\n\n${opts.name}\n💰 Revenue: $${(opts.amount || 0).toLocaleString()}\n📊 Deals: ${opts.deals || 0}\n📅 Period: ${opts.period || 'N/A'}`);
    return Promise.resolve({ isConfirmed: true });
  }
};

// Export a function that returns the custom swal instance
export default async function getCustomSwalInstance() {
  return getCustomSwal();
}