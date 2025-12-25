import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Building2, 
  LayoutDashboard, 
  BookOpen, 
  Shield,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

// Roles that can signup (student and faculty only)
const signupAllowedRoles: AppRole[] = ['student', 'faculty'];

const roleOptions: { role: AppRole; label: string; icon: React.ComponentType<any>; color: string; signupAllowed: boolean }[] = [
  { role: 'student', label: 'Student', icon: GraduationCap, color: 'bg-accent', signupAllowed: true },
  { role: 'faculty', label: 'Faculty/Mentor', icon: BookOpen, color: 'bg-warning', signupAllowed: true },
];

// Admin role info (credentials are NOT exposed in UI - users must know them)
const adminRoles: Record<string, { label: string; icon: React.ComponentType<any>; color: string; hint: string }> = {
  placement: { 
    label: 'Placement Cell',
    icon: LayoutDashboard,
    color: 'bg-success',
    hint: 'placementcell@gmail.com'
  },
  admin: { 
    label: 'Administrator',
    icon: Shield,
    color: 'bg-primary-light',
    hint: 'codecrewadmin@gmail.com'
  },
  recruiter: { 
    label: 'Recruiter',
    icon: Building2,
    color: 'bg-primary',
    hint: 'codecrewrecruiter@gmail.com'
  },
};

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, isAuthenticated, role, isLoading: authLoading } = useSupabaseAuthContext();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('student');
  const [selectedLoginRole, setSelectedLoginRole] = useState<string>('custom');
  const [pendingApproval, setPendingApproval] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupDepartment, setSignupDepartment] = useState('');
  const [signupRollNumber, setSignupRollNumber] = useState('');
  const [signupFacultyId, setSignupFacultyId] = useState('');

  useEffect(() => {
    if (isAuthenticated && role) {
      // Check if faculty and needs approval
      checkFacultyApproval();
    }
  }, [isAuthenticated, role]);

  const checkFacultyApproval = async () => {
    if (role === 'faculty') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: facultyProfile } = await supabase
          .from('faculty_profiles')
          .select('is_approved')
          .eq('user_id', user.id)
          .single();

        if (facultyProfile && !facultyProfile.is_approved) {
          setPendingApproval(true);
          return;
        }
      }
    }
    navigate(`/${role}`);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRoleSelect = (roleKey: string) => {
    const role = adminRoles[roleKey];
    if (role) {
      setLoginEmail(role.hint);
      setLoginPassword('');
      setSelectedLoginRole(roleKey);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(loginEmail)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    if (loginPassword.length < 6) {
      toast({ title: 'Invalid password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({ 
        title: 'Login failed', 
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.' 
          : error.message,
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupName.trim()) {
      toast({ title: 'Name required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }

    if (!validateEmail(signupEmail)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please confirm your password correctly.', variant: 'destructive' });
      return;
    }

    if (!signupAllowedRoles.includes(selectedRole)) {
      toast({ title: 'Signup not allowed', description: 'This role requires admin credentials. Please use sign in.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, selectedRole, signupDepartment, signupRollNumber, signupFacultyId);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({ title: 'Account exists', description: 'This email is already registered. Please log in instead.', variant: 'destructive' });
      } else {
        toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
      }
    } else {
      if (selectedRole === 'faculty') {
        toast({ 
          title: 'Account created!', 
          description: 'Your account is pending approval from the Placement Cell. You will be notified once approved.' 
        });
        setPendingApproval(true);
      } else {
        toast({ title: 'Account created!', description: 'Welcome to CodeCrew. Redirecting to your dashboard...' });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setPendingApproval(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show pending approval screen for faculty
  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border p-4">
          <div className="container flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl">CodeCrew</span>
            </div>
          </div>
        </header>

        <main className="flex-1 container py-8 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <CardTitle className="text-2xl font-heading">Pending Approval</CardTitle>
                <CardDescription>
                  Your faculty/mentor account is awaiting approval from the Placement Cell.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  You will receive an email notification once your account has been approved.
                  This usually takes 1-2 business days.
                </p>
                <Button variant="outline" onClick={handleLogout} className="w-full">
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="container flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl">CodeCrew</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-heading">Welcome to CodeCrew</CardTitle>
              <CardDescription>Sign in or create your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <div className="space-y-4">
                    {/* Role Selection - Just shows role type, no credentials visible */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Select Your Role</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(adminRoles).map(([key, roleInfo]) => {
                          const Icon = roleInfo.icon;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleRoleSelect(key)}
                              className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                                selectedLoginRole === key
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className={`h-8 w-8 rounded-md ${roleInfo.color} flex items-center justify-center`}>
                                <Icon className="h-4 w-4 text-primary-foreground" />
                              </div>
                              <span className="text-xs font-medium">{roleInfo.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Enter your credentials</span>
                      </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-10"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              setSelectedLoginRole('custom');
                            }}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              setSelectedLoginRole('custom');
                            }}
                            required
                          />
                        </div>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full gradient-primary"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </form>
                  </div>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Only Students and Faculty/Mentors can sign up. Admin, Placement Cell, and Recruiters use preset credentials.
                    </AlertDescription>
                  </Alert>

                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          className="pl-10"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Role Selection - Only Student and Faculty */}
                    <div className="space-y-2">
                      <Label>Select Your Role</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {roleOptions.map((option) => {
                          const Icon = option.icon;
                          return (
                            <button
                              key={option.role}
                              type="button"
                              onClick={() => setSelectedRole(option.role)}
                              className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                selectedRole === option.role
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className={`h-8 w-8 rounded-md ${option.color} flex items-center justify-center`}>
                                <Icon className="h-4 w-4 text-primary-foreground" />
                              </div>
                              <span className="text-sm font-medium">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedRole === 'faculty' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          * Faculty accounts require approval from Placement Cell before access is granted.
                        </p>
                      )}
                    </div>

                    {/* Department Field */}
                    <div className="space-y-2">
                      <Label htmlFor="signup-department">Department</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-department"
                          type="text"
                          placeholder="shortcuts ex..CSE,EC...."
                          className="pl-10"
                          value={signupDepartment}
                          onChange={(e) => setSignupDepartment(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Roll Number Field - Only for Students */}
                    {selectedRole === 'student' && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-rollnumber">Roll Number</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-rollnumber"
                            type="text"
                            placeholder="e.g., 21CS001"
                            className="pl-10"
                            value={signupRollNumber}
                            onChange={(e) => setSignupRollNumber(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Faculty ID Field - Only for Faculty */}
                    {selectedRole === 'faculty' && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-facultyid">Faculty ID</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-facultyid"
                            type="text"
                            placeholder="e.g., FAC001"
                            className="pl-10"
                            value={signupFacultyId}
                            onChange={(e) => setSignupFacultyId(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit" 
                      className="w-full gradient-accent"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
