import { NextRequest, NextResponse } from 'next/server';
import { salesService } from '@/lib/firebase-services';
import { Sale } from '@/types/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('userRole');
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');

    const sales = await salesService.getSales(
      userRole || undefined,
      userId || undefined,
      userName || undefined
    );

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.customer_name || !body.DealID || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_name, DealID, amount' },
        { status: 400 }
      );
    }

    // Prepare sale data
    const saleData: Omit<Sale, 'id' | 'created_at' | 'updated_at'> = {
      date: body.date || new Date().toISOString().split('T')[0],
      customer_name: body.customer_name,
      amount: parseFloat(body.amount),
      sales_agent: body.sales_agent || '',
      closing_agent: body.closing_agent || '',
      team: body.team || '',
      type_service: body.type_service || '',
      sales_agent_norm: (body.sales_agent_norm || body.sales_agent || '').toLowerCase(),
      closing_agent_norm: (body.closing_agent_norm || body.closing_agent || '').toLowerCase(),
      SalesAgentID: body.SalesAgentID || '',
      ClosingAgentID: body.ClosingAgentID || '',
      DealID: body.DealID,
      email: body.email || '',
      phone: body.phone || '',
      country: body.country || '',
      duration_months: body.duration_months || 12,
      type_program: body.type_program || '',
      invoice: body.invoice || ''
    };

    const saleId = await salesService.addSale(saleData);
    
    return NextResponse.json(
      { success: true, id: saleId, sale: saleData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      );
    }

    await salesService.updateSale(id, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { error: 'Failed to update sale' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Sale ID is required' },
        { status: 400 }
      );
    }

    await salesService.deleteSale(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    );
  }
}
