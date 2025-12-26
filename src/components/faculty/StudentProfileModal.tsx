import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Code,
  FileText,
  Github,
  Linkedin,
  Download,
  ExternalLink,
  Star,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    full_name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
    roll_number?: string | null;
    department?: string | null;
    year_of_study?: number | null;
    cgpa?: number | null;
    skills?: string[] | null;
    resume_url?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
  };
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const initials = student.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';
  const [isLoadingResume, setIsLoadingResume] = useState(false);

  const handleDownloadResume = async () => {
    if (!student.resume_url) return;
    
    setIsLoadingResume(true);
    
    try {
      let filePath = student.resume_url;
      
      // If it's a full Supabase URL, extract the path
      if (student.resume_url.includes('/storage/v1/object/')) {
        const match = student.resume_url.match(/\/resumes\/(.+)$/);
        if (match) {
          filePath = match[1];
        }
      }
      
      // Check if it's an external URL (not a storage path)
      if (student.resume_url.startsWith('http') && !student.resume_url.includes('supabase')) {
        window.open(student.resume_url, '_blank');
        return;
      }
      
      // Get a signed URL for the private resumes bucket
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error getting signed URL:', error);
        throw error;
      }
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening resume:', error);
    } finally {
      setIsLoadingResume(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Student Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <Avatar className="w-20 h-20">
              <AvatarImage src={student.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{student.full_name}</h2>
              <p className="text-muted-foreground">
                {student.department || 'Department N/A'}{student.year_of_study ? `, Year ${student.year_of_study}` : ''}
              </p>
              {student.roll_number && (
                <Badge variant="secondary" className="mt-2">
                  {student.roll_number}
                </Badge>
              )}
            </div>
            {student.cgpa && (
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{student.cgpa}</div>
                <div className="text-sm text-muted-foreground">CGPA</div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{student.email}</span>
                </div>
                {student.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{student.phone}</span>
                  </div>
                )}
                {student.linkedin_url && (
                  <a
                    href={student.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn Profile
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {student.github_url && (
                  <a
                    href={student.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-700 hover:underline"
                  >
                    <Github className="w-4 h-4" />
                    GitHub Profile
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Academic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{student.department || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Year of Study</p>
                  <p className="font-medium">{student.year_of_study ? `Year ${student.year_of_study}` : 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roll Number</p>
                  <p className="font-medium">{student.roll_number || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CGPA</p>
                  <p className="font-medium text-green-600">{student.cgpa ? `${student.cgpa} / 10` : 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                Skills
              </h3>
              {student.skills && student.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No skills listed</p>
              )}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Resume
              </h3>
              {student.resume_url ? (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-medium">Resume</p>
                      <p className="text-sm text-muted-foreground">Click to view or download</p>
                    </div>
                  </div>
                  <Button onClick={handleDownloadResume} variant="outline" className="gap-2" disabled={isLoadingResume}>
                    {isLoadingResume ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    View Resume
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No resume uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentProfileModal;
