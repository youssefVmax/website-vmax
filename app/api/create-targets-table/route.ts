import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating targets table...');

    // Create targets table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`targets\` (
        \`id\` varchar(255) NOT NULL PRIMARY KEY,
        \`agentId\` varchar(255) NOT NULL,
        \`agentName\` varchar(255) NOT NULL,
        \`managerId\` varchar(255) DEFAULT NULL,
        \`managerName\` varchar(255) DEFAULT NULL,
        \`monthlyTarget\` decimal(15,2) DEFAULT 0,
        \`dealsTarget\` int(11) DEFAULT 0,
        \`period\` varchar(50) NOT NULL,
        \`type\` varchar(50) DEFAULT 'sales',
        \`description\` text DEFAULT NULL,
        \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_agent_period\` (\`agentId\`, \`period\`),
        INDEX \`idx_manager\` (\`managerId\`),
        INDEX \`idx_period\` (\`period\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await query(createTableQuery);
    console.log('✅ Targets table created successfully');

    // Insert sample targets for testing
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const sampleTargets = [
      {
        id: `target_${Date.now()}_1`,
        agentId: 'agent_001',
        agentName: 'John Smith',
        managerId: 'manager_001',
        managerName: 'Manager Name',
        monthlyTarget: 50000,
        dealsTarget: 10,
        period: currentMonth,
        type: 'sales',
        description: 'Monthly sales target for John Smith'
      },
      {
        id: `target_${Date.now()}_2`,
        agentId: 'agent_002',
        agentName: 'Jane Doe',
        managerId: 'manager_001',
        managerName: 'Manager Name',
        monthlyTarget: 45000,
        dealsTarget: 8,
        period: currentMonth,
        type: 'sales',
        description: 'Monthly sales target for Jane Doe'
      }
    ];

    for (const target of sampleTargets) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await query(
        `INSERT INTO \`targets\` (
          id, agentId, agentName, managerId, managerName, monthlyTarget, dealsTarget,
          period, type, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          target.id, target.agentId, target.agentName, target.managerId, target.managerName,
          target.monthlyTarget, target.dealsTarget, target.period, target.type,
          target.description, now, now
        ]
      );
    }

    console.log('✅ Sample targets inserted successfully');

    return NextResponse.json({
      success: true,
      message: 'Targets table created and sample data inserted',
      sampleTargets: sampleTargets.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error creating targets table:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create targets table',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
