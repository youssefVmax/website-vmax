# VMAX MySQL Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Database Setup

#### Create the Database
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create the database
CREATE DATABASE IF NOT EXISTS vmax CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vmax;
```

#### Run the Schema Files
```bash
# Run the main schema
mysql -u root -p vmax < database/tables.sql

# Run additional tables and indexes
mysql -u root -p vmax < database/additional_tables.sql
```

### 2. Environment Configuration

#### Update Database Configuration
Edit `api/config.php`:
```php
<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'your_mysql_user');
define('DB_PASS', 'your_mysql_password');
define('DB_NAME', 'vmax');
?>
```

#### Create .env file (if using environment variables)
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=vmax
```

### 3. Web Server Setup

#### Apache Configuration
Ensure your Apache server has:
- PHP 7.4+ with mysqli extension
- mod_rewrite enabled
- Proper document root pointing to your project

#### Nginx Configuration (Alternative)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/vmax/website;
    index index.php index.html;

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
    }
}
```

### 4. Test the Migration

#### Run System Tests
1. Navigate to your application
2. Go to System Test page
3. Run all tests to verify:
   - MySQL connection
   - User authentication
   - Database operations
   - Component integration

#### Manual Verification
1. **Login Test**: Try logging in with manager credentials
2. **Data Creation**: Create a test deal and callback
3. **Team Leader Test**: Test team leader dashboard functionality
4. **Analytics**: Verify analytics and reporting work

### 5. Data Migration (If Needed)

If you have existing Firebase data to migrate:

#### Export Firebase Data
```javascript
// Use Firebase Admin SDK to export data
const admin = require('firebase-admin');
// Export collections: users, deals, callbacks, targets, notifications
```

#### Import to MySQL
```php
// Create import script using the existing API service
// Transform Firebase data format to MySQL schema
```

## 🔧 Configuration Options

### Performance Tuning

#### MySQL Optimization
```sql
-- Optimize MySQL settings
SET GLOBAL innodb_buffer_pool_size = 1G;
SET GLOBAL query_cache_size = 256M;
SET GLOBAL max_connections = 200;
```

#### PHP Optimization
```php
// In php.ini
memory_limit = 256M
max_execution_time = 300
upload_max_filesize = 50M
```

### Security Hardening

#### Database Security
```sql
-- Create dedicated user for the application
CREATE USER 'vmax_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON vmax.* TO 'vmax_user'@'localhost';
FLUSH PRIVILEGES;
```

#### File Permissions
```bash
# Set proper file permissions
chmod 644 api/config.php
chmod 755 api/mysql-service.php
chown www-data:www-data -R /path/to/vmax
```

## 📊 Monitoring & Maintenance

### Database Monitoring
```sql
-- Monitor performance
SHOW PROCESSLIST;
SHOW ENGINE INNODB STATUS;
SELECT * FROM information_schema.INNODB_METRICS;
```

### Backup Strategy
```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p vmax > backups/vmax_backup_$DATE.sql
```

### Log Monitoring
```bash
# Monitor MySQL logs
tail -f /var/log/mysql/error.log

# Monitor PHP logs
tail -f /var/log/php/error.log
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Issues
```php
// Test database connection
<?php
$conn = new mysqli('localhost', 'user', 'password', 'vmax');
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
echo "Connected successfully";
?>
```

#### Permission Issues
```sql
-- Check user permissions
SHOW GRANTS FOR 'vmax_user'@'localhost';

-- Grant missing permissions
GRANT ALL PRIVILEGES ON vmax.* TO 'vmax_user'@'localhost';
```

#### Performance Issues
```sql
-- Check slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Analyze table performance
ANALYZE TABLE deals, callbacks, users;
```

## 🎯 Team Leader Features Verification

### Test Team Leader Functionality
1. **Create Team Leader User**:
   ```sql
   INSERT INTO users (id, username, password, name, role, team, managedTeam, created_by, created_at, updated_at) 
   VALUES ('tl_001', 'team_leader_1', '$2y$10$...', 'Team Leader One', 'team-leader', 'CS TEAM', 'CS TEAM', 'system', NOW(), NOW());
   ```

2. **Verify Dashboard Access**:
   - Login as team leader
   - Check dual dashboard (Personal + Team tabs)
   - Verify team data filtering

3. **Test Permissions**:
   - Create callbacks and deals
   - View team analytics
   - Manage team callbacks

## 📈 Performance Benchmarks

### Expected Performance
- **Login**: < 500ms
- **Dashboard Load**: < 1s
- **Data Queries**: < 200ms
- **Report Generation**: < 2s

### Optimization Tips
1. **Use Indexes**: Ensure all foreign keys are indexed
2. **Query Optimization**: Use EXPLAIN to analyze slow queries
3. **Connection Pooling**: Implement if high concurrent users
4. **Caching**: Add Redis for frequently accessed data

## ✅ Deployment Checklist

- [ ] Database created and schema imported
- [ ] Configuration files updated
- [ ] Web server configured
- [ ] File permissions set
- [ ] System tests passed
- [ ] Team leader functionality verified
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Security hardening completed
- [ ] Performance testing done

## 🎉 Migration Complete!

Your VMAX Sales System is now running on MySQL with:
- ✅ Enhanced performance and reliability
- ✅ Better security and data integrity  
- ✅ Full team leader functionality preserved
- ✅ Comprehensive analytics and reporting
- ✅ Real-time updates and notifications
- ✅ Scalable architecture for future growth

The system maintains all existing functionality while providing a more robust and maintainable foundation for your sales operations.
