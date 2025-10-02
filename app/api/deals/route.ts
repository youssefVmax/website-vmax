import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/server/db";

// Force dynamic rendering - NO CACHING
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function addCorsHeaders(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.headers.set("X-Accel-Expires", "0");
  return res;
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }));
}

/**
 * GET /api/deals
 * Fetch deals with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salesAgentId = searchParams.get("salesAgentId") || searchParams.get("SalesAgentID");
    const salesTeam = searchParams.get("salesTeam") || searchParams.get("team");
    const status = searchParams.get("status");
    const userRole = searchParams.get("userRole");
    const userId = searchParams.get("userId");
    const managedTeam = searchParams.get("managedTeam");
    const search = searchParams.get("search");
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10) || 25, 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    // Role-based filtering
    if (userRole === "salesman" && userId) {
      where.push("d.`SalesAgentID` = ?");
      params.push(userId);
    } else if (userRole === "team_leader" && userId) {
      let teamToFilter = managedTeam;
      
      // If managedTeam not provided in params, query from database
      if (!teamToFilter) {
        const [userRows] = await query<any>("SELECT `managedTeam` FROM `users` WHERE `id` = ?", [userId]);
        teamToFilter = userRows[0]?.managedTeam;
      }
      
      if (teamToFilter) {
        // Team leaders: own deals OR managed team deals
        where.push("(d.`SalesAgentID` = ? OR d.`sales_team` = ?)");
        params.push(userId, teamToFilter);
        console.log('🔍 Team leader filtering:', { userId, teamToFilter });
      } else {
        // Fallback to personal deals only
        where.push("d.`SalesAgentID` = ?");
        params.push(userId);
        console.log('🔍 Team leader fallback to personal deals only:', { userId });
      }
    }

    // Optional filters
    if (salesAgentId) {
      where.push("d.`SalesAgentID` = ?");
      params.push(salesAgentId);
    }
    if (salesTeam) {
      where.push("d.`sales_team` = ?");
      params.push(salesTeam);
    }
    if (status) {
      where.push("d.`status` = ?");
      params.push(status);
    }

    // Month/Year filter (supports both data_month/data_year and signup_date)
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    if (month && year) {
      where.push("((d.`data_month` = ? AND d.`data_year` = ?) OR (MONTH(d.`signup_date`) = ? AND YEAR(d.`signup_date`) = ?))");
      params.push(month, year, month, year);
    } else if (year && !month) {
      // Year-only filter
      where.push("((d.`data_year` = ?) OR (YEAR(d.`signup_date`) = ?))");
      params.push(year, year);
    }
    
    // Search functionality
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      where.push('(d.`customer_name` LIKE ? OR d.`phone_number` LIKE ? OR d.`email` LIKE ? OR d.`sales_agent` LIKE ? OR d.`SalesAgentID` LIKE ?)');
      console.log('🔍 Search applied:', { search: search.trim(), searchTerm });
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Query with JOINs to get actual user names for sales and closing agents
    const baseSql = `
      SELECT 
        d.*,
        COALESCE(u1.name, 'Unknown Agent') as sales_agent_name,
        COALESCE(u2.name, d.closing_agent, 'Unknown Agent') as closing_agent_name,
        COALESCE(u1.name, 'Unknown Agent') as sales_agent
      FROM deals d 
      LEFT JOIN users u1 ON d.SalesAgentID = u1.id
      LEFT JOIN users u2 ON d.ClosingAgentID = u2.id
      ${whereClause} 
      ORDER BY d.created_at DESC
    `;
    const countSql = `SELECT COUNT(*) as c FROM deals d 
      LEFT JOIN users u1 ON d.SalesAgentID = u1.id
      LEFT JOIN users u2 ON d.ClosingAgentID = u2.id
      ${whereClause}`;

    // For pagination, we need to append LIMIT and OFFSET to the query string
    // since MySQL has issues with prepared statements for LIMIT/OFFSET
    const paginatedSql = `${baseSql} LIMIT ${limit} OFFSET ${offset}`;

    console.log('📝 Executing deals query:', paginatedSql);
    console.log('📝 With params:', params);
    console.log('📝 Request context:', { userRole, userId, managedTeam, search, page, limit });

    const [rows] = await query<any>(paginatedSql, params);

    const [totals] = await query<any>(countSql, params);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        deals: rows,
        total: totals[0]?.c || 0,
        page,
        limit,
        userRole,
        userId,
      })
    );
  } catch (error) {
    console.error("❌ Error fetching deals:", error);
    return addCorsHeaders(
      NextResponse.json(
        {
          success: false,
          error: "Failed to fetch deals",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 502 }
      )
    );
  }
}

/**
 * POST /api/deals
 * Insert a new deal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Generate IDs
    const id = `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dealId = body.dealId || body.DealID || `D${Date.now()}`;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Normalize customer name to ensure consistency
    const customerName = body.customerName || body.customer_name || 'Unknown Customer';
    console.log('🔍 Creating deal with customer name:', customerName);

    // Insert deal - Using correct column names and parameter count
    await query<any>(
      `INSERT INTO deals (
        id, DealID, customer_name, email, phone_number, amount_paid, 
        sales_agent, SalesAgentID, sales_team, closing_agent, ClosingAgentID,
        stage, status, priority, signup_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dealId,
        customerName,
        body.email || '',
        body.phoneNumber || body.phone_number || '',
        body.amountPaid || body.amount_paid || 0,
        body.salesAgentName || body.sales_agent || 'Unknown Agent',
        body.salesAgentId || body.SalesAgentID || '',
        body.salesTeam || body.sales_team || '',
        body.closingAgent || body.closing_agent || 'Unknown Agent',
        body.closingAgentId || body.ClosingAgentID || '',
        body.stage || "prospect",
        body.status || "active",
        body.priority || "medium",
        body.signupDate || body.signup_date || now,
        now,
        now
      ]
    );

    // Fetch newly inserted deal
    const [rows] = await query<any>("SELECT * FROM deals WHERE id = ?", [id]);

    return addCorsHeaders(NextResponse.json({ success: true, deal: rows[0] }, { status: 201 }));
  } catch (error) {
    console.error("❌ Error creating deal:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      sqlState: (error as any)?.sqlState,
      errno: (error as any)?.errno,
      code: (error as any)?.code
    });
    return addCorsHeaders(
      NextResponse.json(
        { 
          success: false, 
          error: "Failed to create deal", 
          details: error instanceof Error ? error.message : "Unknown error",
          debug: {
            message: error instanceof Error ? error.message : "Unknown error",
            code: (error as any)?.code,
            errno: (error as any)?.errno
          }
        },
        { status: 502 }
      )
    );
  }
}

/**
 * PUT /api/deals
 * Update a deal
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: "Deal ID is required" }, { status: 400 }));
    }

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const setClauses: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      customerName: "customer_name", customer_name: "customer_name",
      phoneNumber: "phone_number", phone_number: "phone_number",
      amountPaid: "amount_paid", amount_paid: "amount_paid",
      serviceTier: "service_tier", service_tier: "service_tier",
      productType: "product_type", product_type: "product_type",
      salesAgentId: "SalesAgentID", SalesAgentID: "SalesAgentID",
      salesAgentName: "sales_agent", sales_agent: "sales_agent",
      salesTeam: "sales_team", sales_team: "sales_team",
      closingAgentId: "ClosingAgentID", ClosingAgentID: "ClosingAgentID",
      closingAgent: "closing_agent", closing_agent: "closing_agent",
      signupDate: "signup_date", signup_date: "signup_date",
      endDate: "end_date", end_date: "end_date",
      durationYears: "duration_years", duration_years: "duration_years",
      durationMonths: "duration_months", duration_months: "duration_months",
      numberOfUsers: "number_of_users", number_of_users: "number_of_users",
      customCountry: "custom_country", custom_country: "custom_country",
      invoiceLink: "invoice_link", invoice_link: "invoice_link",
      isIboPlayer: "is_ibo_player", is_ibo_player: "is_ibo_player",
      isBobPlayer: "is_bob_player", is_bob_player: "is_bob_player",
      isIboss: "is_iboss", is_iboss: "is_iboss",
      isIboPro: "is_ibo_pro", is_ibo_pro: "is_ibo_pro",
      isSmarters: "is_smarters", is_smarters: "is_smarters",
      isAboveAvg: "is_above_avg", is_above_avg: "is_above_avg",
      dataMonth: "data_month", data_month: "data_month",
      dataYear: "data_year", data_year: "data_year",
      endYear: "end_year", end_year: "end_year",
      paidPerDay: "paid_per_day", paid_per_day: "paid_per_day",
      paidPerMonth: "paid_per_month", paid_per_month: "paid_per_month",
      paidRank: "paid_rank", paid_rank: "paid_rank",
      daysRemaining: "days_remaining", days_remaining: "days_remaining",
      agentAvgPaid: "agent_avg_paid", agent_avg_paid: "agent_avg_paid",
      durationMeanPaid: "duration_mean_paid", duration_mean_paid: "duration_mean_paid",
      deviceId: "device_id", device_id: "device_id",
      deviceKey: "device_key", device_key: "device_key",
      salesAgentNorm: "sales_agent_norm", sales_agent_norm: "sales_agent_norm",
      closingAgentNorm: "closing_agent_norm", closing_agent_norm: "closing_agent_norm",
      dealId: "DealID", DealID: "DealID"
    };

    Object.entries(updates).forEach(([key, value]) => {
      const dbField = fieldMap[key] || key;
      
      // Special handling for customer name to ensure consistency
      if (key === 'customerName' || key === 'customer_name') {
        console.log('🔍 Updating customer name:', value);
        setClauses.push('`customer_name` = ?');
        params.push(value);
      } else {
        setClauses.push(`\`${dbField}\` = ?`);
        params.push(value);
      }
    });

    setClauses.push("`updated_at` = ?");
    params.push(now, id);

    const [result] = await query<any>(
      `UPDATE deals SET ${setClauses.join(", ")} WHERE id = ?`,
      params
    );

    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error("❌ Error updating deal:", error);
    return addCorsHeaders(NextResponse.json({ success: false, error: "Failed to update deal" }, { status: 502 }));
  }
}

/**
 * DELETE /api/deals?id=...
 * Delete a deal by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return addCorsHeaders(NextResponse.json({ success: false, error: "Deal ID is required" }, { status: 400 }));
    }

    const [result] = await query<any>("DELETE FROM deals WHERE id = ?", [id]);
    return addCorsHeaders(NextResponse.json({ success: true, affected: (result as any).affectedRows }));
  } catch (error) {
    console.error("❌ Error deleting deal:", error);
    return addCorsHeaders(NextResponse.json({ success: false, error: "Failed to delete deal" }, { status: 502 }));
  }
}



/** 
CREATE TABLE `deals` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_ibo_player` tinyint(1) DEFAULT NULL,
  `product_type` text COLLATE utf8mb4_unicode_ci,
  `number_of_users` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `closing_agent` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_month` bigint DEFAULT NULL,
  `duration_years` bigint DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `signup_date` date DEFAULT NULL,
  `device_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `sales_agent_norm` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_bob_player` tinyint(1) DEFAULT NULL,
  `paid_per_day` double DEFAULT NULL,
  `sales_team` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_iboss` tinyint(1) DEFAULT NULL,
  `country` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_key` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoice_link` text COLLATE utf8mb4_unicode_ci,
  `stage` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_tier` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `closing_agent_norm` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_paid` bigint DEFAULT NULL,
  `sales_agent` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_per_month` double DEFAULT NULL,
  `duration_months` bigint DEFAULT NULL,
  `is_ibo_pro` tinyint(1) DEFAULT NULL,
  `is_above_avg` tinyint(1) DEFAULT NULL,
  `paid_rank` bigint DEFAULT NULL,
  `days_remaining` bigint DEFAULT NULL,
  `custom_country` text COLLATE utf8mb4_unicode_ci,
  `agent_avg_paid` double DEFAULT NULL,
  `created_by` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `end_year` bigint DEFAULT NULL,
  `data_year` bigint DEFAULT NULL,
  `is_smarters` tinyint(1) DEFAULT NULL,
  `status` text COLLATE utf8mb4_unicode_ci,
  `SalesAgentID` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ClosingAgentID` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_mean_paid` double DEFAULT NULL,
  `DealID` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deal_history` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deal_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_stage` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_stage` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_amount` bigint DEFAULT NULL,
  `new_amount` bigint DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
**/
