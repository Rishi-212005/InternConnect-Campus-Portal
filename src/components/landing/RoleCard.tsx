import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface RoleCardProps {
  role: AppRole;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  color: string;
  onSelect: (role: AppRole) => void;
  delay?: number;
}

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  title,
  description,
  icon: Icon,
  features,
  color,
  onSelect,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Card variant="interactive" className="h-full flex flex-col group overflow-hidden">
        <div className={`h-2 ${color} transition-all duration-300 group-hover:h-3`} />
        <CardHeader className="text-center pb-4">
          <motion.div
            className={`w-16 h-16 mx-auto rounded-2xl ${color} flex items-center justify-center mb-4 shadow-lg`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Icon className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ul className="space-y-2 mb-6 flex-1">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.1 * (index + 1) }}
                className="flex items-center text-sm text-muted-foreground"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${color} mr-2`} />
                {feature}
              </motion.li>
            ))}
          </ul>
          <Button
            onClick={() => onSelect(role)}
            variant="accent"
            className="w-full"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RoleCard;
