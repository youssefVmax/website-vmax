# Firebase Backup Instructions

This guide explains how to backup all your Firebase data using the provided backup tools.

## 🚀 Quick Start

### Option 1: Using the Web Interface (Recommended)

1. **Access the Backup Page**
   - Navigate to `/admin/backup` in your application
   - Only available to users with manager/admin role

2. **Create Backup**
   - Click the "Start Backup" button
   - Wait for the backup process to complete
   - Download the backup files when ready

### Option 2: Using the Command Line Script

1. **Prerequisites**
   ```bash
   npm install firebase-admin
   ```

2. **Setup Firebase Service Account**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the file as `database/firebase-service-account.json`

3. **Run the Backup Script**
   ```bash
   node scripts/backup-all-firebase-data.js
   ```

## 📁 What Gets Backed Up

The backup includes all Firebase Firestore collections:

- **Users** - User accounts and profiles
- **Deals** - Sales deals and transactions  
- **Callbacks** - Customer callbacks and notes
- **Sales** - Sales records and data
- **Targets** - Sales targets and goals
- **Team Targets** - Team-based targets
- **Notifications** - System notifications
- **Settings** - Application settings

## 📄 Backup File Structure

After running a backup, you'll get these files:

```
database/backups/
├── firebase-complete-backup-YYYY-MM-DDTHH-MM-SS.json    # Complete backup
├── backup-info-YYYY-MM-DDTHH-MM-SS.json                 # Backup metadata
├── backup-report-YYYY-MM-DDTHH-MM-SS.txt                # Human-readable report
├── users-backup-YYYY-MM-DDTHH-MM-SS.json                # Individual collections
├── deals-backup-YYYY-MM-DDTHH-MM-SS.json
├── callbacks-backup-YYYY-MM-DDTHH-MM-SS.json
├── sales-backup-YYYY-MM-DDTHH-MM-SS.json
├── targets-backup-YYYY-MM-DDTHH-MM-SS.json
├── notifications-backup-YYYY-MM-DDTHH-MM-SS.json
└── settings-backup-YYYY-MM-DDTHH-MM-SS.json
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PROJECT_ID=your-project-id
```

### Customizing Collections

Edit the collections list in the backup scripts:

```javascript
const COLLECTIONS = [
  'users',
  'deals', 
  'callbacks',
  'sales',
  'targets',
  'team_targets',
  'notifications',
  'settings'
];
```

## 📊 Backup Data Format

Each document in the backup includes:

```json
{
  "id": "document-id",
  "field1": "value1",
  "field2": "value2",
  "_backup_metadata": {
    "collection": "collection-name",
    "document_id": "document-id",
    "backup_timestamp": "2024-01-01T12:00:00.000Z",
    "document_path": "collection-name/document-id"
  }
}
```

## 🛡️ Security Considerations

1. **Service Account Key**
   - Keep your `firebase-service-account.json` file secure
   - Never commit it to version control
   - Add it to your `.gitignore` file

2. **Backup Files**
   - Store backup files in a secure location
   - Consider encrypting sensitive backups
   - Regularly clean up old backup files

3. **Access Control**
   - Only allow admin/manager users to create backups
   - Implement proper authentication for backup endpoints

## 🔄 Restoring Data

The backup files are in JSON format and can be used to:

1. **Manual Restoration**
   - Parse the JSON files
   - Use Firebase Admin SDK to restore documents

2. **Migration**
   - Use backup files to migrate to a new Firebase project
   - Import data into other database systems

3. **Data Analysis**
   - Analyze backup files for reporting
   - Extract specific data for business intelligence

## 📝 Automation

### Scheduled Backups

Add to your `package.json`:

```json
{
  "scripts": {
    "backup": "node scripts/backup-all-firebase-data.js",
    "backup:daily": "node scripts/backup-all-firebase-data.js"
  }
}
```

### Cron Job (Linux/Mac)

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/your/project && npm run backup
```

### Windows Task Scheduler

Create a scheduled task to run:
```cmd
cd C:\path\to\your\project && npm run backup
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check Firebase service account permissions
   - Ensure the service account has Firestore read access

2. **Network Errors**
   - Check internet connection
   - Verify Firebase project URL is correct

3. **Large Collections**
   - For very large collections, consider pagination
   - Monitor Firebase quota limits

4. **File System Errors**
   - Ensure backup directory has write permissions
   - Check available disk space

### Error Messages

- `Service account file not found` - Download and place the service account key file
- `Permission denied` - Check Firebase IAM permissions
- `Network timeout` - Check internet connection and Firebase project status

## 📞 Support

If you encounter issues:

1. Check the backup report file for detailed information
2. Review the console output for error messages
3. Verify your Firebase configuration
4. Ensure all dependencies are installed

## 🎯 Best Practices

1. **Regular Backups**
   - Schedule daily or weekly backups
   - Test restore procedures regularly

2. **Storage Management**
   - Archive old backups to cloud storage
   - Keep at least 3 recent backups locally

3. **Monitoring**
   - Set up alerts for backup failures
   - Monitor backup file sizes for anomalies

4. **Documentation**
   - Document your backup and restore procedures
   - Keep track of backup schedules and retention policies

---

## 📋 Quick Command Reference

```bash
# Install dependencies
npm install firebase-admin

# Run backup
node scripts/backup-all-firebase-data.js

# List existing backups
ls -la database/backups/

# Check backup size
du -sh database/backups/

# View backup report
cat database/backups/backup-report-*.txt
```

Happy backing up! 🎉
