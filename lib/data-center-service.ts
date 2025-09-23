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
  data_id: string;
  user_id: string;
  feedback_text: string;
  rating?: number;
  feedback_type: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_username?: string;
  user_role?: string;
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
  data_type?: 'all' | 'sent' | 'received';
}

export interface FeedbackFilters {
  page?: number;
  limit?: number;
}

export class DataCenterService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:3000';
  }

  /**
   * Initialize data center tables
   */
  async initializeTables(): Promise<boolean> {
    try {
      console.log('🔧 DataCenterService: Initializing tables...');

      const response = await fetch('/api/create-data-center-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Table creation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create tables');
      }

      console.log('✅ DataCenterService: Tables initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ DataCenterService: Table initialization error:', error);
      throw error;
    }
  }

  /**
   * Get data center entries
   */
  async getDataEntries(
    userId: string,
    userRole: string,
    filters: DataCenterFilters = {}
  ): Promise<PaginatedResponse<DataCenterEntry>> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        user_role: userRole,
        data_type: filters.data_type || 'all',
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 25).toString()
      });

      console.log('🔄 DataCenterService: Fetching data entries...', { userId, userRole, filters });

      const response = await fetch(`/api/data-center?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Data API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
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

      const response = await fetch('/api/data-center', {
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

      const response = await fetch(`/api/data-center?${params.toString()}`, {
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

      const response = await fetch(`/api/data-center?${params.toString()}`, {
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

      const response = await fetch(`/api/data-feedback?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Feedback API error: ${response.status} ${response.statusText}`);
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

      const response = await fetch('/api/data-feedback', {
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

      const response = await fetch(`/api/data-feedback?${params.toString()}`, {
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

      const response = await fetch(`/api/data-feedback?${params.toString()}`, {
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
  ): Promise<PaginatedResponse<DataFeedback & { data_title?: string; data_description?: string; sent_by_name?: string }>> {
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

      const response = await fetch(`/api/data-feedback-all?${params.toString()}`, {
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
      const response = await fetch('/api/create-data-center-tables', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ DataCenterService: Connection test successful');
      return result.success;
    } catch (error) {
      console.error('❌ DataCenterService: Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dataCenterService = new DataCenterService();
export default dataCenterService;
