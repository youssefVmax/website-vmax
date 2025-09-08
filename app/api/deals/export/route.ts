import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

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
      return [];
    }
    throw error;
  }
}

function convertToCSV(deals: any[]) {
  if (deals.length === 0) {
    return 'No deals to export';
  }

  // Get all unique keys from all deals
  const allKeys = new Set<string>();
  deals.forEach(deal => {
    Object.keys(deal).forEach(key => allKeys.add(key));
  });

  const headers = Array.from(allKeys);
  const csvHeaders = headers.join(',');

  const csvRows = deals.map(deal => {
    return headers.map(header => {
      const value = deal[header];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

export async function GET() {
  try {
    const deals = await readDealsData();
    const csvContent = convertToCSV(deals);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `deals-export-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting deals:', error);
    return NextResponse.json({ message: 'Error exporting deals' }, { status: 500 });
  }
}
