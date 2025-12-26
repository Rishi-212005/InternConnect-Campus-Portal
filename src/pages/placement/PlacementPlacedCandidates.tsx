import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2,
  Trophy,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Briefcase,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PlacedCandidate {
  id: string;
  student_id: string;
  job_id: string;
  updated_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  student_profile: {
    department: string | null;
    roll_number: string | null;
    cgpa: number | null;
  } | null;
  job: {
    title: string;
    company_name: string;
    salary_min: number | null;
    salary_max: number | null;
  } | null;
}

interface CompanyPlacement {
  company_name: string;
  job_title: string;
  job_id: string;
  candidates: PlacedCandidate[];
}

const PlacementPlacedCandidates: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [placements, setPlacements] = useState<CompanyPlacement[]>([]);
  const [totalPlaced, setTotalPlaced] = useState(0);

  useEffect(() => {
    fetchPlacedCandidates();
  }, []);

  const fetchPlacedCandidates = async () => {
    try {
      // Fetch selected applications (completed interviews > 24 hours ago)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get applications with 'selected' status
      const { data: applications, error } = await supabase
        .from('applications')
        .select('id, student_id, job_id, updated_at, status')
        .eq('status', 'selected')
        .lt('updated_at', twentyFourHoursAgo)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!applications || applications.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get job details
      const jobIds = [...new Set(applications.map(a => a.job_id))];
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_name, salary_min, salary_max')
        .in('id', jobIds);

      const jobsMap = new Map(jobs?.map(j => [j.id, j]) || []);

      // Get student profiles
      const studentIds = [...new Set(applications.map(a => a.student_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', studentIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const { data: studentProfiles } = await supabase
        .from('student_profiles')
        .select('user_id, department, roll_number, cgpa')
        .in('user_id', studentIds);

      const studentProfilesMap = new Map(studentProfiles?.map(p => [p.user_id, p]) || []);

      // Group by company
      const companyGroups: Record<string, CompanyPlacement> = {};

      applications.forEach(app => {
        const job = jobsMap.get(app.job_id);
        if (!job) return;

        const key = app.job_id;
        if (!companyGroups[key]) {
          companyGroups[key] = {
            company_name: job.company_name,
            job_title: job.title,
            job_id: job.id,
            candidates: [],
          };
        }

        companyGroups[key].candidates.push({
          id: app.id,
          student_id: app.student_id,
          job_id: app.job_id,
          updated_at: app.updated_at,
          profile: profilesMap.get(app.student_id) || null,
          student_profile: studentProfilesMap.get(app.student_id) || null,
          job: job,
        });
      });

      const placementsList = Object.values(companyGroups).sort((a, b) => 
        b.candidates.length - a.candidates.length
      );

      setPlacements(placementsList);
      setTotalPlaced(applications.length);

    } catch (error: any) {
      console.error('Error fetching placed candidates:', error);
      toast({ title: 'Error', description: 'Failed to load placed candidates', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueCompanies = placements.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          Placed Candidates
        </h1>
        <p className="text-muted-foreground mt-1">Students who have been successfully placed</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <GraduationCap className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{totalPlaced}</p>
            <p className="text-sm text-muted-foreground">Total Placed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Building2 className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{uniqueCompanies}</p>
            <p className="text-sm text-muted-foreground">Companies</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Briefcase className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{placements.length}</p>
            <p className="text-sm text-muted-foreground">Positions Filled</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Placed Students by Company */}
      {placements.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No placed candidates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Candidates who complete their interviews and are selected will appear here after 24 hours
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {placements.map((placement, index) => (
            <motion.div
              key={placement.job_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card variant="elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{placement.company_name}</CardTitle>
                        <CardDescription>{placement.job_title}</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {placement.candidates.length} Placed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {placement.candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={candidate.profile?.avatar_url || ''} />
                            <AvatarFallback className="bg-green-100 text-green-700">
                              {candidate.profile?.full_name?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{candidate.profile?.full_name || 'Unknown'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{candidate.student_profile?.roll_number}</span>
                              {candidate.student_profile?.department && (
                                <>
                                  <span>•</span>
                                  <span>{candidate.student_profile.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Placed on {format(new Date(candidate.updated_at), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlacementPlacedCandidates;
