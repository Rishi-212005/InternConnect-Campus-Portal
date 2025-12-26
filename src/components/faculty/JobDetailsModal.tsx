import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  Briefcase,
  X,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    title: string;
    company_name: string;
    description?: string | null;
    location?: string | null;
    job_type?: string | null;
    salary_min?: number | null;
    salary_max?: number | null;
    min_cgpa?: number | null;
    required_skills?: string[] | null;
    deadline?: string | null;
    created_at?: string;
  } | null;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ isOpen, onClose, job }) => {
  if (!job) return null;

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
    if (min) return `From ₹${min.toLocaleString()}`;
    return `Up to ₹${max?.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Job Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="w-4 h-4" />
              <span className="font-medium">{job.company_name}</span>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card variant="glass">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Location</span>
                </div>
                <p className="font-medium text-foreground">{job.location || 'Not specified'}</p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Job Type</span>
                </div>
                <p className="font-medium text-foreground">{job.job_type || 'Full-time'}</p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Salary</span>
                </div>
                <p className="font-medium text-foreground">
                  {formatSalary(job.salary_min, job.salary_max)}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-sm">Min CGPA</span>
                </div>
                <p className="font-medium text-foreground">
                  {job.min_cgpa ? `${job.min_cgpa} / 10` : 'No requirement'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Deadline */}
          {job.deadline && (
            <Card variant="glass">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Application Deadline</span>
                </div>
                <p className="font-medium text-foreground">
                  {format(new Date(job.deadline), 'MMMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {job.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Job Description</h3>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>
          )}

          {/* Required Skills */}
          {job.required_skills && job.required_skills.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.required_skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailsModal;
