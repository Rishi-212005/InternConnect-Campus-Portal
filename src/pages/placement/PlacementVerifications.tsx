import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  Loader2,
  Briefcase,
  MapPin,
  DollarSign,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PlacementVerifications: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { jobs, isLoading, verifyJob } = useJobs('pending_verification');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);

  const handleVerify = async (id: string, approve: boolean) => {
    if (!user) return;
    setProcessingId(id);
    await verifyJob(id, user.id, approve);
    setProcessingId(null);
  };

  const pendingJobs = jobs.filter(job => job.status === 'pending_verification');

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
        <h1 className="text-3xl font-heading font-bold text-foreground">Job Verifications</h1>
        <p className="text-muted-foreground mt-1">Review and approve job postings from recruiters</p>
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
            <p className="text-3xl font-bold text-foreground">{pendingJobs.length}</p>
            <p className="text-sm text-muted-foreground">Pending Verification</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {jobs.filter(j => j.status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{jobs.length}</p>
            <p className="text-sm text-muted-foreground">Total Jobs</p>
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
              Pending Verifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingJobs.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No pending job verifications
                </p>
              </div>
            ) : (
              pendingJobs.map((job, index) => (
                <motion.div
                  key={job.id}
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
                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.company_name}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {job.job_type}
                        </span>
                        {job.salary_min && job.salary_max && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${(job.salary_min / 1000).toFixed(0)}K - ${(job.salary_max / 1000).toFixed(0)}K
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {format(new Date(job.created_at), 'MMM dd, yyyy h:mm a')}
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
                        onClick={() => setViewingJob(job)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="accent"
                        disabled={processingId === job.id}
                        onClick={() => handleVerify(job.id, true)}
                      >
                        {processingId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-500 hover:text-red-600"
                        disabled={processingId === job.id}
                        onClick={() => handleVerify(job.id, false)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Job Dialog */}
      <Dialog open={!!viewingJob} onOpenChange={() => setViewingJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingJob?.title}</DialogTitle>
            <DialogDescription>{viewingJob?.company_name}</DialogDescription>
          </DialogHeader>
          {viewingJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{viewingJob.location || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Job Type</p>
                  <p className="font-medium">{viewingJob.job_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salary Range</p>
                  <p className="font-medium">
                    {viewingJob.salary_min && viewingJob.salary_max 
                      ? `$${viewingJob.salary_min.toLocaleString()} - $${viewingJob.salary_max.toLocaleString()}`
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Min CGPA</p>
                  <p className="font-medium">{viewingJob.min_cgpa || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-medium">
                    {viewingJob.deadline 
                      ? format(new Date(viewingJob.deadline), 'MMM dd, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground whitespace-pre-wrap">
                  {viewingJob.description || 'No description provided'}
                </p>
              </div>

              {viewingJob.required_skills && viewingJob.required_skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingJob.required_skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="text-red-500"
                  onClick={() => {
                    handleVerify(viewingJob.id, false);
                    setViewingJob(null);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  variant="accent"
                  onClick={() => {
                    handleVerify(viewingJob.id, true);
                    setViewingJob(null);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Publish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementVerifications;
