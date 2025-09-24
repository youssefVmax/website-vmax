import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addCorsHeaders(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const exportType = searchParams.get('exportType'); // 'deals', 'callbacks', 'targets', 'analytics'
    const format = searchParams.get('format') || 'csv'; // 'csv', 'excel', 'json'

    // Check export permissions - Only managers can export
    if (userRole !== 'manager') {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Export permission denied',
        message: 'Only managers are allowed to export data'
      }, { status: 403 }));
    }

    if (!exportType) {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Export type is required'
      }, { status: 400 }));
    }

    let data: any[] = [];
    let filename = '';

    switch (exportType) {
      case 'deals':
        const [dealsRows] = await query<any>(
          'SELECT * FROM `deals` ORDER BY `created_at` DESC',
          []
        );
        data = dealsRows;
        filename = `deals_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'callbacks':
        const [callbacksRows] = await query<any>(
          'SELECT * FROM `callbacks` ORDER BY `created_at` DESC',
          []
        );
        data = callbacksRows;
        filename = `callbacks_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'targets':
        const [targetsRows] = await query<any>(
          'SELECT * FROM `targets` ORDER BY `created_at` DESC',
          []
        );
        data = targetsRows;
        filename = `targets_export_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'analytics':
        // Export comprehensive analytics data
        const [analyticsRows] = await query<any>(
          `SELECT 
            d.id as deal_id,
            d.customer_name,
            d.amount_paid,
            d.status as deal_status,
            d.stage as deal_stage,
            d.sales_agent,
            d.sales_team,
            d.created_at as deal_created,
            c.id as callback_id,
            c.status as callback_status,
            c.priority as callback_priority,
            c.scheduled_date,
            t.target_amount,
            t.period as target_period
          FROM deals d
          LEFT JOIN callbacks c ON d.SalesAgentID = c.SalesAgentID
          LEFT JOIN targets t ON d.SalesAgentID = t.agentId
          ORDER BY d.created_at DESC`,
          []
        );
        data = analyticsRows;
        filename = `analytics_export_${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return addCorsHeaders(NextResponse.json({
          success: false,
          error: 'Invalid export type'
        }, { status: 400 }));
    }

    // Log the export activity
    const logId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await query<any>(
      `INSERT INTO \`activity_log\` (id, user_id, action, entity_type, entity_id, new_values, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        userId,
        'export',
        exportType,
        null,
        JSON.stringify({ format, recordCount: data.length, filename }),
        now
      ]
    );

    // Format data based on requested format
    if (format === 'csv') {
      const csvData = convertToCSV(data);
      return addCorsHeaders(new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      }));
    } else if (format === 'json') {
      return addCorsHeaders(NextResponse.json({
        success: true,
        data,
        filename: `${filename}.json`,
        recordCount: data.length,
        exportedAt: new Date().toISOString(),
        exportedBy: userId
      }));
    } else {
      // Default to JSON if format not supported
      return addCorsHeaders(NextResponse.json({
        success: true,
        data,
        filename: `${filename}.json`,
        recordCount: data.length,
        exportedAt: new Date().toISOString(),
        exportedBy: userId
      }));
    }

  } catch (error) {
    console.error('Error exporting data:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 502 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userRole, userId, exportType, filters } = body;

    // Check export permissions - Only managers can export
    if (userRole !== 'manager') {
      return addCorsHeaders(NextResponse.json({
        success: false,
        error: 'Export permission denied',
        message: 'Only managers are allowed to export data'
      }, { status: 403 }));
    }

    // Build filtered query based on filters
    let whereClause = '';
    let params: any[] = [];

    if (filters) {
      const conditions: string[] = [];
      
      if (filters.dateFrom) {
        conditions.push('DATE(created_at) >= ?');
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        conditions.push('DATE(created_at) <= ?');
        params.push(filters.dateTo);
      }
      
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      
      if (filters.team) {
        conditions.push('sales_team = ?');
        params.push(filters.team);
      }
      
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    let data: any[] = [];
    let tableName = '';

    switch (exportType) {
      case 'deals':
        tableName = 'deals';
        break;
      case 'callbacks':
        tableName = 'callbacks';
        break;
      case 'targets':
        tableName = 'targets';
        break;
      default:
        return addCorsHeaders(NextResponse.json({
          success: false,
          error: 'Invalid export type'
        }, { status: 400 }));
    }

    const [rows] = await query<any>(
      `SELECT * FROM \`${tableName}\` ${whereClause} ORDER BY created_at DESC`,
      params
    );

    data = rows;

    // Log the filtered export activity
    const logId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await query<any>(
      `INSERT INTO \`activity_log\` (id, user_id, action, entity_type, entity_id, new_values, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        userId,
        'filtered_export',
        exportType,
        null,
        JSON.stringify({ filters, recordCount: data.length }),
        now
      ]
    );

    return addCorsHeaders(NextResponse.json({
      success: true,
      data,
      recordCount: data.length,
      filters,
      exportedAt: new Date().toISOString(),
      exportedBy: userId
    }));

  } catch (error) {
    console.error('Error exporting filtered data:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Failed to export filtered data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 502 }));
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}
