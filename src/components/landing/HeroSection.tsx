import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Users, Building2, TrendingUp } from 'lucide-react';

const HeroSection: React.FC = () => {
  const stats = [
    { icon: Users, value: '10,000+', label: 'Students Placed' },
    { icon: Building2, value: '500+', label: 'Partner Companies' },
    { icon: TrendingUp, value: '95%', label: 'Placement Rate' },
  ];

  return (
    <div className="relative overflow-hidden gradient-hero min-h-[50vh] flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 7, repeat: Infinity }}
        />
      </div>

      <div className="container relative z-10 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <div className="bg-accent/20 rounded-full p-3">
              <Rocket className="w-8 h-8 text-accent" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold font-heading text-primary-foreground mb-6"
          >
            Welcome to{' '}
            <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
              CodeCrew
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto"
          >
            Your Campus-Centric Internship & Placement Platform. Connect students with
            opportunities, streamline recruitment, and accelerate career success.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-8 md:gap-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className="w-5 h-5 text-accent" />
                  <span className="text-3xl md:text-4xl font-bold text-primary-foreground">
                    {stat.value}
                  </span>
                </div>
                <span className="text-sm text-primary-foreground/60">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </div>
  );
};

export default HeroSection;
