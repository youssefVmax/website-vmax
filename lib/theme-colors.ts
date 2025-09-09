// Comprehensive color theme system for IPTV Dashboard
// Ensures consistent colors across all components

export const themeColors = {
  // Primary brand colors
  primary: {
    cyan: {
      50: '#ecfeff',
      100: '#cffafe', 
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4', // Main cyan
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
      950: '#083344'
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    }
  },

  // Status colors
  status: {
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main orange
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    info: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9', // Main info blue
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e'
    }
  },

  // Metric colors for dashboard cards
  metrics: {
    sales: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/50',
      border: 'border-emerald-200/50 dark:border-emerald-800/50',
      icon: 'text-emerald-600 dark:text-emerald-400',
      accent: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20'
    },
    deals: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50',
      border: 'border-blue-200/50 dark:border-blue-800/50',
      icon: 'text-blue-600 dark:text-blue-400',
      accent: 'bg-blue-500',
      glow: 'shadow-blue-500/20'
    },
    performance: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-950/50 dark:to-violet-900/50',
      border: 'border-purple-200/50 dark:border-purple-800/50',
      icon: 'text-purple-600 dark:text-purple-400',
      accent: 'bg-purple-500',
      glow: 'shadow-purple-500/20'
    },
    targets: {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-900/50',
      border: 'border-orange-200/50 dark:border-orange-800/50',
      icon: 'text-orange-600 dark:text-orange-400',
      accent: 'bg-orange-500',
      glow: 'shadow-orange-500/20'
    },
    analytics: {
      bg: 'bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-950/50 dark:to-teal-900/50',
      border: 'border-cyan-200/50 dark:border-cyan-800/50',
      icon: 'text-cyan-600 dark:text-cyan-400',
      accent: 'bg-cyan-500',
      glow: 'shadow-cyan-500/20'
    }
  },

  // Chart colors for consistent data visualization
  charts: {
    primary: ['#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1', '#84cc16', '#f97316'],
    gradients: {
      blue: 'from-blue-500/10 to-cyan-500/10',
      green: 'from-emerald-500/10 to-green-500/10',
      purple: 'from-purple-500/10 to-violet-500/10',
      orange: 'from-orange-500/10 to-amber-500/10',
      cyan: 'from-cyan-500/10 to-teal-500/10'
    }
  },

  // Background and surface colors
  surfaces: {
    dashboard: {
      light: 'bg-gradient-to-br from-blue-50 via-white to-cyan-50',
      dark: 'dark bg-slate-950'
    },
    card: {
      light: 'bg-white/80 border-blue-200/50 shadow-lg',
      dark: 'bg-slate-900/50 border-slate-700/50'
    },
    sidebar: {
      light: 'bg-white/80 border-blue-200/50 shadow-lg',
      dark: 'bg-slate-900/50 border-slate-700/50'
    }
  },

  // Text colors
  text: {
    primary: {
      light: 'text-slate-800',
      dark: 'text-slate-100'
    },
    secondary: {
      light: 'text-slate-600',
      dark: 'text-slate-400'
    },
    muted: {
      light: 'text-slate-500',
      dark: 'text-slate-500'
    },
    gradient: {
      brand: 'bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent',
      success: 'bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent',
      primary: 'bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent'
    }
  }
};

// Helper functions for consistent color usage
export const getMetricColors = (type: 'sales' | 'deals' | 'performance' | 'targets' | 'analytics') => {
  return themeColors.metrics[type];
};

export const getChartColor = (index: number) => {
  return themeColors.charts.primary[index % themeColors.charts.primary.length];
};

export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info', shade: number = 500) => {
  return themeColors.status[status][shade as keyof typeof themeColors.status.success];
};

// Tailwind CSS class generators
export const generateCardClasses = (type: 'sales' | 'deals' | 'performance' | 'targets' | 'analytics', isDark: boolean = false) => {
  const colors = getMetricColors(type);
  return {
    container: `${colors.bg} ${colors.border} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:${colors.glow} hover:scale-105 group relative overflow-hidden`,
    accent: `absolute top-0 left-0 w-full h-1 ${colors.accent}`,
    icon: `h-8 w-8 ${colors.icon}`,
    decorative: `absolute bottom-0 right-0 w-20 h-20 ${colors.accent} opacity-5 rounded-full transform translate-x-8 translate-y-8`
  };
};

// Animation classes
export const animationClasses = {
  fadeIn: 'animate-in fade-in-0 duration-500',
  slideUp: 'animate-in slide-in-from-bottom-4 duration-500',
  scaleIn: 'animate-in zoom-in-95 duration-300',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
  ping: 'animate-ping'
};

// Consistent spacing and sizing
export const spacing = {
  card: {
    padding: 'p-6',
    margin: 'space-y-6',
    gap: 'gap-6'
  },
  grid: {
    responsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    charts: 'grid grid-cols-1 lg:grid-cols-2'
  }
};

export default themeColors;
