# Firebase Backup System

A comprehensive backup solution for your Firebase database that allows you to export and download all your data in multiple formats.

## 🚀 Features

- **Complete Database Export**: Export all collections and documents from your Firebase database
- **Selective Backup**: Choose specific collections to backup
- **Multiple Formats**: Export as JSON (preserves structure) or CSV (Excel compatible)
- **Real-time Statistics**: View collection counts and estimated backup size
- **Manager-Only Access**: Secure access restricted to manager role
- **Progress Tracking**: Visual feedback during backup operations
- **Batch Downloads**: Automatic file downloads to your device

## 📁 Files Created

### Core Service
- `lib/firebase-backup-service.ts` - Main backup service with all export functionality

### UI Components  
- `components/firebase-backup.tsx` - React component for backup interface
- `app/backup/page.tsx` - Dedicated backup page with authentication

### Optional Tools
- `scripts/backup-firebase.js` - CLI script template for server-side backups

## 🔧 How to Use

### 1. Access the Backup System

Navigate to `/backup` in your application. Only users with manager role can access this page.

### 2. View Database Statistics

The backup page will automatically load and display:
- Number of collections in your database
- Total document count across all collections  
- Estimated backup file size
- Breakdown of documents per collection

### 3. Choose Backup Type

#### Full JSON Backup
- Exports ALL collections as a single JSON file
- Preserves complete data structure and relationships
- Best for complete database backups
- File format: `firebase-backup-YYYY-MM-DD-HH-mm-ss.json`

#### Selective JSON Backup  
- Export only selected collections
- Use checkboxes to choose which collections to include
- Smaller file size, faster download
- File format: `selective-backup-YYYY-MM-DD-HH-mm-ss.json`

#### CSV Backup
- Exports each collection as a separate CSV file
- Excel and spreadsheet compatible
- Good for data analysis and reporting
- File format: `[collection-name]-backup-YYYY-MM-DD-HH-mm-ss.csv`

### 4. Download Process

1. Click your preferred backup button
2. Wait for the export process to complete (progress shown)
3. Files will automatically download to your default Downloads folder
4. Success notification will confirm completion

## 📊 Backup Data Structure

### JSON Format
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "collections": {
    "deals": [
      {
        "id": "doc-id-1",
        "customer_name": "John Doe",
        "amount": 5000,
        "_collection": "deals",
        "_exportedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "callbacks": [...],
    "users": [...]
  },
  "metadata": {
    "totalDocuments": 1250,
    "collectionsCount": 6,
    "exportedAt": "1/15/2024, 10:30:00 AM",
    "version": "1.0.0"
  }
}
```

### CSV Format
Each collection becomes a separate CSV file with:
- All document fields as columns
- Each document as a row
- Proper escaping for commas and quotes
- Compatible with Excel, Google Sheets, etc.

## 🔒 Security Features

- **Role-based Access**: Only managers can access backup functionality
- **Authentication Check**: Automatic redirect for unauthorized users
- **Secure Export**: No sensitive credentials included in backup files
- **Local Download**: Files download directly to user's device

## 📋 Collections Included

The backup system automatically detects and exports:
- `deals` - All sales deals and transactions
- `callbacks` - Customer callback records
- `users` - User accounts and profiles  
- `targets` - Sales targets and goals
- `target_progress` - Target achievement tracking
- `notifications` - System notifications
- `analytics` - Analytics data (if exists)
- `settings` - Application settings (if exists)
- `logs` - System logs (if exists)

## ⚡ Performance Notes

- **Large Databases**: Exports with 1000+ documents may take 1-2 minutes
- **Memory Usage**: Large exports are processed in chunks to prevent memory issues
- **Network**: Backup speed depends on your internet connection to Firebase
- **File Size**: JSON files are typically 2-3x larger than CSV files

## 🛠 Technical Implementation

### Service Architecture
```typescript
// Main backup service
firebaseBackupService.exportAllData()           // Full export
firebaseBackupService.exportSpecificCollections() // Selective export  
firebaseBackupService.downloadBackupAsJSON()    // JSON download
firebaseBackupService.downloadBackupAsCSV()     // CSV download
firebaseBackupService.getBackupStatistics()     // Statistics
```

### Error Handling
- Graceful handling of missing collections
- Continues backup even if individual collections fail
- User-friendly error messages
- Console logging for debugging

### Data Processing
- Automatic timestamp conversion for Firestore timestamps
- Proper JSON serialization for complex objects
- CSV escaping for special characters
- Metadata enrichment for tracking

## 🚨 Important Notes

1. **Backup Security**: Keep backup files secure as they contain sensitive business data
2. **Regular Backups**: Set up a regular backup schedule (weekly/monthly)
3. **Storage**: Store backups in multiple secure locations
4. **Testing**: Periodically test backup file integrity
5. **Compliance**: Ensure backups comply with your data protection policies

## 🔧 Customization

### Adding New Collections
Edit `firebase-backup-service.ts` and add collection names to the `collections` array:

```typescript
private readonly collections = [
  COLLECTIONS.DEALS || 'deals',
  COLLECTIONS.CALLBACKS || 'callbacks',
  'your-new-collection', // Add here
  // ... other collections
];
```

### Custom Export Formats
Extend the service to add new export formats:

```typescript
// Add to FirebaseBackupService class
downloadBackupAsXML(backupData: BackupData): void {
  // Implement XML export logic
}
```

### Scheduled Backups
For automated backups, use the CLI script template and set up a cron job or scheduled task.

## 📞 Support

If you encounter issues with the backup system:
1. Check browser console for error messages
2. Verify Firebase permissions and connectivity
3. Ensure sufficient storage space for downloads
4. Contact your system administrator for assistance

---

**Last Updated**: January 2024  
**Version**: 1.0.0
