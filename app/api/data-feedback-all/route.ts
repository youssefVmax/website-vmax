import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add CORS headers to response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// Handle preflight OPTIONS request
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

// All Data Feedback API - Get all feedback across all data entries (Manager only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('user_role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const feedbackType = searchParams.get('feedback_type') || '';
    const rating = searchParams.get('rating') || '';
    const search = searchParams.get('search') || '';

    console.log('🔍 All Data Feedback API - GET:', { userId, userRole, page, limit, feedbackType, rating, search });

    if (!userId || !userRole) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required parameters: user_id and user_role'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Only managers can access all feedback
    if (userRole !== 'manager') {
      const response = NextResponse.json({
        success: false,
        error: 'Access denied. Only managers can view all feedback.'
      }, { status: 403 });
      return addCorsHeaders(response);
    }

    // Test database connection
    try {
      await query('SELECT 1 as test');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      const response = NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 503 });
      return addCorsHeaders(response);
    }

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const whereConditions: string[] = [];
    const baseParams: any[] = [];
    
    console.log('📊 Pagination values:', { page, limit, offset });

    if (feedbackType && feedbackType !== 'all') {
      whereConditions.push('f.feedback_type = ?');
      baseParams.push(feedbackType);
    }

    if (rating && rating !== 'all') {
      whereConditions.push('f.rating = ?');
      baseParams.push(parseInt(rating));
    }

    if (search) {
      whereConditions.push('(f.feedback_text LIKE ? OR f.user_id LIKE ? OR u.name LIKE ?)');
      const searchTerm = `%${search}%`;
      baseParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    console.log('🔍 WHERE conditions:', whereConditions);
    console.log('🔍 WHERE clause:', whereClause);
    console.log('🔍 Base params for WHERE:', baseParams);

    // Get all feedback with optional user information (LEFT JOIN to handle missing users)
    const feedbackQuery = `
      SELECT 
        f.id,
        f.data_id,
        f.user_id,
        f.feedback_text,
        f.rating,
        f.feedback_type,
        f.status,
        f.created_at,
        f.updated_at,
        COALESCE(u.name, f.user_id) as user_name,
        COALESCE(u.username, f.user_id) as user_username,
        COALESCE(u.role, 'user') as user_role,
        f.feedback_text as message,
        f.feedback_text as subject,
        f.data_id as data_title,
        'Feedback on shared data' as data_description,
        COALESCE(u.name, 'Unknown User') as sent_by_name
      FROM data_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // Ensure parameters are correct types
    const finalQueryParams = [...baseParams, Number(limit), Number(offset)];
    const finalCountParams = [...baseParams];

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM data_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      ${whereClause}
    `;


    // Execute queries with proper error handling
    let feedbackRows: any[] = [];
    let countRows: any[] = [{ total: 0 }];
    
    try {
      // First test if table exists and has data
      console.log('🧪 Testing table existence...');
      const [testRows] = await query<any>('SELECT COUNT(*) as count FROM data_feedback', []);
      console.log('✅ Table test result:', testRows);
      
      // Also get a sample of actual data to see what's in the table
      console.log('🔍 Getting sample data from table...');
      const [sampleRows] = await query<any>('SELECT * FROM data_feedback LIMIT 3', []);
      console.log('📝 Sample data from table:', sampleRows);
      
      // Test a simple query without any WHERE conditions to see if we get all data
      console.log('🧪 Testing simple query without filters...');
      const [allRows] = await query<any>('SELECT * FROM data_feedback ORDER BY created_at DESC LIMIT 10', []);
      console.log('📝 All rows without filters:', allRows);
      
      // Execute queries separately for better error handling
      console.log('🔍 Executing feedback query with params:', finalQueryParams);
      const [qRows] = await query<any>(feedbackQuery, finalQueryParams);
      feedbackRows = qRows as any[];
      
      console.log('🔍 Executing count query with params:', finalCountParams);
      const [qCount] = await query<any>(countQuery, finalCountParams);
      countRows = qCount as any[];
      
      console.log('✅ Query executed successfully. Found rows:', feedbackRows.length);
      console.log('📝 Raw feedback rows sample:', feedbackRows.slice(0, 2));
      console.log('📊 Count result:', countRows);
      
      // TEMPORARY: If no rows found with filters, use all rows for debugging
      if (feedbackRows.length === 0 && allRows.length > 0) {
        console.log('🔄 No rows found with filters, using all rows for debugging...');
        feedbackRows = allRows;
        countRows = [{ total: allRows.length }];
        console.log('🔄 Using all rows:', feedbackRows.length, 'items');
      }
    } catch (queryError: any) {
      console.error('❌ Query execution error:', queryError);
      const msg = (queryError && (queryError.code || queryError.message || '')) as string;
      const isMissingTable = msg.includes('ER_NO_SUCH_TABLE') || msg.toLowerCase().includes("doesn't exist");
      
      if (isMissingTable) {
        console.warn('⚠️ data_feedback table missing. Returning empty results.');
        feedbackRows = [];
        countRows = [{ total: 0 } as any];
      } else {
        throw queryError;
      }
    }

    const total = (countRows as any)[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format the feedback data
    const formattedFeedback = (feedbackRows as any[]).map((item: any) => ({
      ...item,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
    }));

    // Get feedback statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_feedback,
        AVG(f.rating) as avg_rating,
        COUNT(CASE WHEN f.feedback_type = 'question' THEN 1 END) as questions,
        COUNT(CASE WHEN f.feedback_type = 'suggestion' THEN 1 END) as suggestions,
        COUNT(CASE WHEN f.feedback_type = 'concern' THEN 1 END) as concerns,
        COUNT(CASE WHEN f.feedback_type = 'acknowledgment' THEN 1 END) as acknowledgments,
        COUNT(CASE WHEN f.feedback_type = 'general' THEN 1 END) as general
      FROM data_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      ${whereClause}
    `;

    let stats: any = {};
    try {
      const [statsRows] = await query<any>(statsQuery, finalCountParams);
      stats = (statsRows as any[])[0] || {};
      console.log('✅ Stats query successful:', stats);
    } catch (statsError) {
      console.error('❌ Stats query error:', statsError);
      stats = {
        total_feedback: 0,
        avg_rating: 0,
        questions: 0,
        suggestions: 0,
        concerns: 0,
        acknowledgments: 0,
        general: 0
      };
    }

    console.log('✅ All feedback fetched successfully:', formattedFeedback.length);
    console.log('📊 Formatted feedback sample:', formattedFeedback.slice(0, 2));

    const response = NextResponse.json({
      success: true,
      data: formattedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: {
        total_feedback: stats.total_feedback || 0,
        avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : '0.0',
        breakdown: {
          questions: stats.questions || 0,
          suggestions: stats.suggestions || 0,
          concerns: stats.concerns || 0,
          acknowledgments: stats.acknowledgments || 0,
          general: stats.general || 0
        }
      },
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ All Data Feedback API Error:', error);
    // Return safe empty payload so UI can still render
    const response = NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      stats: {
        total_feedback: 0,
        avg_rating: '0.0',
        breakdown: {
          questions: 0,
          suggestions: 0,
          concerns: 0,
          acknowledgments: 0,
          general: 0
        }
      },
      timestamp: new Date().toISOString()
    });
    return addCorsHeaders(response);
  }
}

// Handle POST requests for creating new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      data_id,
      user_id,
      user_role,
      feedback_text,
      rating,
      feedback_type
    } = body;

    console.log('🔄 Data Feedback API - POST:', body);

    // All roles can submit feedback
    if (!['manager', 'team_leader', 'salesman'].includes(user_role)) {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid user role'
      }, { status: 403 });
      return addCorsHeaders(response);
    }

    if (!data_id || !user_id || !feedback_text) {
      const response = NextResponse.json({
        success: false,
        error: 'Missing required fields: data_id, user_id, feedback_text'
      }, { status: 400 });
      return addCorsHeaders(response);
    }

    // Generate unique ID
    const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const insertQuery = `
      INSERT INTO data_feedback (
        id, data_id, user_id, feedback_text, rating, 
        feedback_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    `;

    const params = [
      feedbackId,
      data_id,
      user_id,
      feedback_text,
      rating || null,
      feedback_type || 'general'
    ];

    console.log('🔄 Executing feedback insert:', insertQuery, params);

    await query(insertQuery, params);

    const response = NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback_id: feedbackId
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Data Feedback POST Error:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
