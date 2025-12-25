import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  User,
  ChevronLeft,
  ChevronRight,
  Bell,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

const StudentSchedule: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    const fetchInterviews = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Get student's applications first
        const { data: apps } = await supabase
          .from('applications')
          .select('id, job_id')
          .eq('student_id', user.id);
        
        if (!apps || apps.length === 0) {
          setIsLoading(false);
          return;
        }
        
        const appIds = apps.map(a => a.id);
        
        // Get interview schedules
        const { data: schedules } = await supabase
          .from('interview_schedules')
          .select('*')
          .in('application_id', appIds)
          .order('scheduled_at', { ascending: true });
        
        // Get job details for each interview
        const interviewsWithDetails = await Promise.all(
          (schedules || []).map(async (schedule) => {
            const app = apps.find(a => a.id === schedule.application_id);
            if (!app) return null;
            
            const { data: job } = await supabase
              .from('jobs')
              .select('title, company_name')
              .eq('id', app.job_id)
              .single();
            
            return {
              ...schedule,
              job,
            };
          })
        );
        
        setInterviews(interviewsWithDetails.filter(Boolean));
      } catch (error) {
        console.error('Error fetching interviews:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInterviews();
  }, [user?.id]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(currentWeekStart, i);
    const dayInterviews = interviews.filter(int => 
      isSameDay(new Date(int.scheduled_at), date)
    );
    return {
      date,
      day: format(date, 'EEE'),
      dayNum: format(date, 'd'),
      events: dayInterviews.length,
      isToday: isSameDay(date, new Date()),
    };
  });

  const upcomingInterviews = interviews.filter(
    int => new Date(int.scheduled_at) >= new Date()
  );

  const pastInterviews = interviews.filter(
    int => new Date(int.scheduled_at) < new Date()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-3xl font-heading font-bold text-foreground">My Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage your interviews and events</p>
        </div>
      </motion.div>

      {/* Week View */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentWeekStart, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 * index }}
                  className={`p-4 rounded-xl text-center cursor-pointer transition-all ${
                    day.isToday
                      ? 'bg-primary text-primary-foreground'
                      : day.events > 0 
                        ? 'bg-accent/10 border-2 border-accent' 
                        : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <p className={`text-sm ${day.isToday ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {day.day}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${day.isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {day.dayNum}
                  </p>
                  {day.events > 0 && !day.isToday && (
                    <Badge className="mt-2 bg-accent text-accent-foreground text-xs">
                      {day.events} event{day.events > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {day.events > 0 && day.isToday && (
                    <Badge className="mt-2 bg-primary-foreground text-primary text-xs">
                      {day.events} event{day.events > 1 ? 's' : ''}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Interviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingInterviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming interviews scheduled</p>
                <p className="text-sm mt-1">Apply to jobs to get interview invites!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingInterviews.map((interview, index) => {
                  const scheduledDate = new Date(interview.scheduled_at);
                  return (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl gradient-primary flex flex-col items-center justify-center text-primary-foreground">
                          <span className="text-xs">{format(scheduledDate, 'MMM')}</span>
                          <span className="text-lg font-bold">{format(scheduledDate, 'd')}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            Interview - {interview.job?.company_name || 'Company'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {interview.job?.title || 'Position'}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(scheduledDate, 'h:mm a')} ({interview.duration_minutes || 60} min)
                            </span>
                            {interview.meeting_link && (
                              <span className="flex items-center gap-1">
                                <Video className="w-4 h-4" />
                                Video Call
                              </span>
                            )}
                          </div>
                          {interview.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {interview.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-accent/20 text-accent">Upcoming</Badge>
                        {interview.meeting_link && (
                          <Button 
                            variant="accent" 
                            size="sm"
                            onClick={() => window.open(interview.meeting_link, '_blank')}
                          >
                            Join Call
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Past Interviews */}
      {pastInterviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Past Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastInterviews.slice(0, 5).map((interview, index) => {
                  const scheduledDate = new Date(interview.scheduled_at);
                  return (
                    <div
                      key={interview.id}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg opacity-70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground">
                          <span className="text-xs">{format(scheduledDate, 'd')}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {interview.job?.company_name || 'Company'} - {interview.job?.title || 'Position'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(scheduledDate, 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default StudentSchedule;
