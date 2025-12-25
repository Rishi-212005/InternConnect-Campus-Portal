import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Import sub-pages
import AdminHome from './AdminHome';
import AdminUsers from './AdminUsers';
import AdminCompliance from './AdminCompliance';
import AdminSettings from './AdminSettings';

const AdminDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdminHome />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="compliance" element={<AdminCompliance />} />
        <Route path="settings" element={<AdminSettings />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminDashboard;
