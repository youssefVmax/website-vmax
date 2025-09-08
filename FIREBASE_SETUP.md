# Firebase Integration Setup Guide

This application has been fully integrated with Firebase for real-time data management. All data operations now use Firebase Firestore instead of local CSV files.

## 🔥 Firebase Configuration

The Firebase configuration is already set up in `/lib/firebase.ts` with your project credentials:

- **Project ID**: website-vamx
- **Auth Domain**: website-vamx.firebaseapp.com
- **Storage Bucket**: website-vamx.firebasestorage.app

## 📊 Data Structure

### Collections in Firestore:

1. **sales** - All sales/deals data
2. **users** - User accounts and profiles
3. **notifications** - System notifications
4. **targets** - Sales targets for users
5. **settings** - User preferences and settings

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install firebase
```

### 2. Set up Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `website-vamx`
3. Navigate to Firestore Database
4. Create a database in production mode
5. Set up the following security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all authenticated users
    match /{document=**} {
      allow read, write: if true; // Change this for production
    }
  }
}
```

### 3. Migrate Existing Data

To migrate your existing CSV data to Firebase:

```bash
# Option 1: Use the API endpoint
curl -X POST http://localhost:3000/api/migrate

# Option 2: Run the migration script directly
npx ts-node scripts/migrate-to-firebase.ts
```

### 4. Start the Application

```bash
npm run dev
```

## 🔄 Data Migration

The migration process will:

1. **Sales Data**: Convert CSV data from `public/data/aug-ids-new.csv` to Firestore
2. **Users**: Create sample users for testing
3. **Notifications**: Add welcome notifications

### Sample Users Created:

- **Manager**: manager@vmax.com (role: manager)
- **Salesman**: john@vmax.com (role: salesman)
- **Support**: jane@vmax.com (role: customer-service)

## 📡 API Endpoints

### Firebase-based APIs:

- `GET /api/firebase/sales` - Fetch sales data
- `POST /api/firebase/sales` - Create new sale
- `PUT /api/firebase/sales` - Update sale
- `DELETE /api/firebase/sales` - Delete sale

- `GET /api/firebase/users` - Fetch user data
- `POST /api/firebase/users` - Create user
- `PUT /api/firebase/users` - Update user

- `GET /api/firebase/notifications` - Fetch notifications
- `POST /api/firebase/notifications` - Create notification
- `PATCH /api/firebase/notifications` - Mark as read

- `GET /api/firebase/targets` - Fetch targets
- `POST /api/firebase/targets` - Create target
- `PUT /api/firebase/targets` - Update target

- `GET /api/firebase/settings` - Fetch user settings
- `PUT /api/firebase/settings` - Update settings

### Legacy APIs (Updated to use Firebase):

- `GET /api/deals` - Now uses Firebase
- `POST /api/deals` - Now uses Firebase
- `PUT /api/deals` - Now uses Firebase
- `DELETE /api/deals` - Now uses Firebase

## 🔧 Components Updated

### Hooks:
- `useFirebaseSalesData` - Real-time sales data with Firebase
- Replaces `useSalesData` in all components

### Components:
- `full-page-dashboard.tsx` - Updated to use Firebase hooks
- `sales-dashboard.tsx` - Updated to use Firebase hooks  
- `my-deals-table.tsx` - Updated to use Firebase hooks

## 🎯 Features

### Real-time Updates
- All data changes are reflected immediately across all connected clients
- No need for manual refresh or polling

### Role-based Data Access
- **Manager**: Access to all data
- **Salesman**: Access to own deals only
- **Customer Service**: Access to deals they're closing

### Data Validation
- Server-side validation for all data operations
- Type safety with TypeScript interfaces

## 🛠️ Development

### Adding New Data Types

1. Define interface in `/types/firebase.ts`
2. Add collection name to `COLLECTIONS` constant
3. Create service functions in `/lib/firebase-services.ts`
4. Create API routes in `/app/api/firebase/[collection]/route.ts`

### Example: Adding a new collection

```typescript
// 1. Add to types/firebase.ts
export interface NewCollection {
  id?: string;
  name: string;
  created_at?: Timestamp;
}

// 2. Add to COLLECTIONS
export const COLLECTIONS = {
  // ... existing collections
  NEW_COLLECTION: 'new_collection'
} as const;

// 3. Add service functions
export const newCollectionService = {
  async getItems(): Promise<NewCollection[]> {
    // Implementation
  }
  // ... other CRUD operations
};
```

## 🔒 Security Considerations

### For Production:
1. Update Firestore security rules to restrict access
2. Implement proper authentication
3. Add data validation rules
4. Set up backup strategies

### Recommended Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Sales data access based on role
    match /sales/{saleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager', 'salesman']);
    }
  }
}
```

## 📈 Performance Optimization

### Indexing
Create composite indexes for common queries:
- `sales`: `[sales_agent_norm, created_at]`
- `sales`: `[closing_agent_norm, created_at]`
- `notifications`: `[userId, created_at]`

### Caching
- Firebase automatically caches data locally
- Offline support is built-in

## 🐛 Troubleshooting

### Common Issues:

1. **Firebase not initialized**: Check if `firebase` package is installed
2. **Permission denied**: Verify Firestore security rules
3. **Data not updating**: Check real-time listeners are properly set up
4. **Migration fails**: Ensure CSV files exist and are properly formatted

### Debug Mode:
Enable Firebase debug logging:
```javascript
import { connectFirestoreEmulator } from 'firebase/firestore';
// Add to firebase.ts for development
if (process.env.NODE_ENV === 'development') {
  // Enable debug logging
}
```

## 📞 Support

For issues related to Firebase integration:
1. Check the browser console for errors
2. Verify Firebase project configuration
3. Ensure all required collections exist in Firestore
4. Check network connectivity to Firebase

---

**Note**: All CSV files in `/public/data/` are now deprecated and can be removed after successful migration to Firebase.
