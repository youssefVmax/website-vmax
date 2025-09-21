# Admin Pages Documentation

## Overview
Two new comprehensive table pages have been created for managers to view all deals and callbacks from all salesmen in the system.

## New Pages

### 1. All Deals Table (`/admin/deals-table`)
**Location**: `app/admin/deals-table/page.tsx`

**Features**:
- Displays all deals from all salesmen in a comprehensive table
- Advanced filtering and search capabilities
- Export to CSV functionality
- Summary statistics cards showing:
  - Total deals count
  - Total revenue
  - Average deal size
  - Number of active agents
- Sortable columns
- Status and stage badges with color coding
- Real-time data from Firebase

**Filters Available**:
- Search by customer name, email, phone, agent, or country
- Filter by status (active, completed, cancelled, inactive)
- Filter by stage (lead, qualified, proposal, negotiation, closed-won, closed-lost)
- Filter by team (ALI ASHRAF, CS TEAM)
- Sort by various fields (date, amount, customer name, agent name)

### 2. All Callbacks Table (`/admin/callbacks-table`)
**Location**: `app/admin/callbacks-table/page.tsx`

**Features**:
- Displays all callbacks from all salesmen in a comprehensive table
- Advanced filtering and search capabilities
- Export to CSV functionality
- Summary statistics cards showing:
  - Total callbacks count
  - Pending callbacks
  - Completed callbacks
  - Conversion rate (callbacks converted to deals)
  - Number of active agents
- Sortable columns
- Status badges with icons and color coding
- Shows conversion status (whether callback was converted to deal)

**Filters Available**:
- Search by customer name, email, phone, agent, reason, or notes
- Filter by status (pending, contacted, completed, cancelled)
- Filter by team (ALI ASHRAF, CS TEAM)
- Sort by various fields (creation date, call date, customer name, agent name)

## Navigation

### Manager-Only Access
- Both pages are accessible only through the admin panel
- The "Manage" link in the main navigation is visible only to users with manager role
- Clicking "Manage" takes you to `/admin/backup` which has a sidebar with all admin functions

### Admin Sidebar
The admin layout includes a sidebar with the following options:
- **Backup**: Database backup functionality
- **Data Export**: Data export functionality  
- **All Deals**: New deals table page
- **All Callbacks**: New callbacks table page

## Technical Implementation

### Data Sources
- **Deals**: Uses `dealsService.getAllDeals()` from `firebase-deals-service.ts`
- **Callbacks**: Uses `callbacksService.getCallbacks('manager')` from `firebase-callbacks-service.ts`

### Key Components Used
- Shadcn/UI components (Table, Card, Badge, Select, Input, Button)
- Lucide React icons
- date-fns for date formatting
- CSV export functionality

### Enhanced Callbacks Service
Added new methods to support team leader functionality:
- `getCallbacksByTeam(teamName: string)`: Get callbacks filtered by team
- `getTeamCallbackAnalytics(teamName: string)`: Get analytics for a specific team

## Usage Instructions

1. **Access**: Log in as a manager and click "Manage" in the main navigation
2. **Navigate**: Use the sidebar to switch between different admin functions
3. **Filter**: Use the filter cards to narrow down the data
4. **Search**: Use the search box to find specific records
5. **Export**: Click "Export CSV" to download the filtered data
6. **Sort**: Click on column headers or use the sort dropdown to reorder data

## Data Security
- Only managers can access these pages
- All data is fetched securely from Firebase
- No sensitive information is exposed in URLs or client-side storage

## Future Enhancements
- Add edit capabilities directly from the tables
- Implement bulk operations
- Add more advanced analytics and charts
- Add real-time updates with WebSocket connections
