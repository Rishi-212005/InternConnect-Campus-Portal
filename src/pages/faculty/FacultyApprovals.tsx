import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Loader2, 
  User, 
  Briefcase,
  Clock,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useApplications } from '@/hooks/useApplications';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import StudentProfileModal from '@/components/faculty/StudentProfileModal';
import JobDetailsModal from '@/components/faculty/JobDetailsModal';

const FacultyApprovals: React.FC = () => {
  const { user, role } = useSupabaseAuthContext();
  const { applications, isLoading, updateApplicationStatus } = useApplications(role, user?.id);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; appId: string | null }>({ 
    open: false, 
    appId: null 
  });
  const [rejectNotes, setRejectNotes] = useState('');
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);

  const pendingApplications = applications.filter(app => app.status === 'pending');

  const handleApprove = async (id: string) => {
    if (!user) return;
    setProcessingId(id);
    await updateApplicationStatus(id, 'faculty_approved', user.id);
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!user || !rejectDialog.appId) return;
    setProcessingId(rejectDialog.appId);
    await updateApplicationStatus(rejectDialog.appId, 'faculty_rejected', user.id, rejectNotes);
    setProcessingId(null);
    setRejectDialog({ open: false, appId: null });
    setRejectNotes('');
  };

  const stats = {
    pending: pendingApplications.length,
    approvedToday: applications.filter(a => 
      a.status === 'faculty_approved' && 
      a.faculty_approved_at && 
      new Date(a.faculty_approved_at).toDateString() === new Date().toDateString()
    ).length,
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
      >
        <h1 className="text-3xl font-heading font-bold text-foreground">Pending Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve student job applications</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.approvedToday}</p>
            <p className="text-sm text-muted-foreground">Approved Today</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{applications.length}</p>
            <p className="text-sm text-muted-foreground">Total Reviewed</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Applications Awaiting Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApplications.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No pending applications to review
                </p>
              </div>
            ) : (
              pendingApplications.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {app.student_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <p className="font-semibold text-foreground">
                          {app.student_profile?.full_name || 'Unknown Student'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {app.jobs?.title || 'Unknown Position'} at {app.jobs?.company_name || 'Unknown Company'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied: {format(new Date(app.created_at), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setViewingStudent({
                          full_name: app.student_profile?.full_name || 'Unknown',
                          email: app.student_profile?.email || '',
                          phone: app.student_profile?.phone,
                          department: app.student_profile?.department,
                          cgpa: app.student_profile?.cgpa,
                          skills: app.student_profile?.skills,
                          resume_url: app.student_profile?.resume_url,
                          roll_number: app.student_profile?.roll_number,
                          year_of_study: app.student_profile?.year_of_study,
                          linkedin_url: app.student_profile?.linkedin_url,
                          github_url: app.student_profile?.github_url,
                        })}
                      >
                        <User className="w-4 h-4 mr-1" />
                        Student
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setViewingJob({
                          title: app.jobs?.title,
                          company_name: app.jobs?.company_name,
                          description: app.jobs?.description,
                          location: app.jobs?.location,
                          job_type: app.jobs?.job_type,
                          salary_min: app.jobs?.salary_min,
                          salary_max: app.jobs?.salary_max,
                          min_cgpa: app.jobs?.min_cgpa,
                          required_skills: app.jobs?.required_skills,
                          deadline: app.jobs?.deadline,
                        })}
                      >
                        <Briefcase className="w-4 h-4 mr-1" />
                        Job
                      </Button>
                      <Button 
                        size="sm" 
                        variant="accent"
                        disabled={processingId === app.id}
                        onClick={() => handleApprove(app.id)}
                      >
                        {processingId === app.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setRejectDialog({ open: true, appId: app.id })}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, appId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this application. This will be visible to the student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, appId: null })}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={processingId === rejectDialog.appId}
              >
                {processingId === rejectDialog.appId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Reject Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Profile Modal */}
      {viewingStudent && (
        <StudentProfileModal
          isOpen={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          student={viewingStudent}
        />
      )}

      {/* Job Details Modal */}
      <JobDetailsModal
        isOpen={!!viewingJob}
        onClose={() => setViewingJob(null)}
        job={viewingJob}
      />
    </div>
  );
};

export default FacultyApprovals;
