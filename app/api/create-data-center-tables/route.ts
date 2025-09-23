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

// Create Data Center Tables
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating Data Center tables...');

    // Create data_center table
    const createDataCenterTable = `
      CREATE TABLE IF NOT EXISTS data_center (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        content LONGTEXT,
        data_type VARCHAR(100) DEFAULT 'general',
        sent_by_id VARCHAR(255) NOT NULL,
        sent_to_id VARCHAR(255),
        sent_to_team VARCHAR(255),
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_sent_by (sent_by_id),
        INDEX idx_sent_to (sent_to_id),
        INDEX idx_sent_to_team (sent_to_team),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_created_at (created_at),
        INDEX idx_data_type (data_type),
        
        FOREIGN KEY (sent_by_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sent_to_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // Create data_feedback table
    const createDataFeedbackTable = `
      CREATE TABLE IF NOT EXISTS data_feedback (
        id VARCHAR(255) PRIMARY KEY,
        data_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        feedback_text TEXT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        feedback_type VARCHAR(100) DEFAULT 'general',
        status ENUM('active', 'archived', 'deleted') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_data_id (data_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_rating (rating),
        INDEX idx_feedback_type (feedback_type),
        
        FOREIGN KEY (data_id) REFERENCES data_center(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    // Execute table creation
    await query(createDataCenterTable);
    console.log('✅ data_center table created successfully');

    await query(createDataFeedbackTable);
    console.log('✅ data_feedback table created successfully');

    // Create some sample data for testing (optional)
    const sampleDataExists = await query('SELECT COUNT(*) as count FROM data_center');
    if ((sampleDataExists as any)[0].count === 0) {
      console.log('🔧 Creating sample data...');

      // Get a manager user for sample data
      const managers = await query('SELECT id FROM users WHERE role = "manager" LIMIT 1');
      const salesmen = await query('SELECT id FROM users WHERE role = "salesman" LIMIT 2');
      const teamLeaders = await query('SELECT id FROM users WHERE role = "team-leader" LIMIT 1');

      if (managers.length > 0 && salesmen.length > 0) {
        const managerId = (managers as any)[0].id;
        const salesmanId = (salesmen as any)[0].id;
        const teamLeaderId = teamLeaders.length > 0 ? (teamLeaders as any)[0].id : salesmanId;

        // Sample data entries
        const sampleData = [
          {
            id: `data_${Date.now()}_1`,
            title: 'Q4 Sales Targets and Strategy',
            description: 'Updated sales targets for Q4 with new strategy guidelines and focus areas.',
            content: 'Please review the attached Q4 targets. Focus on enterprise clients and increase conversion rates by 15%. New commission structure applies starting next month.',
            data_type: 'targets',
            sent_by_id: managerId,
            sent_to_id: salesmanId,
            priority: 'high'
          },
          {
            id: `data_${Date.now()}_2`,
            title: 'Team Performance Review',
            description: 'Monthly team performance analysis and improvement recommendations.',
            content: 'Team performance has improved by 12% this month. Key areas for improvement: follow-up timing and lead qualification.',
            data_type: 'performance',
            sent_by_id: managerId,
            sent_to_id: teamLeaderId,
            priority: 'medium'
          },
          {
            id: `data_${Date.now()}_3`,
            title: 'New Product Launch Information',
            description: 'Details about the new product launch and sales approach.',
            content: 'New product features, pricing, and target market analysis. Training session scheduled for next week.',
            data_type: 'product_info',
            sent_by_id: managerId,
            sent_to_team: 'ALI ASHRAF',
            priority: 'high'
          }
        ];

        for (const data of sampleData) {
          const insertQuery = `
            INSERT INTO data_center (
              id, title, description, content, data_type, 
              sent_by_id, sent_to_id, sent_to_team, priority, 
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
          `;

          await query(insertQuery, [
            data.id,
            data.title,
            data.description,
            data.content,
            data.data_type,
            data.sent_by_id,
            data.sent_to_id || null,
            data.sent_to_team || null,
            data.priority
          ]);
        }

        // Sample feedback
        const sampleFeedback = [
          {
            id: `feedback_${Date.now()}_1`,
            data_id: sampleData[0].id,
            user_id: salesmanId,
            feedback_text: 'The targets look challenging but achievable. I would like more information about the new commission structure.',
            rating: 4,
            feedback_type: 'question'
          },
          {
            id: `feedback_${Date.now()}_2`,
            data_id: sampleData[1].id,
            user_id: teamLeaderId,
            feedback_text: 'Thank you for the performance review. I agree with the improvement areas and will focus on team training.',
            rating: 5,
            feedback_type: 'acknowledgment'
          }
        ];

        for (const feedback of sampleFeedback) {
          const insertFeedbackQuery = `
            INSERT INTO data_feedback (
              id, data_id, user_id, feedback_text, rating, 
              feedback_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
          `;

          await query(insertFeedbackQuery, [
            feedback.id,
            feedback.data_id,
            feedback.user_id,
            feedback.feedback_text,
            feedback.rating,
            feedback.feedback_type
          ]);
        }

        console.log('✅ Sample data created successfully');
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Data Center tables created successfully',
      tables: ['data_center', 'data_feedback'],
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Error creating Data Center tables:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Failed to create tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// Get table information
export async function GET(request: NextRequest) {
  try {
    // Check if tables exist
    const dataCenterExists = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'data_center'
    `);

    const dataFeedbackExists = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'data_feedback'
    `);

    // Get row counts if tables exist
    let dataCenterCount = 0;
    let dataFeedbackCount = 0;

    if ((dataCenterExists as any)[0].count > 0) {
      const countResult = await query('SELECT COUNT(*) as count FROM data_center');
      dataCenterCount = (countResult as any)[0].count;
    }

    if ((dataFeedbackExists as any)[0].count > 0) {
      const countResult = await query('SELECT COUNT(*) as count FROM data_feedback');
      dataFeedbackCount = (countResult as any)[0].count;
    }

    const response = NextResponse.json({
      success: true,
      tables: {
        data_center: {
          exists: (dataCenterExists as any)[0].count > 0,
          count: dataCenterCount
        },
        data_feedback: {
          exists: (dataFeedbackExists as any)[0].count > 0,
          count: dataFeedbackCount
        }
      },
      timestamp: new Date().toISOString()
    });

    return addCorsHeaders(response);

  } catch (error) {
    console.error('❌ Error checking Data Center tables:', error);
    const response = NextResponse.json({
      success: false,
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    return addCorsHeaders(response);
  }
}
