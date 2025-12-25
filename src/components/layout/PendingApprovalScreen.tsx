import React from 'react';
import { motion } from 'framer-motion';
import { Clock, LogOut, Mail, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PendingApprovalScreenProps {
  title: string;
  description: string;
  roleType: 'faculty' | 'student';
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  title,
  description,
  roleType,
}) => {
  const { signOut, profile } = useSupabaseAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: 'Error', description: 'Failed to logout', variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card variant="elevated" className="text-center">
          <CardHeader className="pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mb-4"
            >
              <Clock className="w-10 h-10 text-warning" />
            </motion.div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Account Under Review</p>
                  <p className="text-xs text-muted-foreground">
                    {roleType === 'faculty' 
                      ? 'The placement cell will verify your faculty credentials.'
                      : 'The placement cell will verify your student profile.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Mail className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Email Notification</p>
                  <p className="text-xs text-muted-foreground">
                    You'll receive an email at <span className="font-medium">{profile?.email}</span> once approved.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-4">
                This usually takes 1-2 business days. Please check back later.
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PendingApprovalScreen;
