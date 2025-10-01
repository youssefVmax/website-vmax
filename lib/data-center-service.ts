/**
 * Data Center Service - Manages data sharing and feedback between managers and team members
 */

export interface DataCenterEntry {
  id: string;
  title: string;
  description: string;
  content?: string;
  data_type: string;
  sent_by_id: string;
  sent_to_id?: string;
  sent_to_team?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  sent_to_name?: string;
  sent_to_username?: string;
  sent_by_name?: string;
  feedback_count?: number;
  my_feedback_count?: number;
}

export interface DataFeedback {
  id: string;
  data_id?: string; // For legacy data_feedback table
  user_id: string;
  feedback_text?: string; // For legacy compatibility
  message?: string; // For new feedback table
  subject?: string; // For new feedback table
  rating?: number;
  feedback_type: string;
  status: 'active' | 'archived' | 'deleted' | 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_username?: string;
  user_role?: string;
  response?: string;
  response_by?: string;
  response_at?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

export interface DataCenterFilters {
  page?: number;
  limit?: number;
  data_type?: string;
}

export interface FeedbackFilters {
  feedback_type?: string;
  rating?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface FeedbackStats {
  total_feedback: number;
  avg_rating: string;
  breakdown: {
    questions: number;
    suggestions: number;
    concerns: number;
    acknowledgments: number;
    general: number;
  };
}

export interface PaginatedFeedbackResponse<T> extends PaginatedResponse<T> {
  stats: FeedbackStats;
}

export class DataCenterService {
  private baseUrl: string;
  constructor() {
    // Use empty base for browser (relative URLs). On server, prefer env override,
    // otherwise use production domain https://vmaxcom.org, and localhost in development.
    const envBase = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_BASE_URL) || '';
    const isServer = typeof window === 'undefined';
    const isProd = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production';
    this.baseUrl = isServer
      ? (envBase || (isProd ? 'https://vmaxcom.org' : 'http://localhost:3000'))
      : '';
  }

  /**
   * Initialize data center - verify existing tables
   */
  async initializeTables(): Promise<boolean> {
    try {
      console.log('🔧 DataCenterService: Verifying existing database tables...');
      // Test API connectivity by fetching a small amount of data
      const response = await fetch(`${this.baseUrl}/api/data-center?user_id=test&user_role=manager&limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      if (!response.ok) return false;
      const result = await response.json();
      return !!result;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }
  async getDataEntries(
    userId: string,
    userRole: string,
    filters: DataCenterFilters = {}
  ): Promise<PaginatedResponse<DataCenterEntry>> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        user_role: userRole,
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 25).toString()
      });

      if (filters.data_type) params.append('data_type', filters.data_type);

      console.log('🔄 DataCenterService: Fetching data entries...', { userId, userRole, filters });

      const response = await fetch(`${this.baseUrl}/api/data-center?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorMessage = `Data API error: ${response.status} ${response.statusText}`;
        console.error('❌ DataCenterService: API error:', errorMessage);
        
        // For 500 errors, return empty data instead of throwing
        if (response.status === 500) {
          console.warn('⚠️ DataCenterService: API returned 500, returning empty data');
          return {
            success: true,
            data: [],
            pagination: {
              page: filters.page || 1,
              limit: filters.limit || 25,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            },
            timestamp: new Date().toISOString()
          };
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      console.log('🔍 DataCenterService: API response:', result);
      console.log('🔍 DataCenterService: Response success:', result.success);
      console.log('🔍 DataCenterService: Response data:', result.data);
      console.log('🔍 DataCenterService: Response data length:', result.data?.length || 0);

      if (!result.success) {
        console.error('❌ DataCenterService: API returned error:', result.error);
        throw new Error(result.error || 'Failed to fetch data entries');
      }

      console.log('✅ DataCenterService: Data entries fetched successfully');
      return result;
    } catch (error) {
      console.error('❌ DataCenterService: Get data entries error:', error);
      throw error;
    }
  }

  /**
   * Create new data entry (manager only)
   */
  async createDataEntry(
    userId: string,
    userRole: string,
    data: {
      title: string;
      description: string;
      content?: string;
      data_type?: string;
      sent_to_id?: string;
      sent_to_team?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<string> {
    try {
      console.log('🔄 DataCenterService: Creating data entry...', data);

      const response = await fetch(`${this.baseUrl}/api/data-center`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          sent_by_id: userId,
          user_role: userRole
        })
      });

      if (!response.ok) {
        throw new Error(`Create API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create data entry');
      }

      console.log('✅ DataCenterService: Data entry created successfully');
      return result.data_id;
    } catch (error) {
      console.error('❌ DataCenterService: Create data entry error:', error);
      throw error;
    }
  }

  /**
   * Update data entry
   */
  async updateDataEntry(
    dataId: string,
    userId: string,
    userRole: string,
    updates: {
      title?: string;
      description?: string;
      content?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      status?: 'active' | 'archived' | 'deleted';
    }
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        data_id: dataId,
        user_id: userId,
        user_role: userRole
      });

      console.log('🔄 DataCenterService: Updating data entry...', { dataId, updates });

      const response = await fetch(`${this.baseUrl}/api/data-center?${params.toString()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Update API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update data entry');
      }

      console.log('✅ DataCenterService: Data entry updated successfully');
      return true;
    } catch (error) {
      console.error('❌ DataCenterService: Update data entry error:', error);
      throw error;
    }
  }

  /**
   * Delete data entry (manager only)
   */
  async deleteDataEntry(
    dataId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        data_id: dataId,
        user_id: userId,
        user_role: userRole
      });

      console.log('🔄 DataCenterService: Deleting data entry...', { dataId });

      const response = await fetch(`${this.baseUrl}/api/data-center?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Delete API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete data entry');
      }

      console.log('✅ DataCenterService: Data entry deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ DataCenterService: Delete data entry error:', error);
      throw error;
    }
  }

  /**
   * Get feedback for a data entry
   */
  async getFeedback(
    dataId: string,
    userId: string,
    userRole: string,
    filters: FeedbackFilters = {}
  ): Promise<PaginatedResponse<DataFeedback>> {
    try {
      const params = new URLSearchParams({
        data_id: dataId,
        user_id: userId,
        user_role: userRole,
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 25).toString()
      });

      console.log('🔄 DataCenterService: Fetching feedback...', { dataId, filters });

      const response = await fetch(`${this.baseUrl}/api/data-center?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      console.log('🔍 DataCenterService: API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DataCenterService: API error response:', errorText);
        throw new Error(`Data API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feedback');
      }

      console.log('✅ DataCenterService: Feedback fetched successfully');
      return result;
    } catch (error) {
      console.error('❌ DataCenterService: Get feedback error:', error);
      throw error;
    }
  }

  /**
   * Submit feedback (salesman and team leaders only)
   */
  async submitFeedback(
    dataId: string,
    userId: string,
    userRole: string,
    feedback: {
      feedback_text: string;
      rating?: number;
      feedback_type?: string;
    }
  ): Promise<string> {
    try {
      console.log('🔄 DataCenterService: Submitting feedback...', { dataId, feedback });

      const response = await fetch(`${this.baseUrl}/api/data-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          data_id: dataId,
          user_id: userId,
          user_role: userRole,
          ...feedback
        })
      });

      if (!response.ok) {
        throw new Error(`Feedback API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      console.log('✅ DataCenterService: Feedback submitted successfully');
      return result.feedback_id;
    } catch (error) {
      console.error('❌ DataCenterService: Submit feedback error:', error);
      throw error;
    }
  }

  /**
   * Update feedback
   */
  async updateFeedback(
    feedbackId: string,
    userId: string,
    userRole: string,
    updates: {
      feedback_text?: string;
      rating?: number;
      feedback_type?: string;
      status?: 'active' | 'archived' | 'deleted';
    }
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        feedback_id: feedbackId,
        user_id: userId,
        user_role: userRole
      });

      console.log('🔄 DataCenterService: Updating feedback...', { feedbackId, updates });

      const response = await fetch(`${this.baseUrl}/api/data-feedback?${params.toString()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Update feedback API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update feedback');
      }

      console.log('✅ DataCenterService: Feedback updated successfully');
      return true;
    } catch (error) {
      console.error('❌ DataCenterService: Update feedback error:', error);
      throw error;
    }
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(
    feedbackId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        feedback_id: feedbackId,
        user_id: userId,
        user_role: userRole
      });

      console.log('🔄 DataCenterService: Deleting feedback...', { feedbackId });

      const response = await fetch(`${this.baseUrl}/api/data-feedback?${params.toString()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Delete feedback API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete feedback');
      }

      console.log('✅ DataCenterService: Feedback deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ DataCenterService: Delete feedback error:', error);
      throw error;
    }
  }

  /**
   * Get all feedback across all data entries (manager only)
   */
  async getAllFeedback(
    userId: string,
    userRole: string,
    filters: {
      page?: number;
      limit?: number;
      feedback_type?: string;
      rating?: string;
      search?: string;
    } = {}
  ): Promise<PaginatedFeedbackResponse<DataFeedback & { data_title?: string; data_description?: string; sent_by_name?: string }>> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        user_role: userRole,
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 50).toString()
      });

      if (filters.feedback_type) params.append('feedback_type', filters.feedback_type);
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.search) params.append('search', filters.search);

      console.log('🔄 DataCenterService: Fetching all feedback...', filters);

      const response = await fetch(`${this.baseUrl}/api/data-feedback-all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`All feedback API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch all feedback');
      }

      console.log('✅ DataCenterService: All feedback fetched successfully');
      return result;
    } catch (error) {
      console.error('❌ DataCenterService: Get all feedback error:', error);
      throw error;
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(
    userId: string,
    userRole: string,
    dataId?: string
  ): Promise<{
    total_feedback: number;
    avg_rating: string;
    breakdown: {
      questions: number;
      suggestions: number;
      concerns: number;
      acknowledgments: number;
      general: number;
    };
  }> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        user_role: userRole
      });

      if (dataId) params.append('data_id', dataId);

      console.log('🔄 DataCenterService: Fetching feedback stats...');

      const response = await fetch(`/api/data-feedback-all?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Feedback stats API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feedback stats');
      }

      console.log('✅ DataCenterService: Feedback stats fetched successfully');
      return result.stats;
    } catch (error) {
      console.error('❌ DataCenterService: Get feedback stats error:', error);
      throw error;
    }
  }

  /**
   * Test service connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/data-center?user_id=test&user_role=manager&limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ DataCenterService: Connection test successful');
      return !!result;
    } catch (error) {
      console.error('❌ DataCenterService: Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get shared data for user on login (recent shared data)
   */
  async getSharedDataForUser(
    userId: string,
    userRole: string
  ): Promise<DataCenterEntry[]> {
    try {
      console.log('🔄 DataCenterService: Getting shared data for user login...', { userId, userRole });

      const result = await this.getDataEntries(userId, userRole, {
        data_type: 'received',
        page: 1,
        limit: 10 // Get recent 10 shared items
      });

      console.log('✅ DataCenterService: Shared data retrieved for user login');
      return result.data || [];
    } catch (error) {
      console.error('❌ DataCenterService: Get shared data for user error:', error);
      return []; // Return empty array instead of throwing to not break login
    }
  }

  /**
   * Test method to get all data entries (for debugging)
   */
  async getAllDataEntries(): Promise<DataCenterEntry[]> {
    try {
      console.log('🔄 DataCenterService: Getting ALL data entries for debugging...');
      
      const response = await fetch(`${this.baseUrl}/api/data-center?user_id=debug&user_role=manager&data_type=all&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.error('❌ Debug API error:', response.status, response.statusText);
        return [];
      }

      const result = await response.json();
      console.log('🔍 Debug API response:', result);
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Debug error:', error);
      return [];
    }
  }



  /**
   * Get feedback for a specific data entry
   */
  async getFeedbackForData(
    dataId: string,
    userId: string,
    userRole: string
  ): Promise<DataFeedback[]> {
    try {
      console.log('🔄 DataCenterService: Fetching feedback for data...', { dataId, userId, userRole })

      const response = await fetch(`${this.baseUrl}/api/data-feedback?data_id=${dataId}&user_id=${userId}&user_role=${userRole}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ DataCenterService: API error response:', errorText)
        throw new Error(`Feedback API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch feedback')
      }

      console.log('✅ DataCenterService: Feedback for data fetched successfully')
      return result.data || []
    } catch (error) {
      console.error('❌ DataCenterService: Get feedback for data error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const dataCenterService = new DataCenterService();

// Export function to get shared data on user login
export async function getSharedDataOnLogin(userId: string, userRole: string): Promise<DataCenterEntry[]> {
  return dataCenterService.getSharedDataForUser(userId, userRole);
}

export default dataCenterService;
