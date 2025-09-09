import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, type LucideIcon } from 'lucide-react';

interface AnimatedMetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
  format?: 'currency' | 'number' | 'percentage';
  suffix?: string;
  animationDuration?: number;
}

export function AnimatedMetricCard({
  title,
  value,
  previousValue = 0,
  icon: Icon,
  color = 'blue',
  format = 'number',
  suffix = '',
  animationDuration = 2000
}: AnimatedMetricCardProps) {
  const [displayValue, setDisplayValue] = useState(previousValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50',
      border: 'border-blue-200/50 dark:border-blue-800/50',
      icon: 'text-blue-600 dark:text-blue-400',
      accent: 'bg-blue-500',
      glow: 'shadow-blue-500/20'
    },
    green: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/50',
      border: 'border-emerald-200/50 dark:border-emerald-800/50',
      icon: 'text-emerald-600 dark:text-emerald-400',
      accent: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-900/50',
      border: 'border-purple-200/50 dark:border-purple-800/50',
      icon: 'text-purple-600 dark:text-purple-400',
      accent: 'bg-purple-500',
      glow: 'shadow-purple-500/20'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-900/50',
      border: 'border-orange-200/50 dark:border-orange-800/50',
      icon: 'text-orange-600 dark:text-orange-400',
      accent: 'bg-orange-500',
      glow: 'shadow-orange-500/20'
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-950/50 dark:to-teal-900/50',
      border: 'border-cyan-200/50 dark:border-cyan-800/50',
      icon: 'text-cyan-600 dark:text-cyan-400',
      accent: 'bg-cyan-500',
      glow: 'shadow-cyan-500/20'
    }
  };

  const classes = colorClasses[color];

  // Calculate trend and change
  const change = value - previousValue;
  const changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

  // Format value for display
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString() + suffix;
    }
  };

  // Smooth animation function
  useEffect(() => {
    if (value === displayValue) return;

    setIsAnimating(true);
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (difference * easeOutCubic);

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        startTimeRef.current = undefined;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, animationDuration]);

  return (
    <Card className={`${classes.bg} ${classes.border} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:${classes.glow} hover:scale-105 group relative overflow-hidden ${isAnimating ? 'animate-pulse' : ''}`}>
      {/* Animated accent bar */}
      <div className={`absolute top-0 left-0 w-full h-1 ${classes.accent} ${isAnimating ? 'animate-pulse' : ''}`}></div>
      
      {/* Pulse effect for real-time updates */}
      {isAnimating && (
        <div className={`absolute inset-0 ${classes.accent} opacity-10 animate-ping`}></div>
      )}

      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            
            {/* Animated value display */}
            <div className="relative">
              <p className={`text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent transition-all duration-300 ${isAnimating ? 'scale-110' : ''}`}>
                {formatValue(displayValue)}
              </p>
              
              {/* Real-time indicator */}
              {isAnimating && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              )}
            </div>

            {/* Trend indicator with animation */}
            <div className="flex items-center space-x-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                trend === 'up' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                trend === 'down' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
              } ${isAnimating ? 'animate-bounce' : ''}`}>
                {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {trend === 'stable' && <Activity className="w-3 h-3 mr-1" />}
                <span>{Math.abs(changePercentage).toFixed(1)}%</span>
              </div>
              
              {/* Live data indicator */}
              <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                Live
              </div>
            </div>
          </div>

          {/* Animated icon */}
          <div className={`p-3 rounded-full ${classes.bg} group-hover:scale-110 transition-all duration-300 ${isAnimating ? 'animate-spin' : ''}`}>
            <Icon className={`h-8 w-8 ${classes.icon} transition-all duration-300`} />
          </div>
        </div>

        {/* Decorative background element */}
        <div className={`absolute bottom-0 right-0 w-20 h-20 ${classes.accent} opacity-5 rounded-full transform translate-x-8 translate-y-8 transition-all duration-300 group-hover:scale-110`}></div>
        
        {/* Progress bar for animation */}
        {isAnimating && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full ${classes.accent} animate-pulse`} style={{ 
              width: `${((Date.now() % animationDuration) / animationDuration) * 100}%` 
            }}></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Real-time data hook for smooth updates
export function useRealTimeMetrics(initialData: any[], updateInterval: number = 5000) {
  const [data, setData] = useState(initialData);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsUpdating(true);
      
      // Simulate real-time data updates with small variations
      const updatedData = data.map(item => ({
        ...item,
        value: item.value + (Math.random() - 0.5) * item.value * 0.05 // ±5% variation
      }));
      
      setTimeout(() => {
        setData(updatedData);
        setIsUpdating(false);
      }, 500); // Brief delay to show loading state
      
    }, updateInterval);

    return () => clearInterval(interval);
  }, [data, updateInterval]);

  return { data, isUpdating, setData };
}

// Animated chart wrapper component
export function AnimatedChartWrapper({ 
  children, 
  isLoading = false, 
  title 
}: { 
  children: React.ReactNode; 
  isLoading?: boolean; 
  title?: string; 
}) {
  return (
    <Card className="bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
      {title && (
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {title}
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </h3>
        </div>
      )}
      
      <div className={`transition-all duration-300 ${isLoading ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
        {children}
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Updating data...
          </div>
        </div>
      )}
    </Card>
  );
}
