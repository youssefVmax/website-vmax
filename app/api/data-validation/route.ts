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
    const action = searchParams.get('action') || 'validate';

    console.log('🔍 Data Validation API - Action:', action);

    if (action === 'validate') {
      return await validateDatabaseIntegrity();
    } else if (action === 'test-insert') {
      return await testDataInsertion();
    } else if (action === 'schema-check') {
      return await checkSchemaConsistency();
    } else if (action === 'field-mapping') {
      return await validateFieldMapping();
    }

    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Unknown action. Available: validate, test-insert, schema-check, field-mapping' 
    }, { status: 400 }));

  } catch (error) {
    console.error('❌ Data Validation API error:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Data validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

async function validateDatabaseIntegrity() {
  const results: any = {
    success: true,
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check table existence and structure
    const tables = ['users', 'deals', 'callbacks', 'targets', 'notifications', 'target_progress'];
    
    for (const table of tables) {
      try {
        const [rows] = await query(`SELECT COUNT(*) as count FROM  ${table} `);
        const [structure] = await query(`DESCRIBE  ${table} `);
        
        results.checks[table] = {
          exists: true,
          rowCount: rows[0]?.count || 0,
          columns: Array.isArray(structure) ? structure.length : 0,
          structure: Array.isArray(structure) ? structure.map((col: any) => ({
            field: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key,
            default: col.Default
          })) : []
        };
        
        console.log(`✅ Table ${table}: ${rows[0]?.count || 0} rows, ${Array.isArray(structure) ? structure.length : 0} columns`);
      } catch (error) {
        results.checks[table] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        results.success = false;
        console.error(`❌ Table ${table} check failed:`, error);
      }
    }

    // Check indexes
    try {
      const [indexes] = await query(`
        SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'vmax' 
        ORDER BY TABLE_NAME, INDEX_NAME
      `);
      
      results.checks.indexes = {
        count: Array.isArray(indexes) ? indexes.length : 0,
        details: Array.isArray(indexes) ? indexes : []
      };
      
    } catch (error) {
      results.checks.indexes = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ Index check failed:', error);
    }

    // Check foreign key relationships
    try {
      const [foreignKeys] = await query(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          CONSTRAINT_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = 'vmax' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
      
      results.checks.foreignKeys = {
        count: Array.isArray(foreignKeys) ? foreignKeys.length : 0,
        details: Array.isArray(foreignKeys) ? foreignKeys : []
      };
      
    } catch (error) {
      results.checks.foreignKeys = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error('❌ Foreign key check failed:', error);
    }

    return addCorsHeaders(NextResponse.json(results));

  } catch (error) {
    console.error('❌ Database integrity validation failed:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Database integrity validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

async function testDataInsertion() {
  const results: any = {
    success: true,
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Test deal insertion
    const testDealId = `test_deal_${Date.now()}`;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    try {
      await query(`
        INSERT INTO  deals  (
          id, DealID, customer_name, email, phone_number, 
          SalesAgentID, sales_agent, sales_team, stage, status, 
          amount_paid, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testDealId, `TEST_${Date.now()}`, 'Test Customer', 'test@example.com', '1234567890',
        'test_agent', 'Test Agent', 'TEST_TEAM', 'prospect', 'active',
        1000, now, now
      ]);

      // Verify insertion
      const [dealCheck] = await query(`SELECT * FROM  deals  WHERE id = ?`, [testDealId]);
      
      if (Array.isArray(dealCheck) && dealCheck.length > 0) {
        results.tests.dealInsertion = { success: true, id: testDealId };
        
        // Clean up test data
        await query(`DELETE FROM  deals  WHERE id = ?`, [testDealId]);
        console.log('✅ Deal insertion test passed');
      } else {
        results.tests.dealInsertion = { success: false, error: 'Deal not found after insertion' };
        results.success = false;
      }
    } catch (error) {
      results.tests.dealInsertion = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      results.success = false;
      console.error('❌ Deal insertion test failed:', error);
    }

    // Test callback insertion
    const testCallbackId = `test_callback_${Date.now()}`;
    
    try {
      await query(`
        INSERT INTO  callbacks  (
          id, customer_name, phone_number, email, 
          SalesAgentID, sales_agent, sales_team, status, 
          priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testCallbackId, 'Test Customer', '1234567890', 'test@example.com',
        'test_agent', 'Test Agent', 'TEST_TEAM', 'pending',
        'medium', now, now
      ]);

      // Verify insertion
      const [callbackCheck] = await query(`SELECT * FROM  callbacks  WHERE id = ?`, [testCallbackId]);
      
      if (Array.isArray(callbackCheck) && callbackCheck.length > 0) {
        results.tests.callbackInsertion = { success: true, id: testCallbackId };
        
        // Clean up test data
        await query(`DELETE FROM  callbacks  WHERE id = ?`, [testCallbackId]);
        console.log('✅ Callback insertion test passed');
      } else {
        results.tests.callbackInsertion = { success: false, error: 'Callback not found after insertion' };
        results.success = false;
      }
    } catch (error) {
      results.tests.callbackInsertion = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      results.success = false;
      console.error('❌ Callback insertion test failed:', error);
    }

    return addCorsHeaders(NextResponse.json(results));

  } catch (error) {
    console.error('❌ Data insertion test failed:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Data insertion test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

async function checkSchemaConsistency() {
  const results: any = {
    success: true,
    timestamp: new Date().toISOString(),
    schema: {}
  };

  try {
    // Get all tables and their columns
    const [tables] = await query(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'vmax'
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);

    if (Array.isArray(tables)) {
      const tableGroups: { [key: string]: any[] } = {};
      
      tables.forEach((col: any) => {
        if (!tableGroups[col.TABLE_NAME]) {
          tableGroups[col.TABLE_NAME] = [];
        }
        tableGroups[col.TABLE_NAME].push({
          name: col.COLUMN_NAME,
          type: col.DATA_TYPE,
          nullable: col.IS_NULLABLE === 'YES',
          default: col.COLUMN_DEFAULT,
          key: col.COLUMN_KEY,
          extra: col.EXTRA
        });
      });

      results.schema = tableGroups;
      console.log(`✅ Schema consistency check completed for ${Object.keys(tableGroups).length} tables`);
    }

    return addCorsHeaders(NextResponse.json(results));

  } catch (error) {
    console.error('❌ Schema consistency check failed:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Schema consistency check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

async function validateFieldMapping() {
  const results: any = {
    success: true,
    timestamp: new Date().toISOString(),
    mappings: {}
  };

  // Define expected field mappings
  const expectedMappings = {
    deals: {
      camelCase: ['customerName', 'phoneNumber', 'amountPaid', 'serviceTier', 'salesAgentId', 'salesAgentName', 'salesTeam'],
      snake_case: ['customer_name', 'phone_number', 'amount_paid', 'service_tier', 'SalesAgentID', 'sales_agent', 'sales_team']
    },
    callbacks: {
      camelCase: ['customerName', 'phoneNumber', 'salesAgentId', 'salesAgentName', 'salesTeam', 'callbackReason', 'callbackNotes'],
      snake_case: ['customer_name', 'phone_number', 'SalesAgentID', 'sales_agent', 'sales_team', 'callback_reason', 'callback_notes']
    }
  };

  try {
    for (const [table, mapping] of Object.entries(expectedMappings)) {
      const [columns] = await query(`DESCRIBE  ${table} `);
      
      if (Array.isArray(columns)) {
        const dbColumns = columns.map((col: any) => col.Field);
        const missingColumns = mapping.snake_case.filter(col => !dbColumns.includes(col));
        const extraColumns = dbColumns.filter(col => 
          !mapping.snake_case.includes(col) && 
          !['id', 'created_at', 'updated_at'].includes(col)
        );

        results.mappings[table] = {
          expectedColumns: mapping.snake_case.length,
          actualColumns: dbColumns.length,
          missingColumns,
          extraColumns,
          allColumnsPresent: missingColumns.length === 0
        };

        if (missingColumns.length > 0) {
          results.success = false;
          console.error(`❌ Table ${table} missing columns:`, missingColumns);
        } else {
          console.log(`✅ Table ${table} field mapping validated`);
        }
      }
    }

    return addCorsHeaders(NextResponse.json(results));

  } catch (error) {
    console.error('❌ Field mapping validation failed:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Field mapping validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, testData } = body;

    if (action === 'bulk-test') {
      return await performBulkDataTest(testData);
    }

    return addCorsHeaders(NextResponse.json({ 
      success: false, 
      error: 'Unknown POST action' 
    }, { status: 400 }));

  } catch (error) {
    console.error('❌ Data Validation POST error:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'POST operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}

async function performBulkDataTest(testData: any) {
  const results: any = {
    success: true,
    timestamp: new Date().toISOString(),
    bulkTests: {}
  };

  try {
    // Test multiple deal insertions
    if (testData?.deals && Array.isArray(testData.deals)) {
      const dealResults = [];
      
      for (const deal of testData.deals) {
        const testId = `bulk_deal_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        try {
          await query(`
            INSERT INTO  deals  (
              id, DealID, customer_name, email, phone_number, 
              SalesAgentID, sales_agent, sales_team, stage, status, 
              amount_paid, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            testId, deal.dealId || `BULK_${Date.now()}`, 
            deal.customerName, deal.email, deal.phoneNumber,
            deal.salesAgentId, deal.salesAgentName, deal.salesTeam,
            deal.stage || 'prospect', deal.status || 'active',
            deal.amountPaid || 0, now, now
          ]);

          dealResults.push({ success: true, id: testId });
          
          // Clean up
          await query(`DELETE FROM  deals  WHERE id = ?`, [testId]);
        } catch (error) {
          dealResults.push({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          results.success = false;
        }
      }
      
      results.bulkTests.deals = {
        total: testData.deals.length,
        successful: dealResults.filter(r => r.success).length,
        failed: dealResults.filter(r => !r.success).length,
        results: dealResults
      };
    }

    return addCorsHeaders(NextResponse.json(results));

  } catch (error) {
    console.error('❌ Bulk data test failed:', error);
    return addCorsHeaders(NextResponse.json({
      success: false,
      error: 'Bulk data test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 }));
  }
}
