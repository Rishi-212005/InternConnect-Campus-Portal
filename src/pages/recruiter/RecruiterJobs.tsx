import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Clock,
  MapPin,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import JobPostingForm from '@/components/recruiter/JobPostingForm';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const RecruiterJobs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [editingJob, setEditingJob] = useState<any>(null);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const { user } = useSupabaseAuthContext();
  const { jobs, isLoading, deleteJob, updateJob, fetchJobs } = useJobs();
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});

  // Filter to only show recruiter's own jobs
  const recruiterJobs = jobs.filter(job => job.recruiter_id === user?.id);

  const filteredJobs = recruiterJobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch company name from recruiter profile
  useEffect(() => {
    const fetchRecruiterProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('recruiter_profiles')
        .select('company_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setCompanyName(data.company_name);
      }
    };
    fetchRecruiterProfile();
  }, [user]);

  // Fetch application counts for each job
  useEffect(() => {
    const fetchApplicationCounts = async () => {
      if (recruiterJobs.length === 0) return;
      
      const counts: Record<string, number> = {};
      for (const job of recruiterJobs) {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', job.id);
        counts[job.id] = count || 0;
      }
      setApplicationCounts(counts);
    };
    fetchApplicationCounts();
  }, [recruiterJobs.length]);

  const stats = {
    total: recruiterJobs.length,
    active: recruiterJobs.filter(j => j.status === 'active').length,
    pending: recruiterJobs.filter(j => j.status === 'pending_verification').length,
    totalApplications: Object.values(applicationCounts).reduce((a, b) => a + b, 0),
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      await deleteJob(id);
    }
  };

  const handleEdit = async () => {
    if (!editingJob) return;
    await updateJob(editingJob.id, {
      title: editingJob.title,
      description: editingJob.description,
      location: editingJob.location,
    });
    setEditingJob(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending_verification: 'bg-yellow-100 text-yellow-700',
      closed: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700',
    };
    return config[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Job Postings</h1>
          <p className="text-muted-foreground mt-1">Manage your job listings</p>
        </div>
        <Button variant="accent" className="gap-2" onClick={() => setShowJobForm(true)}>
          <Plus className="w-4 h-4" />
          Post New Job
        </Button>
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
            <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Postings</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Clock className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending Verification</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{stats.totalApplications}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search job postings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Job Listings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="elevated">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No job postings yet</p>
                <Button variant="accent" className="mt-4" onClick={() => setShowJobForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-muted-foreground">Position</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Applications</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 * index }}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-foreground">{job.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Posted {format(new Date(job.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {job.location || 'Not specified'}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{job.job_type}</Badge>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-foreground">
                          {applicationCounts[job.id] || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusBadge(job.status || '')}>
                          {job.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setViewingJob(job)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingJob(job)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(job.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Job Posting Form */}
      <JobPostingForm
        open={showJobForm}
        onOpenChange={(open) => {
          setShowJobForm(open);
          if (!open) fetchJobs();
        }}
        companyName={companyName || 'Your Company'}
      />

      {/* View Job Dialog */}
      <Dialog open={!!viewingJob} onOpenChange={() => setViewingJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingJob?.title}</DialogTitle>
            <DialogDescription>{viewingJob?.company_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{viewingJob?.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Job Type</p>
                <p className="font-medium">{viewingJob?.job_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salary Range</p>
                <p className="font-medium">
                  {viewingJob?.salary_min && viewingJob?.salary_max 
                    ? `$${viewingJob.salary_min.toLocaleString()} - $${viewingJob.salary_max.toLocaleString()}`
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Min CGPA</p>
                <p className="font-medium">{viewingJob?.min_cgpa || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-foreground">{viewingJob?.description || 'No description'}</p>
            </div>
            {viewingJob?.required_skills && viewingJob.required_skills.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {viewingJob.required_skills.map((skill: string) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={() => setEditingJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Title</label>
              <Input
                value={editingJob?.title || ''}
                onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Location</label>
              <Input
                value={editingJob?.location || ''}
                onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <Textarea
                value={editingJob?.description || ''}
                onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingJob(null)}>Cancel</Button>
              <Button variant="accent" onClick={handleEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterJobs;
