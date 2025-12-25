import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Building2, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { useApplications } from '@/hooks/useApplications';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  faculty_approved: { label: 'Faculty Approved', color: 'bg-blue-100 text-blue-700', icon: UserCheck },
  faculty_rejected: { label: 'Faculty Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700', icon: FileText },
  shortlisted: { label: 'Shortlisted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  interview: { label: 'Interview', color: 'bg-purple-100 text-purple-700', icon: Calendar },
  selected: { label: 'Selected', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const StudentApplications: React.FC = () => {
  const { user, role } = useSupabaseAuthContext();
  const { applications, isLoading } = useApplications(role, user?.id);

  const stats = {
    total: applications.length,
    active: applications.filter(a => !['selected', 'rejected', 'faculty_rejected'].includes(a.status || '')).length,
    interviews: applications.filter(a => a.status === 'interview').length,
    offers: applications.filter(a => a.status === 'selected').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground mt-1">Track your job application status</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.interviews}</p>
            <p className="text-sm text-muted-foreground">Interviews</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.offers}</p>
            <p className="text-sm text-muted-foreground">Offers</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Applications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Application History</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No applications yet</p>
                <p className="text-sm text-muted-foreground mt-1">Browse jobs and start applying!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app, index) => {
                  const status = statusConfig[app.status || 'pending'];
                  const StatusIcon = status?.icon || Clock;
                  
                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {app.jobs?.title || 'Job Title'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {app.jobs?.company_name || 'Company'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied: {format(new Date(app.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge className={status?.color || 'bg-gray-100 text-gray-700'}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status?.label || 'Unknown'}
                          </Badge>
                          {app.faculty_notes && (
                            <p className="text-xs text-muted-foreground mt-2 max-w-xs truncate">
                              Note: {app.faculty_notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StudentApplications;
