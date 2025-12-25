import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Building2,
  LayoutDashboard,
  BookOpen,
  Shield,
} from 'lucide-react';
import HeroSection from '@/components/landing/HeroSection';
import RoleCard from '@/components/landing/RoleCard';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roles: { role: AppRole; title: string; description: string; icon: typeof GraduationCap; features: string[]; color: string }[] = [
  {
    role: 'student',
    title: 'Student',
    description: 'Discover opportunities and build your career',
    icon: GraduationCap,
    features: ['AI-powered job matching', 'Digital profile & badges', 'One-click applications', 'Interview scheduler'],
    color: 'bg-accent',
  },
  {
    role: 'recruiter',
    title: 'Recruiter',
    description: 'Find and hire top campus talent',
    icon: Building2,
    features: ['Post job opportunities', 'Smart candidate filtering', 'Shortlist management', 'Feedback logging'],
    color: 'bg-primary',
  },
  {
    role: 'placement',
    title: 'Placement Cell',
    description: 'Manage campus placements efficiently',
    icon: LayoutDashboard,
    features: ['Analytics dashboard', 'Partner verification', 'Application tracking', 'Compliance reports'],
    color: 'bg-success',
  },
  {
    role: 'faculty',
    title: 'Faculty Mentor',
    description: 'Guide students to success',
    icon: BookOpen,
    features: ['Approval workflow', 'Student progress tracking', 'Mentorship tools', 'Academic integration'],
    color: 'bg-warning',
  },
  {
    role: 'admin',
    title: 'Administrator',
    description: 'System oversight and compliance',
    icon: Shield,
    features: ['User verification', 'System configuration', 'Audit logs', 'Role management'],
    color: 'bg-primary-light',
  },
];

const Index: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />

      <section className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4">
            Built for Every Role
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose your role to access a tailored dashboard with features designed for your needs.
          </p>
          <Button 
            size="lg" 
            className="gradient-accent shadow-glow"
            onClick={handleGetStarted}
          >
            Get Started - Sign Up Now
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {roles.map((roleData, index) => (
            <RoleCard
              key={roleData.role}
              {...roleData}
              onSelect={() => navigate('/auth')}
              delay={0.1 * index}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 CodeCrew. Campus-Centric Internship & Placement Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
