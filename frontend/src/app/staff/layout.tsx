import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="staff">
      {children}
    </DashboardLayout>
  );
}
