import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Creating sample deals...');

    // Sample deals data
    const sampleDeals = [
      {
        id: `deal_${Date.now()}_1`,
        DealID: `D${Date.now()}001`,
        customerName: 'John Smith',
        email: 'john.smith@email.com',
        phoneNumber: '+1234567890',
        amountPaid: 15000,
        amount: 15000,
        totalAmount: 15000,
        SalesAgentID: 'agent_001',
        salesAgentName: 'Alice Johnson',
        ClosingAgentID: 'agent_001',
        closingAgentName: 'Alice Johnson',
        serviceTier: 'Premium',
        salesTeam: 'Team A',
        status: 'closed',
        signupDate: new Date().toISOString().split('T')[0],
        durationMonths: 12,
        country: 'USA',
        invoice_link: 'https://example.com/invoice1'
      },
      {
        id: `deal_${Date.now()}_2`,
        DealID: `D${Date.now()}002`,
        customerName: 'Sarah Wilson',
        email: 'sarah.wilson@email.com',
        phoneNumber: '+1234567891',
        amountPaid: 25000,
        amount: 25000,
        totalAmount: 25000,
        SalesAgentID: 'agent_002',
        salesAgentName: 'Bob Martinez',
        ClosingAgentID: 'agent_002',
        closingAgentName: 'Bob Martinez',
        serviceTier: 'Enterprise',
        salesTeam: 'Team B',
        status: 'active',
        signupDate: new Date().toISOString().split('T')[0],
        durationMonths: 24,
        country: 'Canada',
        invoice_link: 'https://example.com/invoice2'
      },
      {
        id: `deal_${Date.now()}_3`,
        DealID: `D${Date.now()}003`,
        customerName: 'Michael Brown',
        email: 'michael.brown@email.com',
        phoneNumber: '+1234567892',
        amountPaid: 8500,
        amount: 8500,
        totalAmount: 8500,
        SalesAgentID: 'agent_003',
        salesAgentName: 'Carol Davis',
        ClosingAgentID: 'agent_003',
        closingAgentName: 'Carol Davis',
        serviceTier: 'Basic',
        salesTeam: 'Team A',
        status: 'pending',
        signupDate: new Date().toISOString().split('T')[0],
        durationMonths: 6,
        country: 'UK',
        invoice_link: 'https://example.com/invoice3'
      },
      {
        id: `deal_${Date.now()}_4`,
        DealID: `D${Date.now()}004`,
        customerName: 'Emma Garcia',
        email: 'emma.garcia@email.com',
        phoneNumber: '+1234567893',
        amountPaid: 32000,
        amount: 32000,
        totalAmount: 32000,
        SalesAgentID: 'agent_001',
        salesAgentName: 'Alice Johnson',
        ClosingAgentID: 'agent_001',
        closingAgentName: 'Alice Johnson',
        serviceTier: 'Enterprise',
        salesTeam: 'Team A',
        status: 'closed',
        signupDate: new Date().toISOString().split('T')[0],
        durationMonths: 18,
        country: 'Australia',
        invoice_link: 'https://example.com/invoice4'
      },
      {
        id: `deal_${Date.now()}_5`,
        DealID: `D${Date.now()}005`,
        customerName: 'David Lee',
        email: 'david.lee@email.com',
        phoneNumber: '+1234567894',
        amountPaid: 12000,
        amount: 12000,
        totalAmount: 12000,
        SalesAgentID: 'agent_002',
        salesAgentName: 'Bob Martinez',
        ClosingAgentID: 'agent_002',
        closingAgentName: 'Bob Martinez',
        serviceTier: 'Standard',
        salesTeam: 'Team B',
        status: 'active',
        signupDate: new Date().toISOString().split('T')[0],
        durationMonths: 12,
        country: 'Germany',
        invoice_link: 'https://example.com/invoice5'
      }
    ];

    let insertedCount = 0;

    for (const deal of sampleDeals) {
      try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        await query(
          `INSERT INTO deals (
            id, DealID, customerName, email, phoneNumber, amountPaid, amount, totalAmount,
            SalesAgentID, salesAgentName, ClosingAgentID, closingAgentName,
            serviceTier, salesTeam, status, signupDate, durationMonths,
            country, invoice_link, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deal.id, deal.DealID, deal.customerName, deal.email, deal.phoneNumber,
            deal.amountPaid, deal.amount, deal.totalAmount, deal.SalesAgentID, deal.salesAgentName,
            deal.ClosingAgentID, deal.closingAgentName, deal.serviceTier, deal.salesTeam,
            deal.status, deal.signupDate, deal.durationMonths, deal.country, deal.invoice_link,
            now, now
          ]
        );
        insertedCount++;
        console.log(`✅ Inserted deal: ${deal.customerName} - $${deal.amountPaid}`);
      } catch (insertError) {
        console.error(`❌ Error inserting deal ${deal.customerName}:`, insertError);
        // Continue with other deals even if one fails
      }
    }

    console.log(`✅ Sample deals creation completed. Inserted ${insertedCount}/${sampleDeals.length} deals`);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${insertedCount} sample deals`,
      insertedCount,
      totalAttempted: sampleDeals.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error creating sample deals:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create sample deals',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
