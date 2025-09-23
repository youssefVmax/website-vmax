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

    console.log('🔍 All Data Feedback API - GET:', { userId, userRole, page, limit });

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
    const params: any[] = [];

    if (feedbackType && feedbackType !== 'all') {
      whereConditions.push('f.feedback_type = ?');
      params.push(feedbackType);
    }

    if (rating && rating !== 'all') {
      whereConditions.push('f.rating = ?');
      params.push(parseInt(rating));
    }

    if (search) {
      whereConditions.push('(f.feedback_text LIKE ? OR u.name LIKE ? OR d.title LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get all feedback with data entry and user information
    const feedbackQuery = `
      SELECT 
        f.*,
        u.name as user_name,
        u.username as user_username,
        u.role as user_role,
        d.title as data_title,
        d.description as data_description,
        d.sent_by_id,
        sender.name as sent_by_name
      FROM data_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN data_center d ON f.data_id = d.id
      LEFT JOIN users sender ON d.sent_by_id = sender.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM data_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN data_center d ON f.data_id = d.id
      LEFT JOIN users sender ON d.sent_by_id = sender.id
      ${whereClause}
    `;

    // Add pagination parameters
    const queryParams = [...params, limit, offset];
    const countParams = [...params];

    console.log('🔍 Executing feedback query:', feedbackQuery);
    console.log('🔍 Query params:', queryParams);

    // Execute queries
    const [feedback, countResult] = await Promise.all([
      query<any>(feedbackQuery, queryParams),
      query<any>(countQuery, countParams)
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Format the feedback data
    const formattedFeedback = feedback.map((item: any) => ({
      ...item,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null
    }));

    // Get feedback statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN feedback_type = 'question' THEN 1 END) as questions,
        COUNT(CASE WHEN feedback_type = 'suggestion' THEN 1 END) as suggestions,
        COUNT(CASE WHEN feedback_type = 'concern' THEN 1 END) as concerns,
        COUNT(CASE WHEN feedback_type = 'acknowledgment' THEN 1 END) as acknowledgments,
        COUNT(CASE WHEN feedback_type = 'general' THEN 1 END) as general
      FROM data_feedback f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN data_center d ON f.data_id = d.id
      LEFT JOIN users sender ON d.sent_by_id = sender.id
      ${whereClause}
    `;

    const statsResult = await query<any>(statsQuery, params);
    const stats = statsResult[0] || {};

    console.log('✅ All feedback fetched successfully:', formattedFeedback.length);

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
    const response = NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
