'use client';

import { useEffect } from 'react';
import useSweetAlert2 from '../hooks/useSweetAlert2';

export default function SweetAlertTest() {
  const swal = useSweetAlert2();

  useEffect(() => {
    if (swal.isLoaded) {
      // Test a simple alert
      swal.success('Success!', 'SweetAlert2 is working correctly!');
      
      // Test a confirmation dialog after a delay
      setTimeout(async () => {
        const confirmed = await swal.confirm('Confirmation', 'Do you want to see a toast notification?');
        if (confirmed) {
          swal.toast('Here is a toast notification!');
        }
      }, 2000);
    }
  }, [swal.isLoaded]);

  return null; // This component doesn't render anything visible
}
