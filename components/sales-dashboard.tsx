import React, { useState } from 'react';
import ProfessionalAnalyticsDashboard from './professional-analytics-dashboard';
import { DateFilter } from '@/components/ui/date-filter';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'manager' | 'salesman' | 'team_leader';
  managedTeam?: string;
}

interface SalesAnalysisDashboardProps {
  userRole: 'manager' | 'salesman' | 'team_leader';
  user: User;
}

function SalesAnalysisDashboard({ userRole, user }: SalesAnalysisDashboardProps) {
  // Date filter state
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString())
  const [dateFilterKey, setDateFilterKey] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleRefresh = () => {
    setLoading(true)
    setDateFilterKey(prev => prev + 1)
    // Simulate loading time
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="space-y-6">
      <DateFilter
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        onRefresh={handleRefresh}
        loading={loading}
      />
      <ProfessionalAnalyticsDashboard 
        userRole={userRole} 
        user={user}
      />
    </div>
  );
}

export default SalesAnalysisDashboard;
