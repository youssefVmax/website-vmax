import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

// The path to the sales data file
const dataFilePath = path.join(process.cwd(), 'public', 'data', 'sales-data.json');

// Function to read sales data from the file
async function readSalesData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If the file doesn't exist, return an empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Function to write sales data to the file
async function writeSalesData(data: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const newDeal = await req.json();

    // Basic validation
    if (!newDeal.customer_name || !newDeal.amount || !newDeal.sales_agent) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const salesData = await readSalesData();

    // Add the new deal to the existing data
    salesData.push(newDeal);

    // Write the updated data back to the file
    await writeSalesData(salesData);

    return NextResponse.json(newDeal, { status: 201 });
  } catch (error) {
    console.error('Error adding deal:', error);
    return NextResponse.json({ message: 'Error adding deal' }, { status: 500 });
  }
}
