USE vmax;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Analytics aggregation table for better performance
CREATE TABLE IF NOT EXISTS `analytics_cache` (
  `id` VARCHAR(191) NOT NULL,
  `cache_key` VARCHAR(255) NOT NULL,
  `user_role` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `team_name` VARCHAR(191) NULL,
  `date_range` VARCHAR(50) NOT NULL,
  `total_deals` BIGINT DEFAULT 0,
  `total_revenue` BIGINT DEFAULT 0,
  `average_deal_size` DOUBLE DEFAULT 0,
  `total_callbacks` BIGINT DEFAULT 0,
  `pending_callbacks` BIGINT DEFAULT 0,
  `completed_callbacks` BIGINT DEFAULT 0,
  `conversion_rate` DOUBLE DEFAULT 0,
  `top_agents` JSON NULL,
  `service_distribution` JSON NULL,
  `team_distribution` JSON NULL,
  `daily_trend` JSON NULL,
  `recent_deals` JSON NULL,
  `recent_callbacks` JSON NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_cache_key` (`cache_key`),
  INDEX `idx_user_role` (`user_role`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_team_name` (`team_name`),
  INDEX `idx_date_range` (`date_range`),
  INDEX `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily analytics summary table
CREATE TABLE IF NOT EXISTS `daily_analytics` (
  `id` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `team_name` VARCHAR(191) NULL,
  `sales_agent_id` VARCHAR(191) NULL,
  `sales_agent_name` VARCHAR(191) NULL,
  `deals_count` BIGINT DEFAULT 0,
  `deals_revenue` BIGINT DEFAULT 0,
  `callbacks_count` BIGINT DEFAULT 0,
  `callbacks_completed` BIGINT DEFAULT 0,
  `new_customers` BIGINT DEFAULT 0,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_agent` (`date`, `sales_agent_id`),
  INDEX `idx_date` (`date`),
  INDEX `idx_team_name` (`team_name`),
  INDEX `idx_sales_agent` (`sales_agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Monthly analytics summary table
CREATE TABLE IF NOT EXISTS `monthly_analytics` (
  `id` VARCHAR(191) NOT NULL,
  `year` INT NOT NULL,
  `month` INT NOT NULL,
  `team_name` VARCHAR(191) NULL,
  `sales_agent_id` VARCHAR(191) NULL,
  `sales_agent_name` VARCHAR(191) NULL,
  `deals_count` BIGINT DEFAULT 0,
  `deals_revenue` BIGINT DEFAULT 0,
  `callbacks_count` BIGINT DEFAULT 0,
  `callbacks_completed` BIGINT DEFAULT 0,
  `target_amount` BIGINT DEFAULT 0,
  `target_deals` BIGINT DEFAULT 0,
  `target_achievement_percent` DOUBLE DEFAULT 0,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_monthly_agent` (`year`, `month`, `sales_agent_id`),
  INDEX `idx_year_month` (`year`, `month`),
  INDEX `idx_team_name` (`team_name`),
  INDEX `idx_sales_agent` (`sales_agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance metrics table for KPIs
CREATE TABLE IF NOT EXISTS `performance_metrics` (
  `id` VARCHAR(191) NOT NULL,
  `metric_type` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL, -- 'user', 'team', 'company'
  `entity_id` VARCHAR(191) NULL,
  `period_type` VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `metric_value` DOUBLE NOT NULL,
  `metric_target` DOUBLE NULL,
  `achievement_percent` DOUBLE NULL,
  `rank_position` INT NULL,
  `created_at` DATETIME NULL,
  `updated_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_metric` (`metric_type`, `entity_type`, `entity_id`, `period_type`, `period_start`),
  INDEX `idx_metric_type` (`metric_type`),
  INDEX `idx_entity` (`entity_type`, `entity_id`),
  INDEX `idx_period` (`period_type`, `period_start`, `period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stored procedures for analytics calculations
DELIMITER //

-- Procedure to refresh daily analytics
CREATE PROCEDURE IF NOT EXISTS RefreshDailyAnalytics(IN target_date DATE)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Delete existing data for the date
    DELETE FROM daily_analytics WHERE date = target_date;

    -- Insert fresh daily analytics
    INSERT INTO daily_analytics (
        id, date, team_name, sales_agent_id, sales_agent_name,
        deals_count, deals_revenue, callbacks_count, callbacks_completed,
        new_customers, created_at, updated_at
    )
    SELECT 
        CONCAT('daily_', target_date, '_', COALESCE(d.SalesAgentID, 'unknown')) as id,
        target_date as date,
        d.sales_team as team_name,
        d.SalesAgentID as sales_agent_id,
        d.sales_agent as sales_agent_name,
        COUNT(DISTINCT d.id) as deals_count,
        COALESCE(SUM(d.amount_paid), 0) as deals_revenue,
        COUNT(DISTINCT c.id) as callbacks_count,
        COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as callbacks_completed,
        COUNT(DISTINCT d.customer_name) as new_customers,
        NOW() as created_at,
        NOW() as updated_at
    FROM deals d
    LEFT JOIN callbacks c ON c.SalesAgentID = d.SalesAgentID AND DATE(c.created_at) = target_date
    WHERE DATE(d.created_at) = target_date
    GROUP BY d.SalesAgentID, d.sales_team, d.sales_agent;

    COMMIT;
END //

-- Procedure to refresh monthly analytics
CREATE PROCEDURE IF NOT EXISTS RefreshMonthlyAnalytics(IN target_year INT, IN target_month INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Delete existing data for the month
    DELETE FROM monthly_analytics WHERE year = target_year AND month = target_month;

    -- Insert fresh monthly analytics
    INSERT INTO monthly_analytics (
        id, year, month, team_name, sales_agent_id, sales_agent_name,
        deals_count, deals_revenue, callbacks_count, callbacks_completed,
        target_amount, target_deals, target_achievement_percent,
        created_at, updated_at
    )
    SELECT 
        CONCAT('monthly_', target_year, '_', target_month, '_', COALESCE(d.SalesAgentID, 'unknown')) as id,
        target_year as year,
        target_month as month,
        d.sales_team as team_name,
        d.SalesAgentID as sales_agent_id,
        d.sales_agent as sales_agent_name,
        COUNT(DISTINCT d.id) as deals_count,
        COALESCE(SUM(d.amount_paid), 0) as deals_revenue,
        COUNT(DISTINCT c.id) as callbacks_count,
        COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as callbacks_completed,
        COALESCE(t.monthlyTarget, 0) as target_amount,
        COALESCE(t.dealsTarget, 0) as target_deals,
        CASE 
            WHEN t.monthlyTarget > 0 THEN (SUM(d.amount_paid) / t.monthlyTarget) * 100
            ELSE 0 
        END as target_achievement_percent,
        NOW() as created_at,
        NOW() as updated_at
    FROM deals d
    LEFT JOIN callbacks c ON c.SalesAgentID = d.SalesAgentID 
        AND YEAR(c.created_at) = target_year 
        AND MONTH(c.created_at) = target_month
    LEFT JOIN targets t ON t.agentId = d.SalesAgentID
    WHERE YEAR(d.created_at) = target_year AND MONTH(d.created_at) = target_month
    GROUP BY d.SalesAgentID, d.sales_team, d.sales_agent, t.monthlyTarget, t.dealsTarget;

    COMMIT;
END //

DELIMITER ;

-- Create indexes for better performance on existing tables
CREATE INDEX IF NOT EXISTS `idx_deals_sales_agent_id` ON `deals`(`SalesAgentID`);
CREATE INDEX IF NOT EXISTS `idx_deals_closing_agent_id` ON `deals`(`ClosingAgentID`);
CREATE INDEX IF NOT EXISTS `idx_deals_amount_paid` ON `deals`(`amount_paid`);
CREATE INDEX IF NOT EXISTS `idx_deals_created_date` ON `deals`(DATE(`created_at`));
CREATE INDEX IF NOT EXISTS `idx_deals_signup_date` ON `deals`(`signup_date`);

CREATE INDEX IF NOT EXISTS `idx_callbacks_sales_agent_id` ON `callbacks`(`SalesAgentID`);
CREATE INDEX IF NOT EXISTS `idx_callbacks_created_date` ON `callbacks`(DATE(`created_at`));
CREATE INDEX IF NOT EXISTS `idx_callbacks_scheduled_date` ON `callbacks`(`scheduled_date`);

CREATE INDEX IF NOT EXISTS `idx_targets_agent_id` ON `targets`(`agentId`);
CREATE INDEX IF NOT EXISTS `idx_targets_manager_id` ON `targets`(`managerId`);

COMMIT;
