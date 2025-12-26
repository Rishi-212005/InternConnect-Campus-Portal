import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import type { Database } from '@/integrations/supabase/types';
import {
  Home,
  User,
  Briefcase,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  Users,
  CheckCircle,
  ClipboardList,
  Building2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Code,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const roleNavItems: Record<AppRole, NavItem[]> = {
  student: [
    { icon: Home, label: 'Dashboard', path: '/student' },
    { icon: User, label: 'My Profile', path: '/student/profile' },
    { icon: UserCheck, label: 'My Mentor', path: '/student/mentor' },
    { icon: Briefcase, label: 'Jobs', path: '/student/jobs' },
    { icon: FileText, label: 'Applications', path: '/student/applications' },
    { icon: Code, label: 'Exams', path: '/student/exams' },
    { icon: Calendar, label: 'Schedule', path: '/student/schedule' },
  ],
  recruiter: [
    { icon: Home, label: 'Dashboard', path: '/recruiter' },
    { icon: Briefcase, label: 'Job Postings', path: '/recruiter/jobs' },
    { icon: Users, label: 'Candidates', path: '/recruiter/candidates' },
    { icon: Calendar, label: 'Interviews', path: '/recruiter/interviews' },
    { icon: BarChart3, label: 'Analytics', path: '/recruiter/analytics' },
  ],
  placement: [
    { icon: Home, label: 'Dashboard', path: '/placement' },
    { icon: BarChart3, label: 'Analytics', path: '/placement/analytics' },
    { icon: CheckCircle, label: 'Verifications', path: '/placement/verifications' },
    { icon: UserCheck, label: 'User Approvals', path: '/placement/mentors' },
    { icon: Users, label: 'Candidates', path: '/placement/candidates' },
    { icon: Code, label: 'Assessments', path: '/placement/assessments' },
    { icon: Calendar, label: 'Interviews', path: '/placement/interviews' },
    { icon: Building2, label: 'Companies', path: '/placement/companies' },
    { icon: ClipboardList, label: 'Reports', path: '/placement/reports' },
  ],
  faculty: [
    { icon: Home, label: 'Dashboard', path: '/faculty' },
    { icon: Users, label: 'My Mentees', path: '/faculty/mentees' },
    { icon: Users, label: 'All Students', path: '/faculty/students' },
    { icon: ClipboardList, label: 'Approvals', path: '/faculty/approvals' },
    { icon: BarChart3, label: 'Progress', path: '/faculty/progress' },
  ],
  admin: [
    { icon: Home, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Shield, label: 'Compliance', path: '/admin/compliance' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ],
};

const DashboardSidebar: React.FC = () => {
  const { role, signOut } = useSupabaseAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (!role) return null;

  const navItems = roleNavItems[role];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-sidebar sticky top-0 flex flex-col shadow-xl z-20"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center flex-shrink-0"
        >
          <Rocket className="w-5 h-5 text-accent-foreground" />
        </motion.div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-heading font-bold text-xl text-sidebar-foreground"
            >
              CodeCrew
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-sidebar-primary')} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 w-1 h-8 bg-sidebar-primary rounded-r-full"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-3"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Collapse button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ml-2"
                  >
                    Collapse
                  </motion.span>
                )}
              </AnimatePresence>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
