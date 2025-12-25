import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Users, Briefcase, Search, Loader2, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useJobs } from '@/hooks/useJobs';

interface CompanyData {
  name: string;
  jobCount: number;
  hireCount: number;
  activeJobs: number;
  avgSalary: number;
  locations: string[];
}

const PlacementCompanies: React.FC = () => {
  const { jobs, isLoading: jobsLoading } = useJobs();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (jobsLoading) return;
      
      try {
        // Get all applications
        const { data: applications } = await supabase
          .from('applications')
          .select('job_id, status');
        
        // Group jobs by company
        const companyMap: Record<string, CompanyData> = {};
        
        jobs.forEach(job => {
          const company = job.company_name;
          if (!companyMap[company]) {
            companyMap[company] = {
              name: company,
              jobCount: 0,
              hireCount: 0,
              activeJobs: 0,
              avgSalary: 0,
              locations: [],
            };
          }
          
          companyMap[company].jobCount++;
          if (job.status === 'active') {
            companyMap[company].activeJobs++;
          }
          
          if (job.salary_min) {
            const currentAvg = companyMap[company].avgSalary;
            const count = companyMap[company].jobCount;
            companyMap[company].avgSalary = Math.round(
              (currentAvg * (count - 1) + job.salary_min) / count
            );
          }
          
          if (job.location && !companyMap[company].locations.includes(job.location)) {
            companyMap[company].locations.push(job.location);
          }
          
          // Count hires
          const jobApps = applications?.filter(a => a.job_id === job.id) || [];
          const hires = jobApps.filter(a => a.status === 'selected').length;
          companyMap[company].hireCount += hires;
        });
        
        const companiesArray = Object.values(companyMap).sort((a, b) => b.hireCount - a.hireCount);
        setCompanies(companiesArray);
      } catch (error) {
        console.error('Error fetching company data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCompanyData();
  }, [jobs, jobsLoading]);

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (jobsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold text-foreground">Partner Companies</h1>
        <p className="text-muted-foreground mt-1">Manage industry partnerships</p>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-foreground">{companies.length}</p>
            <p className="text-sm text-muted-foreground">Total Companies</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {companies.filter(c => c.activeJobs > 0).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Partners</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {companies.reduce((sum, c) => sum + c.hireCount, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Hires</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-accent">
              {jobs.filter(j => j.status === 'active').length}
            </p>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Company Cards */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompanies.map((company, i) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card variant="interactive">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{company.name}</h3>
                      {company.locations.length > 0 && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {company.locations.slice(0, 2).join(', ')}
                          {company.locations.length > 2 && ` +${company.locations.length - 2}`}
                        </p>
                      )}
                    </div>
                    <Badge className={company.activeJobs > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                    }>
                      {company.activeJobs > 0 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{company.hireCount} hires</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      <span>{company.activeJobs} active</span>
                    </div>
                    {company.avgSalary > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        <span>₹{(company.avgSalary / 100000).toFixed(1)}L avg</span>
                      </div>
                    )}
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

export default PlacementCompanies;
