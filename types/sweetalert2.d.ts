// Type definitions for sweetalert2
declare module 'sweetalert2' {
  export interface SweetAlertResult {
    isConfirmed: boolean;
    isDenied: boolean;
    isDismissed: boolean;
    value?: any;
    dismiss?: string;
  }

  export interface SweetAlertOptions {
    title?: string;
    text?: string;
    icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
    showCancelButton?: boolean;
    showDenyButton?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
    denyButtonText?: string;
    toast?: boolean;
    position?: string;
    timer?: number;
    timerProgressBar?: boolean;
  }

  export interface SweetAlertStatic {
    fire(options: SweetAlertOptions): Promise<SweetAlertResult>;
    fire(title: string, text?: string, icon?: string): Promise<SweetAlertResult>;
  }

  const swal: SweetAlertStatic;
  export default swal;
}

declare global {
  interface Window {
    Swal: import('sweetalert2').SweetAlertStatic;
  }
}
