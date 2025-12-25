import React from 'react';
import { motion } from 'framer-motion';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import DashboardSidebar from './DashboardSidebar';
import TopNavbar from './TopNavbar';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSupabaseAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-6 overflow-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};

export default DashboardLayout;
