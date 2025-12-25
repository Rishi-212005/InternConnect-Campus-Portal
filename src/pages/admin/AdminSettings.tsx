import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Bell, Lock, Database } from 'lucide-react';

const AdminSettings: React.FC = () => (
  <div className="space-y-6">
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-heading font-bold text-foreground">System Settings</h1>
      <p className="text-muted-foreground mt-1">Configure platform settings</p>
    </motion.div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { icon: Bell, title: 'Notifications', desc: 'Configure email and push notifications' },
        { icon: Lock, title: 'Security', desc: 'Manage authentication settings' },
        { icon: Database, title: 'Data Management', desc: 'Backup and export options' },
        { icon: Settings, title: 'General', desc: 'Platform preferences' },
      ].map((s, i) => (
        <Card key={i} variant="interactive">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><s.icon className="w-6 h-6 text-primary" /></div>
            <div className="flex-1"><h3 className="font-semibold">{s.title}</h3><p className="text-sm text-muted-foreground">{s.desc}</p></div>
            <Button variant="outline" size="sm">Configure</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default AdminSettings;
