import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  User,
  Phone,
  Mail,
  GraduationCap,
  Code,
  Loader2,
  CheckCircle,
  X,
  Briefcase,
  Star,
  Link,
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    company_name: string;
    required_skills?: string[] | null;
    min_cgpa?: number | null;
  };
  userId: string;
  onSubmit: (jobId: string) => Promise<void>;
}

const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  job,
  userId,
  onSubmit,
}) => {
  const { profile, studentProfile, uploadResume, updateStudentProfile, updateProfile } = useProfile(userId);
  const { toast } = useToast();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    roll_number: studentProfile?.roll_number || '',
    department: studentProfile?.department || '',
    cgpa: studentProfile?.cgpa?.toString() || '',
    skills: studentProfile?.skills || [] as string[],
    linkedin_url: studentProfile?.linkedin_url || '',
    github_url: studentProfile?.github_url || '',
    cover_letter: '',
  });

  const [newSkill, setNewSkill] = useState('');

  React.useEffect(() => {
    if (profile && studentProfile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        roll_number: studentProfile.roll_number || '',
        department: studentProfile.department || '',
        cgpa: studentProfile.cgpa?.toString() || '',
        skills: studentProfile.skills || [],
        linkedin_url: studentProfile.linkedin_url || '',
        github_url: studentProfile.github_url || '',
        cover_letter: '',
      });
    }
  }, [profile, studentProfile]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingResume(true);
      await uploadResume(file);
      setIsUploadingResume(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.full_name.trim()) {
          toast({ title: 'Error', description: 'Full name is required', variant: 'destructive' });
          return false;
        }
        if (!formData.phone.trim()) {
          toast({ title: 'Error', description: 'Phone number is required', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!formData.department.trim()) {
          toast({ title: 'Error', description: 'Department is required', variant: 'destructive' });
          return false;
        }
        if (!formData.cgpa.trim()) {
          toast({ title: 'Error', description: 'CGPA is required', variant: 'destructive' });
          return false;
        }
        if (job.min_cgpa && parseFloat(formData.cgpa) < job.min_cgpa) {
          toast({ 
            title: 'CGPA Requirement Not Met', 
            description: `Minimum CGPA of ${job.min_cgpa} is required for this position.`, 
            variant: 'destructive' 
          });
          return false;
        }
        return true;
      case 3:
        if (!studentProfile?.resume_url) {
          toast({ title: 'Error', description: 'Please upload your resume', variant: 'destructive' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setIsSubmitting(true);
    
    try {
      // Save profile updates
      await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
      });
      
      await updateStudentProfile({
        roll_number: formData.roll_number || null,
        department: formData.department || null,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
        linkedin_url: formData.linkedin_url || null,
        github_url: formData.github_url || null,
        skills: formData.skills.length > 0 ? formData.skills : null,
      });
      
      // Submit application
      await onSubmit(job.id);
      onClose();
      setStep(1);
    } catch (error) {
      console.error('Application error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Apply for {job.title}
          </DialogTitle>
          <DialogDescription>
            {job.company_name} • Complete your application
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Personal Details */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Personal Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile?.email}</span>
                  <Badge variant="secondary" className="ml-auto">Verified</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub URL</Label>
                  <Input
                    id="github"
                    value={formData.github_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Academic Details */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Academic Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roll_number">Roll Number</Label>
                  <Input
                    id="roll_number"
                    value={formData.roll_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
                    placeholder="e.g., CS2024001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cgpa">
                  CGPA (out of 10) *
                  {job.min_cgpa && (
                    <span className="text-muted-foreground ml-2">(Min required: {job.min_cgpa})</span>
                  )}
                </Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={formData.cgpa}
                  onChange={(e) => setFormData(prev => ({ ...prev, cgpa: e.target.value }))}
                  placeholder="e.g., 8.5"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddSkill}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-2">Required Skills for this position:</p>
                  <div className="flex flex-wrap gap-1">
                    {job.required_skills.map(skill => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Resume & Submit */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Resume & Documents
              </h3>
              
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {studentProfile?.resume_url ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium">Resume Uploaded</p>
                      <p className="text-sm text-muted-foreground">Your resume is ready for submission</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium">Upload Your Resume *</p>
                    <p className="text-sm text-muted-foreground mb-3">PDF, DOC, or DOCX (Max 5MB)</p>
                    <Button
                      onClick={() => resumeInputRef.current?.click()}
                      disabled={isUploadingResume}
                    >
                      {isUploadingResume ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Select File</>
                      )}
                    </Button>
                  </div>
                )}
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cover_letter">Cover Letter (Optional)</Label>
                <Textarea
                  id="cover_letter"
                  value={formData.cover_letter}
                  onChange={(e) => setFormData(prev => ({ ...prev, cover_letter: e.target.value }))}
                  placeholder="Tell us why you're interested in this position..."
                  rows={4}
                />
              </div>
              
              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">Application Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{formData.full_name}</span>
                  <span className="text-muted-foreground">Department:</span>
                  <span>{formData.department}</span>
                  <span className="text-muted-foreground">CGPA:</span>
                  <span>{formData.cgpa}</span>
                  <span className="text-muted-foreground">Skills:</span>
                  <span>{formData.skills.length} skills added</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button 
              variant="accent" 
              onClick={handleSubmit}
              disabled={isSubmitting || !studentProfile?.resume_url}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                'Submit Application'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationModal;
