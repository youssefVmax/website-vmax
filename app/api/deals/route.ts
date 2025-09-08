import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The path to the deals data file (separate from CSV)
const dataFilePath = path.join(process.cwd(), 'public', 'data', 'deals.json');

// Function to read deals data from the file
async function readDealsData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    // If the file doesn't exist, create it with empty array
    if (error.code === 'ENOENT') {
      await fs.writeFile(dataFilePath, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

// Function to write deals data to the file
async function writeDealsData(data: any[]) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const dealsData = await readDealsData();
    return NextResponse.json(dealsData, { status: 200 });
  } catch (error) {
    console.error('Error reading deals:', error);
    return NextResponse.json({ message: 'Error reading deals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const newDeal = await req.json();

    // Enhanced validation
    if (!newDeal.customer_name || !newDeal.amount || !newDeal.SalesAgentID) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const dealsData = await readDealsData();

    // Add timestamp and ID to new deal
    const dealWithMeta = {
      ...newDeal,
      DealID: newDeal.DealID || `Deal-${Date.now()}`,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      date: newDeal.date || new Date().toISOString().split('T')[0],
      amount: parseFloat(newDeal.amount) || 0,
      sales_agent_norm: (newDeal.sales_agent || '').toLowerCase(),
      closing_agent_norm: (newDeal.closing_agent || '').toLowerCase()
    };

    // Add the new deal to the existing data
    dealsData.push(dealWithMeta);

    // Write the updated data back to the file
    await writeDealsData(dealsData);

    return NextResponse.json(dealWithMeta, { status: 201 });
  } catch (error) {
    console.error('Error adding deal:', error);
    return NextResponse.json({ message: 'Error adding deal' }, { status: 500 });
  }
}
