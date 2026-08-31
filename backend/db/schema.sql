-- ==============================================================================
-- Hissaby Buddy - Comprehensive Normalized PostgreSQL Schema for Neon DB
-- Architecture: 3NF Normalized, Section-Decoupled, Horizontally Scalable
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- CUSTOM ENUM TYPES
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE workspace_theme AS ENUM ('project', 'family', 'friends', 'team');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE budget_period AS ENUM ('weekly', 'monthly', 'quarterly', 'annual', 'one_time', 'project_lifecycle');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer', 'settlement');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE custom_field_type AS ENUM ('text', 'number', 'currency', 'date', 'boolean', 'select', 'multiselect');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE target_entity_type AS ENUM ('transaction', 'budget', 'document', 'member', 'workspace');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recurring_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE document_ocr_status AS ENUM ('pending', 'processing', 'processed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- TRIGGER FUNCTION: AUTO-UPDATE TIMESTAMP
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- SECTION 1: IDENTITY & PROFILES (IAM)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(128) PRIMARY KEY, -- Firebase UID or internal unique identifier
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(150),
    avatar_url TEXT,
    default_currency VARCHAR(10) DEFAULT 'PKR',
    currency_symbol VARCHAR(10) DEFAULT 'Rs ',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    monthly_budget_goal NUMERIC(15, 2) DEFAULT 0.00,
    dark_mode BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    ai_copilot_personality VARCHAR(50) DEFAULT 'analytical',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- SECTION 2: WORKSPACES & TEAMS (THEMES: PROJECT, FAMILY, FRIENDS, TEAM)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    theme workspace_theme NOT NULL DEFAULT 'team',
    currency VARCHAR(10) DEFAULT 'PKR',
    currency_symbol VARCHAR(10) DEFAULT 'Rs ',
    created_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    color_code VARCHAR(30) DEFAULT '#4F46E5',
    icon_name VARCHAR(50) DEFAULT 'briefcase',
    theme_settings JSONB DEFAULT '{
        "allow_member_invites": true,
        "require_receipts": false,
        "allow_splits": true,
        "milestones_enabled": false,
        "billable_tracking": false
    }'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_theme ON workspaces(theme);

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'member',
    spending_limit NUMERIC(15, 2) DEFAULT NULL, -- NULL means unlimited within budget
    custom_title VARCHAR(100), -- e.g. "Lead Developer", "Dad", "Roommate"
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    CONSTRAINT uq_workspace_user UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    role workspace_role DEFAULT 'member',
    invite_token VARCHAR(128) UNIQUE NOT NULL,
    invited_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, revoked
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(invite_token);

-- ==============================================================================
-- SECTION 3: DYNAMIC CUSTOM FIELDS ENGINE (USER EXTENSIBILITY UX)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL indicates user-wide or system-wide
    created_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    target_entity target_entity_type NOT NULL DEFAULT 'transaction',
    field_name VARCHAR(100) NOT NULL, -- User display label: e.g. "Tax Deductible"
    field_key VARCHAR(100) NOT NULL, -- Normalized machine key: e.g. "tax_deductible"
    field_type custom_field_type NOT NULL DEFAULT 'text',
    description TEXT,
    placeholder TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    options JSONB DEFAULT '[]'::jsonb, -- Choices for 'select' or 'multiselect'
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_field_key UNIQUE (workspace_id, target_entity, field_key)
);

CREATE TRIGGER set_custom_field_definitions_updated_at
BEFORE UPDATE ON custom_field_definitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace ON custom_field_definitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON custom_field_definitions(target_entity);

CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- ID of the transaction, budget, member, or document
    text_value TEXT,
    numeric_value NUMERIC(15, 4),
    date_value TIMESTAMPTZ,
    boolean_value BOOLEAN,
    json_value JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_field_target UNIQUE (field_id, target_id)
);

CREATE TRIGGER set_custom_field_values_updated_at
BEFORE UPDATE ON custom_field_values
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_cfv_target ON custom_field_values(target_id);
CREATE INDEX IF NOT EXISTS idx_cfv_field ON custom_field_values(field_id);

-- ==============================================================================
-- SECTION 4: BUDGETS & SPENDING ALLOCATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL, -- Owner/Creator
    name VARCHAR(150) NOT NULL, -- e.g. "Q3 Development", "Groceries", "Trip to Dubai"
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    period budget_period NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    alert_threshold_percent INT DEFAULT 80, -- Alert when spent >= 80%
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_budgets_workspace ON budgets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

CREATE TABLE IF NOT EXISTS budget_category_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_budget_category UNIQUE (budget_id, category)
);

CREATE INDEX IF NOT EXISTS idx_bca_budget ON budget_category_allocations(budget_id);

-- ==============================================================================
-- SECTION 5: TRANSACTIONS, SPENDINGS & EXPENSE SPLITTING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Recorder
    payer_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL, -- Member who paid
    budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL, -- Tied to team budget
    amount NUMERIC(15, 2) NOT NULL,
    type transaction_type NOT NULL DEFAULT 'expense',
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    description TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    receipt_url TEXT,
    payment_method VARCHAR(50) DEFAULT 'Card',
    status VARCHAR(50) DEFAULT 'cleared',
    is_reconciled BOOLEAN DEFAULT FALSE,
    source VARCHAR(100) DEFAULT 'manual', -- 'manual', 'ocr_upload', 'bank_feed', 'recurring'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_transactions_workspace ON transactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payer ON transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_budget ON transactions(budget_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Normalized splits for Family & Friends themes (Split the bill)
CREATE TABLE IF NOT EXISTS transaction_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    split_amount NUMERIC(15, 2) NOT NULL,
    split_percentage NUMERIC(5, 2),
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tx_user_split UNIQUE (transaction_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tx_splits_tx ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_splits_user ON transaction_splits(user_id);

-- Peer-to-peer settlements
CREATE TABLE IF NOT EXISTS debt_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    payer_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'PKR',
    settlement_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    payment_reference TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_debt_settlements_workspace ON debt_settlements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_debt_settlements_pair ON debt_settlements(payer_id, payee_id);

-- ==============================================================================
-- SECTION 6: RECURRING MONEY & SUBSCRIPTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS recurring_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL DEFAULT 'expense',
    category VARCHAR(100) NOT NULL DEFAULT 'Subscriptions',
    billing_cycle recurring_frequency NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    next_due_date DATE NOT NULL,
    auto_pay BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_recurring_items_updated_at
BEFORE UPDATE ON recurring_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_recurring_workspace ON recurring_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_items(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_items(next_due_date);

-- ==============================================================================
-- SECTION 7: DOCUMENTS & OCR RECEIPTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50), -- pdf, image/jpeg, image/png
    file_size_bytes BIGINT,
    ocr_status document_ocr_status DEFAULT 'pending',
    extracted_vendor VARCHAR(200),
    extracted_amount NUMERIC(15, 2),
    extracted_date TIMESTAMPTZ,
    raw_ocr_data JSONB DEFAULT '{}'::jsonb,
    linked_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_tx ON documents(linked_transaction_id);

-- ==============================================================================
-- SECTION 8: AUDIT LOGS & ACTIVITY FEED
-- ==============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'budget.created', 'spending.added', 'custom_field.created'
    entity_type VARCHAR(50) NOT NULL, -- 'workspace', 'budget', 'transaction', 'custom_field'
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);

-- ==============================================================================
-- INITIAL SEED: DEFAULT SYSTEM CATEGORIES & BASELINE EXTENSIBLE FIELDS
-- ==============================================================================

-- Baseline guest user for seamless guest/demo mode support
INSERT INTO users (id, email, display_name, default_currency, currency_symbol)
VALUES ('guest_user', 'guest@hissaby.local', 'Guest User', 'PKR', 'Rs ')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_settings (user_id, monthly_budget_goal, dark_mode)
VALUES ('guest_user', 50000.00, TRUE)
ON CONFLICT (user_id) DO NOTHING;
