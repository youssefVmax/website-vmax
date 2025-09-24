'use client';

import { useEffect, useState } from 'react';

// This component will handle the SweetAlert2 initialization with enhanced styling
const SweetAlertWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Add Animate.css for animations
    const addAnimateCSS = () => {
      if (typeof document !== 'undefined' && !document.querySelector('#animate-css')) {
        const link = document.createElement('link');
        link.id = 'animate-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css';
        document.head.appendChild(link);
      }
    };

    // Add custom SweetAlert styles
    const addCustomStyles = () => {
      if (typeof document !== 'undefined' && !document.querySelector('#swal-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'swal-custom-styles';
        style.textContent = `
          /* Enhanced SweetAlert2 Styles */
          .swal2-popup {
            border-radius: 16px !important;
            backdrop-filter: blur(10px) !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
          }
          
          .swal2-title {
            font-weight: 700 !important;
            margin-bottom: 1rem !important;
          }
          
          .swal2-html-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .swal2-timer-progress-bar {
            height: 4px !important;
            border-radius: 2px !important;
          }
          
          .swal2-icon {
            margin: 1rem auto !important;
          }
          
          /* Custom animations for different alert types */
          .swal2-show.animate__bounceIn {
            animation: animate__bounceIn 0.6s ease-out !important;
          }
          
          .swal2-show.animate__slideInRight {
            animation: animate__slideInRight 0.5s ease-out !important;
          }
          
          .swal2-show.animate__rotateIn {
            animation: animate__rotateIn 0.6s ease-out !important;
          }
          
          .swal2-show.animate__flipInX {
            animation: animate__flipInX 0.6s ease-out !important;
          }
          
          .swal2-show.animate__zoomIn {
            animation: animate__zoomIn 0.5s ease-out !important;
          }
          
          .swal2-hide.animate__fadeOutUp {
            animation: animate__fadeOutUp 0.4s ease-in !important;
          }
          
          .swal2-hide.animate__slideOutRight {
            animation: animate__slideOutRight 0.4s ease-in !important;
          }
          
          .swal2-hide.animate__rotateOut {
            animation: animate__rotateOut 0.4s ease-in !important;
          }
          
          .swal2-hide.animate__flipOutX {
            animation: animate__flipOutX 0.4s ease-in !important;
          }
          
          .swal2-hide.animate__zoomOut {
            animation: animate__zoomOut 0.4s ease-in !important;
          }
          
          /* Responsive design */
          @media (max-width: 768px) {
            .swal2-popup {
              width: 90% !important;
              margin: 0 auto !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    };
    
    // Try to dynamically import SweetAlert2
    const initializeSweetAlert = async () => {
      try {
        // Add CSS dependencies first
        addAnimateCSS();
        addCustomStyles();
        
        const module = await import('sweetalert2');
        if (typeof window !== 'undefined') {
          (window as any).Swal = module.default;
        }
      } catch (error) {
        console.warn('SweetAlert2 could not be loaded. Using enhanced fallback alerts.');
        // Enhanced fallback with better formatting
        if (typeof window !== 'undefined') {
          const createFallbackAlert = (options: any) => {
            const iconEmojis: Record<string, string> = {
              'success': '🎉',
              'error': '❌',
              'warning': '⚠️',
              'info': 'ℹ️',
              'question': '❓'
            };
            const iconEmoji = iconEmojis[options.icon] || '';
            
            let message = `${iconEmoji} ${options.title}`;
            if (options.text) message += `\n\n${options.text}`;
            if (options.html) {
              // Strip HTML tags for fallback
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = options.html;
              message += `\n\n${tempDiv.textContent || tempDiv.innerText || ''}`;
            }
            
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
              fire: createFallbackAlert,
              showLoading: () => {},
              stopTimer: () => {},
              resumeTimer: () => {}
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
