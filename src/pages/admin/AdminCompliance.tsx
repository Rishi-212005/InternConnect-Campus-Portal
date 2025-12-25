import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';

const checks = [
  { name: 'Data Privacy Policy', status: 'compliant', lastCheck: 'Dec 20, 2024' },
  { name: 'User Authentication', status: 'compliant', lastCheck: 'Dec 20, 2024' },
  { name: 'Access Controls', status: 'review', lastCheck: 'Dec 15, 2024' },
];

const AdminCompliance: React.FC = () => (
  <div className="space-y-6">
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-heading font-bold text-foreground">Compliance</h1>
      <p className="text-muted-foreground mt-1">System compliance status</p>
    </motion.div>
    <Card variant="elevated">
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Compliance Checks</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {c.status === 'compliant' ? <CheckCircle className="w-6 h-6 text-green-500" /> : <AlertTriangle className="w-6 h-6 text-yellow-500" />}
              <div><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">Last checked: {c.lastCheck}</p></div>
            </div>
            <Badge className={c.status === 'compliant' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{c.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default AdminCompliance;
