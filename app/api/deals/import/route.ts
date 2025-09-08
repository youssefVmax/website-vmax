import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'public', 'data', 'deals.json');

async function readDealsData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(dataFilePath, '[]', 'utf-8');
      return [];
    }
    throw error;
  }
}

async function writeDealsData(data: any[]) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    const fileContent = await file.text();
    
    // Parse CSV content
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parsed.errors && parsed.errors.length > 0) {
      console.error('CSV parse errors:', parsed.errors);
      return NextResponse.json({ 
        message: 'Error parsing CSV file', 
        errors: parsed.errors.slice(0, 3) 
      }, { status: 400 });
    }

    const importedDeals = (parsed.data as any[]).map((row, index) => {
      // Validate required fields
      if (!row.customer_name || !row.amount) {
        throw new Error(`Row ${index + 1}: Missing required fields (customer_name, amount)`);
      }

      return {
        ...row,
        id: row.id || `imported-${Date.now()}-${index}`,
        DealID: row.DealID || `Deal-${Date.now()}-${index}`,
        createdAt: row.createdAt || new Date().toISOString(),
        date: row.date || new Date().toISOString().split('T')[0],
        amount: parseFloat(row.amount) || 0,
        sales_agent_norm: (row.sales_agent || '').toLowerCase(),
        closing_agent_norm: (row.closing_agent || '').toLowerCase(),
        SalesAgentID: row.SalesAgentID || 'imported-agent',
        ClosingAgentID: row.ClosingAgentID || 'imported-agent'
      };
    });

    // Read existing deals and merge
    const existingDeals = await readDealsData();
    const allDeals = [...existingDeals, ...importedDeals];

    // Write back to file
    await writeDealsData(allDeals);

    return NextResponse.json({ 
      message: `Successfully imported ${importedDeals.length} deals`,
      imported: importedDeals.length,
      total: allDeals.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error importing deals:', error);
    return NextResponse.json({ 
      message: error.message || 'Error importing deals' 
    }, { status: 500 });
  }
}
