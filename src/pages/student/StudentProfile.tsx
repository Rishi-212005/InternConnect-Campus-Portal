import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Upload,
  Save,
  FileText,
  Award,
  Star,
  Loader2,
  Camera,
  Code,
  CheckCircle,
  Download,
  Share2,
  Edit,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile';

const StudentProfile: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { 
    profile, 
    studentProfile, 
    isLoading, 
    updateProfile, 
    updateStudentProfile,
    uploadAvatar,
    uploadResume,
    fetchProfile
  } = useProfile(user?.id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    roll_number: '',
    department: '',
    year_of_study: '',
    cgpa: '',
    linkedin_url: '',
    github_url: '',
    skills: [] as string[],
  });

  const [newSkill, setNewSkill] = useState('');

  React.useEffect(() => {
    if (profile && studentProfile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        roll_number: studentProfile.roll_number || '',
        department: studentProfile.department || '',
        year_of_study: studentProfile.year_of_study?.toString() || '',
        cgpa: studentProfile.cgpa?.toString() || '',
        linkedin_url: studentProfile.linkedin_url || '',
        github_url: studentProfile.github_url || '',
        skills: studentProfile.skills || [],
      });
    }
  }, [profile, studentProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    
    const profileResult = await updateProfile({
      full_name: formData.full_name,
      phone: formData.phone || null,
    });
    
    const studentResult = await updateStudentProfile({
      roll_number: formData.roll_number || null,
      department: formData.department || null,
      year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
      cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
      skills: formData.skills.length > 0 ? formData.skills : null,
    });
    
    // Refetch to ensure we have latest data
    if (!profileResult.error && !studentResult.error) {
      await fetchProfile();
    }
    
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadResume(file);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';
  const profileCompletion = [
    profile?.full_name,
    profile?.phone,
    studentProfile?.department,
    studentProfile?.cgpa,
    studentProfile?.skills?.length,
    studentProfile?.resume_url,
  ].filter(Boolean).length * 16;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your verifiable digital profile</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button 
            variant={isEditing ? 'accent' : 'outline'}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : isEditing ? (
              <><Save className="w-4 h-4" /> Save Changes</>
            ) : (
              <><Edit className="w-4 h-4" /> Edit Profile</>
            )}
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated" className="h-full">
            <CardContent className="pt-6 text-center">
              <div className="relative mx-auto w-fit">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-accent text-accent-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mt-4">
                {isEditing ? (
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="text-center"
                  />
                ) : (
                  profile?.full_name || 'Your Name'
                )}
              </h2>
              <p className="text-muted-foreground">
                {studentProfile?.department || 'Department'}, Year {studentProfile?.year_of_study || '?'}
              </p>
              
              <div className="mt-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {profile?.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="h-8"
                    />
                  ) : (
                    profile?.phone || 'No phone added'
                  )}
                </div>
                {studentProfile?.linkedin_url && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Linkedin className="w-4 h-4" />
                    <a href={studentProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                      LinkedIn
                    </a>
                  </div>
                )}
                {studentProfile?.github_url && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Github className="w-4 h-4" />
                    <a href={studentProfile.github_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                      GitHub
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <span className="font-medium text-foreground">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="mt-2 h-2" />
              </div>

              {/* Resume Upload */}
              <div className="mt-4 p-4 border border-dashed border-border rounded-lg text-center">
                <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">
                  {studentProfile?.resume_url ? 'Resume uploaded ✓' : 'Upload your resume'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => resumeInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {studentProfile?.resume_url ? 'Update' : 'Upload'}
                </Button>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Academic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Roll Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.roll_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
                    placeholder="e.g., CS2024001"
                  />
                ) : (
                  <p className="font-medium">{studentProfile?.roll_number || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                {isEditing ? (
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Computer Science"
                  />
                ) : (
                  <p className="font-medium">{studentProfile?.department || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Year of Study</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.year_of_study}
                    onChange={(e) => setFormData(prev => ({ ...prev, year_of_study: e.target.value }))}
                    placeholder="e.g., 4"
                  />
                ) : (
                  <p className="font-medium">Year {studentProfile?.year_of_study || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>CGPA (out of 10)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.cgpa}
                    onChange={(e) => setFormData(prev => ({ ...prev, cgpa: e.target.value }))}
                    placeholder="e.g., 8.5"
                  />
                ) : (
                  <p className="font-medium text-green-600">{studentProfile?.cgpa ? `${studentProfile.cgpa} / 10` : 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                {isEditing ? (
                  <Input
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                ) : (
                  <p className="font-medium truncate">{studentProfile?.linkedin_url || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>GitHub</Label>
                {isEditing ? (
                  <Input
                    value={formData.github_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, github_url: e.target.value }))}
                    placeholder="https://github.com/..."
                  />
                ) : (
                  <p className="font-medium truncate">{studentProfile?.github_url || 'Not set'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-accent" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && (
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
              )}
              
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1 py-1.5 px-3">
                    <Star className="w-3 h-3" />
                    {skill}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))}
                {formData.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {isEditing ? 'Add your skills above' : 'No skills added yet'}
                  </p>
                )}
              </div>
              
              {studentProfile?.is_verified && (
                <div className="p-3 bg-success/10 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-success">Profile Verified</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentProfile;
