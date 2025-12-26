import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  Camera,
  Edit,
  Building,
  Briefcase,
  BadgeCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FacultyProfileData {
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  is_approved: boolean | null;
}

const FacultyProfile: React.FC = () => {
  const { user, profile, refetchUserData } = useSupabaseAuthContext();
  const { toast } = useToast();
  
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [menteeCount, setMenteeCount] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    department: '',
    designation: '',
    employee_id: '',
  });

  useEffect(() => {
    const fetchFacultyProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { data: faculty } = await supabase
          .from('faculty_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setFacultyProfile(faculty);
        
        // Get mentee count
        const { count } = await supabase
          .from('mentor_requests')
          .select('*', { count: 'exact', head: true })
          .eq('mentor_id', user.id)
          .eq('status', 'approved');
        
        setMenteeCount(count || 0);
      } catch (error) {
        console.error('Error fetching faculty profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFacultyProfile();
  }, [user?.id]);

  useEffect(() => {
    if (profile && facultyProfile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        department: facultyProfile.department || '',
        designation: facultyProfile.designation || '',
        employee_id: facultyProfile.employee_id || '',
      });
    }
  }, [profile, facultyProfile]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    
    try {
      // Update general profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
        })
        .eq('user_id', user.id);
      
      if (profileError) throw profileError;
      
      // Update faculty profile
      const { error: facultyError } = await supabase
        .from('faculty_profiles')
        .update({
          department: formData.department || null,
          designation: formData.designation || null,
          employee_id: formData.employee_id || null,
        })
        .eq('user_id', user.id);
      
      if (facultyError) throw facultyError;
      
      // Refresh profile data
      refetchUserData();
      
      // Update local state
      setFacultyProfile(prev => prev ? {
        ...prev,
        department: formData.department || null,
        designation: formData.designation || null,
        employee_id: formData.employee_id || null,
      } : null);
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);
      
      refetchUserData();
      
      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'F';
  const profileCompletion = [
    profile?.full_name,
    profile?.phone,
    facultyProfile?.department,
    facultyProfile?.designation,
    facultyProfile?.employee_id,
    profile?.avatar_url,
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
          <p className="text-muted-foreground mt-1">Manage your faculty profile information</p>
        </div>
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
                {facultyProfile?.designation || 'Faculty Member'}
              </p>
              
              <div className="mt-4 flex justify-center gap-2">
                {facultyProfile?.is_approved ? (
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    Pending Approval
                  </Badge>
                )}
              </div>
              
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" />
                  {facultyProfile?.department || 'Department not set'}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profile Completion</span>
                  <span className="font-medium text-foreground">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Professional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Employee ID</Label>
                {isEditing ? (
                  <Input
                    value={formData.employee_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                    placeholder="e.g., FAC2024001"
                  />
                ) : (
                  <p className="font-medium">{facultyProfile?.employee_id || 'Not set'}</p>
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
                  <p className="font-medium">{facultyProfile?.department || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                {isEditing ? (
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g., Associate Professor"
                  />
                ) : (
                  <p className="font-medium">{facultyProfile?.designation || 'Not set'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Mentoring Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent/10 rounded-lg text-center">
                <p className="text-4xl font-bold text-accent">{menteeCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Active Mentees</p>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Students under your mentorship benefit from your guidance in their placement journey.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default FacultyProfile;
