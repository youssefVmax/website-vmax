USE vmax;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Feedback table for data center communications
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `user_name` VARCHAR(191) NOT NULL,
  `user_role` ENUM('manager', 'team_leader', 'salesman') NOT NULL,
  `feedback_type` ENUM('bug_report', 'feature_request', 'data_issue', 'general', 'urgent') DEFAULT 'general',
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  `status` ENUM('pending', 'in_progress', 'resolved', 'closed') DEFAULT 'pending',
  `assigned_to` VARCHAR(191) NULL,
  `response` TEXT NULL,
  `response_by` VARCHAR(191) NULL,
  `response_at` DATETIME NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_user_role` (`user_role`),
  INDEX `idx_feedback_type` (`feedback_type`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Export permissions table for role-based export access
CREATE TABLE IF NOT EXISTS `export_permissions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `user_role` ENUM('manager', 'team_leader', 'salesman') NOT NULL,
  `export_type` ENUM('deals', 'callbacks', 'targets', 'analytics', 'all') NOT NULL,
  `can_export` TINYINT(1) DEFAULT 0,
  `restrictions` JSON NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_export_type` (`user_id`, `export_type`),
  INDEX `idx_user_role` (`user_role`),
  INDEX `idx_export_type` (`export_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default export permissions
INSERT IGNORE INTO `export_permissions` (`id`, `user_id`, `user_role`, `export_type`, `can_export`, `restrictions`, `created_at`, `updated_at`) VALUES
-- Manager permissions (can export everything)
('exp_001', 'manager_default', 'manager', 'deals', 1, NULL, NOW(), NOW()),
('exp_002', 'manager_default', 'manager', 'callbacks', 1, NULL, NOW(), NOW()),
('exp_003', 'manager_default', 'manager', 'targets', 1, NULL, NOW(), NOW()),
('exp_004', 'manager_default', 'manager', 'analytics', 1, NULL, NOW(), NOW()),
('exp_005', 'manager_default', 'manager', 'all', 1, NULL, NOW(), NOW()),

-- Team Leader permissions (cannot export)
('exp_006', 'team_leader_default', 'team_leader', 'deals', 0, '{"reason": "Team leaders cannot export data"}', NOW(), NOW()),
('exp_007', 'team_leader_default', 'team_leader', 'callbacks', 0, '{"reason": "Team leaders cannot export data"}', NOW(), NOW()),
('exp_008', 'team_leader_default', 'team_leader', 'targets', 0, '{"reason": "Team leaders cannot export data"}', NOW(), NOW()),
('exp_009', 'team_leader_default', 'team_leader', 'analytics', 0, '{"reason": "Team leaders cannot export data"}', NOW(), NOW()),
('exp_010', 'team_leader_default', 'team_leader', 'all', 0, '{"reason": "Team leaders cannot export data"}', NOW(), NOW()),

-- Salesman permissions (cannot export)
('exp_011', 'salesman_default', 'salesman', 'deals', 0, '{"reason": "Salesmen cannot export data"}', NOW(), NOW()),
('exp_012', 'salesman_default', 'salesman', 'callbacks', 0, '{"reason": "Salesmen cannot export data"}', NOW(), NOW()),
('exp_013', 'salesman_default', 'salesman', 'targets', 0, '{"reason": "Salesmen cannot export data"}', NOW(), NOW()),
('exp_014', 'salesman_default', 'salesman', 'analytics', 0, '{"reason": "Salesmen cannot export data"}', NOW(), NOW()),
('exp_015', 'salesman_default', 'salesman', 'all', 0, '{"reason": "Salesmen cannot export data"}', NOW(), NOW());

COMMIT;
