import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Eye, 
  CheckCircle, 
  Loader2,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

interface UserWithDetails {
  user_id: string;
  role: string;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState<UserWithDetails | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    
    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithProfiles = await Promise.all(
        (userRoles || []).map(async (ur) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('user_id', ur.user_id)
            .maybeSingle();

          return {
            ...ur,
            profile,
          };
        })
      );

      setUsers(usersWithProfiles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    recruiters: users.filter(u => u.role === 'recruiter').length,
    faculty: users.filter(u => u.role === 'faculty').length,
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      student: 'bg-blue-100 text-blue-700',
      recruiter: 'bg-green-100 text-green-700',
      faculty: 'bg-purple-100 text-purple-700',
      placement: 'bg-orange-100 text-orange-700',
      admin: 'bg-red-100 text-red-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Manage all platform users</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <UserCheck className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.students}</p>
            <p className="text-sm text-muted-foreground">Students</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.recruiters}</p>
            <p className="text-sm text-muted-foreground">Recruiters</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <UserX className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.faculty}</p>
            <p className="text-sm text-muted-foreground">Faculty</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card variant="elevated">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.02 * index }}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-medium">
                          {user.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{user.profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{user.profile?.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`capitalize ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </td>
                    <td className="p-4">
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setViewingUser(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
                  {viewingUser.profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{viewingUser.profile?.full_name}</h3>
                  <p className="text-muted-foreground">{viewingUser.profile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge className={`capitalize mt-1 ${getRoleBadgeColor(viewingUser.role)}`}>
                    {viewingUser.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(viewingUser.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs">{viewingUser.user_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="bg-green-100 text-green-700 mt-1">Active</Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
