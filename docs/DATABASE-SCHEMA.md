# KAIROS Webapp Database Schema

## Database Design Principles

**Language/ORM Agnostic** - This schema works with:
- ✅ MikroORM
- ✅ Prisma
- ✅ TypeORM
- ✅ Raw SQL
- ✅ Any other Node ORM

**Design Philosophy:**
- **Normalized** (avoid data duplication)
- **Relational** (proper foreign keys)
- **Indexable** (performance-critical queries)
- **Auditable** (timestamps, tracking)
- **Extensible** (easy to add features)

---

## Update: Plugin System Schema (April 26, 2026)

The original MVP schema in this document remains valid for core entities. The backend now also includes plugin-system tables and audit tracking.

### New tables in production schema

1. `llm_providers`
- Provider catalog (`key`, display name, base URL, metadata, enabled)

2. `llm_provider_credentials`
- User-scoped encrypted credentials
- Unique constraint on `(provider_id, user_id)`

3. `plugins`
- Registry of discovered plugins (built-in and local)
- Includes manifest metadata, source, status, entrypoint

4. `agent_plugin_bindings`
- Links agents to plugins with priority/enable flags
- Optional per-binding model override and JSON config

5. `plugin_audit_log`
- Immutable-style audit events for plugin operations
- Indexed by `event_type`, `created_at`, and principal IDs

### Legacy compatibility

- Legacy `provider_credentials` and `agent_configurations` are preserved for compatibility
- Backfill migration copies legacy data into the new plugin tables
- Backfill rows are tagged so rollback removes only migrated records

---

## Entity Relationship Diagram

```
┌──────────────────┐
│      User        │
├──────────────────┤
│ id (PK)          │
│ email (UNIQUE)   │
│ password         │
│ name             │
│ workspace        │
│ role             │
│ createdAt        │
│ updatedAt        │
└────────┬─────────┘
         │
         │ 1:N
         │
    ┌────▼──────────────────┐
    │      Issue             │
    ├───────────────────────┤
    │ id (PK)               │
    │ createdBy (FK→User)   │
    │ title                 │
    │ description           │
    │ source                │
    │ sourceId              │
    │ kanbanColumn          │
    │ kanbanPosition        │
    │ status                │
    │ priority              │
    │ enabledAgents (JSON)  │
    │ createdAt             │
    │ updatedAt             │
    │ syncedAt              │
    └────┬──────────────────┘
         │
         │ 1:N
         ├──────────────┬─────────────┐
         │              │             │
    ┌────▼──────────┐  ┌▼────────┐  ┌▼──────────┐
    │ AgentOutput   │  │ SyncLog  │  │ IssueLink │
    └───────────────┘  └──────────┘  └───────────┘


┌──────────────────────────┐
│ AgentConfiguration       │
├──────────────────────────┤
│ id (PK)                  │
│ agentType (UNIQUE)       │
│ provider                 │
│ model                    │
│ temperature              │
│ maxTokens               │
│ plugins (ARRAY)          │
│ costLimit                │
│ enabled                  │
│ createdAt                │
│ updatedAt                │
└──────────────────────────┘

┌──────────────────────────┐
│ ProviderCredentials      │
├──────────────────────────┤
│ id (PK)                  │
│ provider (UNIQUE)        │
│ apiKey (ENCRYPTED)       │
│ endpoint                 │
│ extra (JSON)             │
│ isActive                 │
│ createdAt                │
│ updatedAt                │
└──────────────────────────┘

┌──────────────────────────┐
│ RefreshToken             │
├──────────────────────────┤
│ id (PK)                  │
│ userId (FK→User)         │
│ token (UNIQUE)           │
│ expiresAt                │
│ revokedAt                │
│ createdAt                │
└──────────────────────────┘

┌──────────────────────────┐
│ PluginRegistry           │
├──────────────────────────┤
│ id (PK)                  │
│ name (UNIQUE)            │
│ version                  │
│ type                     │
│ pluginType               │
│ status                   │
│ source                   │
│ description              │
│ createdAt                │
│ updatedAt                │
└──────────────────────────┘

┌──────────────────────────┐
│ CostLog                  │
├──────────────────────────┤
│ id (PK)                  │
│ issueId (FK→Issue)       │
│ agent                    │
│ provider                 │
│ model                    │
│ inputTokens              │
│ outputTokens             │
│ cost                     │
│ createdAt                │
└──────────────────────────┘
```

---

## Detailed Table Definitions

### 1. User Table

**Purpose:** Authentication and authorization

```
TABLE: users
├─ id (UUID/CUID)
│  └─ Primary Key
│  └─ Unique identifier for user
│
├─ email (VARCHAR 255)
│  └─ Unique constraint
│  └─ Used for login
│
├─ password (VARCHAR 255)
│  └─ bcrypt hashed (never plain text)
│  └─ Minimum 60 characters for bcrypt
│
├─ name (VARCHAR 255, nullable)
│  └─ Display name
│
├─ workspace (VARCHAR 255)
│  └─ Default: 'default'
│  └─ Multi-tenancy support
│
├─ role (ENUM)
│  └─ ADMIN (full access)
│  └─ USER (normal access)
│  └─ VIEWER (read-only)
│  └─ Default: USER
│
├─ createdAt (TIMESTAMP)
│  └─ Record creation time
│
└─ updatedAt (TIMESTAMP)
   └─ Last update time
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (email)
- INDEX (workspace)
```

---

### 2. RefreshToken Table

**Purpose:** JWT refresh token management

```
TABLE: refresh_tokens
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ userId (UUID/CUID)
│  └─ Foreign Key → users.id
│  └─ ON DELETE CASCADE
│
├─ token (TEXT)
│  └─ Unique constraint
│  └─ Hashed refresh token
│
├─ expiresAt (TIMESTAMP)
│  └─ Token expiration time
│  └─ Used to check if valid
│
├─ revokedAt (TIMESTAMP, nullable)
│  └─ When token was revoked
│  └─ NULL = still valid
│
└─ createdAt (TIMESTAMP)
   └─ Record creation time
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (token)
- INDEX (userId, expiresAt)
- INDEX (revokedAt) -- for cleanup queries
```

**Why separate table:**
- User can have multiple tokens (multi-device login)
- Easy to revoke individual tokens
- Can track token lifecycle

---

### 3. Issue Table

**Purpose:** Core issue/ticket data

```
TABLE: issues
├─ id (UUID/CUID)
│  └─ Primary Key
│  └─ Unique identifier
│
├─ createdBy (UUID/CUID)
│  └─ Foreign Key → users.id
│  └─ ON DELETE CASCADE
│  └─ Who created this issue
│
├─ title (VARCHAR 255)
│  └─ Issue title/summary
│  └─ Required, searchable
│
├─ description (TEXT, nullable)
│  └─ Detailed description
│  └─ Can be NULL for simple issues
│
├─ source (VARCHAR 50)
│  └─ Where issue came from
│  └─ VALUES: 'jira', 'github', 'gitlab', 'manual'
│  └─ Used for multi-source tracking
│
├─ sourceId (VARCHAR 255, nullable)
│  └─ ID from external system
│  └─ Example: Jira issue key 'PROJ-123'
│  └─ Can be NULL for manual issues
│
├─ sourceUrl (VARCHAR 2000, nullable)
│  └─ Link to external issue
│  └─ Example: GitHub issue URL
│
├─ kanbanColumn (VARCHAR 50)
│  └─ Current Kanban column
│  └─ VALUES: 'backlog', 'pm', 'architect', 
│             'review', 'test', 'release'
│  └─ Default: 'backlog'
│  └─ INDEXED (frequently queried)
│
├─ kanbanPosition (INTEGER)
│  └─ Position within column
│  └─ For ordering
│  └─ Default: 0
│
├─ status (VARCHAR 50)
│  └─ Issue status
│  └─ VALUES: 'backlog', 'in_progress', 'done', 'stuck'
│  └─ Default: 'backlog'
│
├─ priority (VARCHAR 50)
│  └─ Issue priority
│  └─ VALUES: 'low', 'medium', 'high', 'critical'
│  └─ Default: 'medium'
│
├─ enabledAgents (JSON)
│  └─ Which agents are enabled for this issue
│  └─ Example: {
│       "pm": true,
│       "architect": true,
│       "implementer": false,
│       "reviewer": true,
│       "tester": true,
│       "release": true
│     }
│
├─ createdAt (TIMESTAMP)
│  └─ When issue was created
│
├─ updatedAt (TIMESTAMP)
│  └─ Last update time
│
└─ syncedAt (TIMESTAMP, nullable)
   └─ When last synced to source
   └─ NULL = never synced yet
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (source, sourceId) -- prevent duplicates from same source
- INDEX (createdBy)
- INDEX (kanbanColumn, kanbanPosition) -- for Kanban queries
- INDEX (source) -- for filtering by source
- INDEX (status) -- for filtering by status
- INDEX (createdAt) -- for sorting
```

**Constraints:**
- source + sourceId must be unique (don't import same issue twice)
- sourceId required if source is not 'manual'

---

### 4. AgentOutput Table

**Purpose:** Store LLM agent execution results

```
TABLE: agent_outputs
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ issueId (UUID/CUID)
│  └─ Foreign Key → issues.id
│  └─ ON DELETE CASCADE
│
├─ agent (VARCHAR 50)
│  └─ Which agent produced this output
│  └─ VALUES: 'pm', 'architect', 'reviewer', 
│             'tester', 'planner'
│
├─ version (INTEGER)
│  └─ Iteration number
│  └─ 1 = first run, 2 = feedback and re-run, etc
│
├─ outputData (JSON)
│  └─ The actual LLM response (structured)
│  └─ Stores agent output in original format
│  └─ Can be large (100KB+)
│
├─ outputMarkdown (TEXT, nullable)
│  └─ Rendered markdown version
│  └─ For display in UI
│  └─ Can be generated from outputData
│
├─ status (VARCHAR 50)
│  └─ Output status
│  └─ VALUES: 'pending', 'approved', 'rejected', 'synced'
│  └─ 'pending' = awaiting review
│  └─ 'approved' = ready to use
│  └─ 'rejected' = feedback given
│  └─ 'synced' = sent back to source
│
├─ approvedBy (UUID/CUID, nullable)
│  └─ Foreign Key → users.id (optional)
│  └─ Who approved this output
│  └─ NULL = not approved yet
│
├─ approvedAt (TIMESTAMP, nullable)
│  └─ When output was approved
│
├─ feedback (TEXT, nullable)
│  └─ Feedback for re-run
│  └─ If rejected, feedback explains why
│
├─ syncedToSource (BOOLEAN)
│  └─ Has been sent back to source system
│  └─ Default: false
│
├─ syncedAt (TIMESTAMP, nullable)
│  └─ When sent to source
│
├─ inputTokens (INTEGER, nullable)
│  └─ Tokens consumed by input
│  └─ For cost calculation
│
├─ outputTokens (INTEGER, nullable)
│  └─ Tokens produced by output
│  └─ For cost calculation
│
├─ cost (DECIMAL, nullable)
│  └─ Actual cost in USD
│  └─ Example: 0.0045
│
└─ createdAt (TIMESTAMP)
   └─ When output was generated
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (issueId, agent, version) -- prevent duplicate versions
- INDEX (issueId) -- for finding outputs for an issue
- INDEX (agent) -- for filtering by agent type
- INDEX (status) -- for finding pending approvals
- INDEX (createdAt) -- for sorting
```

**Why separate table:**
- One issue can have multiple agent outputs
- Need to track versions (feedback cycles)
- Keep issue table lean

---

### 5. SyncLog Table

**Purpose:** Track synchronization with external systems

```
TABLE: sync_logs
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ issueId (UUID/CUID)
│  └─ Foreign Key → issues.id
│  └─ ON DELETE CASCADE
│  └─ Which issue was synced
│
├─ direction (VARCHAR 50)
│  └─ Sync direction
│  └─ VALUES: 'import' (from source), 'export' (to source)
│
├─ source (VARCHAR 50)
│  └─ Which system synced
│  └─ VALUES: 'jira', 'github', 'gitlab'
│
├─ action (VARCHAR 50)
│  └─ What happened
│  └─ VALUES: 'created', 'updated', 'synced'
│
├─ changes (JSON, nullable)
│  └─ What changed during sync
│  └─ Example: {
│       "status": { "old": "backlog", "new": "in_progress" }
│     }
│
├─ status (VARCHAR 50)
│  └─ Sync result status
│  └─ VALUES: 'success', 'failed', 'pending'
│
├─ error (TEXT, nullable)
│  └─ Error message if failed
│  └─ NULL if successful
│
└─ createdAt (TIMESTAMP)
   └─ When sync attempt occurred
```

**Indexes:**
```
- PRIMARY KEY (id)
- INDEX (issueId) -- for finding sync history of issue
- INDEX (source, createdAt) -- for auditing by source
- INDEX (status) -- for finding failed syncs
```

**Why separate table:**
- Keep sync history separate from issue data
- Easy to retry failed syncs
- Full audit trail

---

### 6. IssueLink Table

**Purpose:** Link issues to their PRs/MRs in source systems

```
TABLE: issue_links
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ issueId (UUID/CUID)
│  └─ Foreign Key → issues.id
│  └─ ON DELETE CASCADE
│  └─ The issue in KAIROS
│
├─ sourceSystem (VARCHAR 50)
│  └─ Which system the original issue is from
│  └─ VALUES: 'jira', 'github', 'gitlab'
│
├─ sourceIssueId (VARCHAR 255)
│  └─ The original issue ID in source system
│  └─ Example: 'PROJ-123' for Jira
│
├─ linkedPrMrId (VARCHAR 255, nullable)
│  └─ PR/MR ID created for this issue
│  └─ Example: GitHub PR number '#456'
│
├─ linkedPrMrUrl (VARCHAR 2000, nullable)
│  └─ Full URL to PR/MR
│  └─ For easy linking
│
└─ createdAt (TIMESTAMP)
   └─ When link was created
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (issueId, sourceSystem, sourceIssueId)
- INDEX (sourceIssueId) -- for lookup from source
```

---

### 7. AgentConfiguration Table

**Purpose:** Store agent runtime configuration

```
TABLE: agent_configurations
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ agentType (VARCHAR 50)
│  └─ UNIQUE constraint
│  └─ VALUES: 'pm', 'architect', 'reviewer', 
│             'tester', 'planner'
│
├─ provider (VARCHAR 50)
│  └─ Which LLM provider to use
│  └─ VALUES: 'anthropic', 'openrouter', 'openai', 'ollama'
│
├─ model (VARCHAR 100)
│  └─ Which model to use
│  └─ Example: 'claude-opus-4-6' for Anthropic
│  └─ Example: 'gpt-4-turbo' for OpenAI
│
├─ temperature (DECIMAL)
│  └─ Temperature parameter (0.0 - 1.0)
│  └─ Default: 0.7
│  └─ Affects randomness
│
├─ maxTokens (INTEGER)
│  └─ Maximum tokens in response
│  └─ Default: 2000
│
├─ plugins (ARRAY of VARCHAR)
│  └─ List of plugin names to use
│  └─ Example: ['pm-agent-default', 'code-analyzer']
│  └─ Empty array = use defaults
│
├─ costLimit (DECIMAL, nullable)
│  └─ Maximum cost per execution
│  └─ NULL = no limit
│  └─ Example: 10.00 (USD)
│
├─ enabled (BOOLEAN)
│  └─ Is this agent enabled?
│  └─ Default: true
│  └─ false = skip this agent
│
├─ customConfig (JSON, nullable)
│  └─ Additional agent-specific config
│  └─ Flexible for future use
│
├─ createdAt (TIMESTAMP)
│  └─ When config was created
│
└─ updatedAt (TIMESTAMP)
   └─ Last update time
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (agentType)
```

---

### 8. ProviderCredentials Table

**Purpose:** Store encrypted API keys for providers

```
TABLE: provider_credentials
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ provider (VARCHAR 50)
│  └─ UNIQUE constraint
│  └─ VALUES: 'anthropic', 'openrouter', 'openai', 'ollama'
│
├─ apiKey (TEXT)
│  └─ API key (ENCRYPTED at rest)
│  └─ Never log or expose this
│  └─ Example: 'sk-ant-...'
│
├─ endpoint (VARCHAR 2000, nullable)
│  └─ Custom endpoint URL
│  └─ For Ollama or custom providers
│  └─ Example: 'http://localhost:11434'
│
├─ extra (JSON, nullable)
│  └─ Additional provider-specific config
│  └─ Example: {
│       "baseUrl": "https://custom.endpoint.com",
│       "timeout": 30000
│     }
│
├─ isActive (BOOLEAN)
│  └─ Is this credential active?
│  └─ Default: true
│
├─ createdAt (TIMESTAMP)
│  └─ When credential was added
│
└─ updatedAt (TIMESTAMP)
   └─ Last update time
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (provider)
```

**Security:**
- Always encrypt apiKey before storing
- Never log apiKey
- Use environment variables for initial setup

---

### 9. PluginRegistry Table

**Purpose:** Track installed plugins

```
TABLE: plugin_registry
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ name (VARCHAR 255)
│  └─ UNIQUE constraint
│  └─ Plugin name (slug format)
│  └─ Example: 'pm-agent-custom'
│
├─ version (VARCHAR 50)
│  └─ Plugin version
│  └─ Example: '1.0.0'
│
├─ type (VARCHAR 50)
│  └─ Plugin type
│  └─ VALUES: 'provider', 'agent', 'tool'
│
├─ pluginType (VARCHAR 50)
│  └─ Specific plugin type
│  └─ Example: 'anthropic' (for provider type)
│  └─ Example: 'pm' (for agent type)
│
├─ status (VARCHAR 50)
│  └─ Plugin status
│  └─ VALUES: 'active', 'deprecated', 'beta'
│  └─ Default: 'active'
│
├─ source (VARCHAR 50)
│  └─ Where plugin came from
│  └─ VALUES: 'built-in', 'user', 'marketplace'
│
├─ description (TEXT, nullable)
│  └─ Plugin description
│
├─ docUrl (VARCHAR 2000, nullable)
│  └─ Documentation URL
│
├─ codeUrl (VARCHAR 2000, nullable)
│  └─ Code repository or local path
│
├─ createdBy (UUID/CUID, nullable)
│  └─ Foreign Key → users.id
│  └─ Who created this plugin (for user plugins)
│
├─ createdAt (TIMESTAMP)
│  └─ When plugin was registered
│
└─ updatedAt (TIMESTAMP)
   └─ Last update time
```

**Indexes:**
```
- PRIMARY KEY (id)
- UNIQUE (name, version)
- INDEX (type, pluginType) -- for discovering plugins
- INDEX (source) -- for filtering by source
```

---

### 10. CostLog Table

**Purpose:** Track costs for analytics

```
TABLE: cost_logs
├─ id (UUID/CUID)
│  └─ Primary Key
│
├─ issueId (UUID/CUID, nullable)
│  └─ Foreign Key → issues.id
│  └─ NULL if cost not related to issue
│
├─ agent (VARCHAR 50, nullable)
│  └─ Which agent incurred cost
│
├─ provider (VARCHAR 50)
│  └─ Which provider charged
│  └─ VALUES: 'anthropic', 'openrouter', 'openai', 'ollama'
│
├─ model (VARCHAR 100)
│  └─ Which model was used
│
├─ inputTokens (INTEGER)
│  └─ Tokens in request
│
├─ outputTokens (INTEGER)
│  └─ Tokens in response
│
├─ cost (DECIMAL)
│  └─ Cost in USD
│  └─ Example: 0.0045
│
└─ createdAt (TIMESTAMP)
   └─ When cost was incurred
```

**Indexes:**
```
- PRIMARY KEY (id)
- INDEX (issueId) -- for cost per issue
- INDEX (agent) -- for cost per agent
- INDEX (provider) -- for cost per provider
- INDEX (createdAt) -- for time-based queries
```

---

## Key Design Decisions

### Why these tables?

1. **User + RefreshToken** (separate)
   - Support multi-device login
   - Easy token revocation
   - Track token lifecycle

2. **Issue as single table** (not split)
   - Contains all issue metadata
   - Kanban state, status, priority
   - Simple queries with single table

3. **AgentOutput separate**
   - One issue → many outputs (versions, feedback cycles)
   - Keep issue table lean
   - Easy to query by agent type

4. **SyncLog separate**
   - Complete audit trail
   - History of synchronization
   - Easy to debug sync issues

5. **IssueLink separate**
   - Link issues to PRs/MRs
   - Track external references
   - Support multiple external systems

6. **AgentConfiguration global**
   - One config per agent type
   - Applied to all issues using that agent
   - Easy to change at runtime

7. **ProviderCredentials centralized**
   - One credential per provider
   - Encrypt at rest
   - Easy credential rotation

8. **PluginRegistry**
   - Track all installed plugins
   - Support built-in, user, marketplace
   - Enable/disable plugins

9. **CostLog for analytics**
   - Separate from AgentOutput
   - Time-series data for charts
   - Track spending by provider/agent

### Constraints & Indexes Strategy

**Constraints (Data Integrity):**
- Primary keys (all tables)
- Foreign keys with CASCADE
- Unique constraints (prevent duplicates)

**Indexes (Performance):**
- Foreign keys (always)
- Where clauses (frequently filtered columns)
- Join columns
- Sort columns
- Avoid over-indexing (slows writes)

### Nullable Fields

**Nullable columns:**
- `User.name` - might not have display name
- `Issue.description` - simple issues might not need description
- `Issue.sourceId` - manual issues have no source
- `Issue.sourceUrl` - might not be available
- `Issue.syncedAt` - not synced yet
- `AgentOutput.approvedBy` - not approved yet
- `AgentOutput.approvedAt` - not approved yet
- `AgentOutput.feedback` - no feedback yet
- etc.

**Non-nullable columns:**
- Everything with default values
- Foreign keys (without CASCADE DELETE)
- Required business data

---

## Data Types by Database

### PostgreSQL

```sql
-- String types
VARCHAR(255)     -- limited string
TEXT             -- unlimited string

-- Numeric types
INTEGER          -- whole numbers
DECIMAL(10,2)    -- money/percentages

-- Temporal types
TIMESTAMP        -- date + time
DATE             -- date only

-- Complex types
JSON             -- flexible objects
TEXT[]           -- arrays

-- Special
UUID             -- unique identifier
BOOLEAN          -- true/false
ENUM             -- predefined values
```

### Any SQL Database

Replace PostgreSQL-specific features:
- `UUID` → Use `CHAR(36)` or `VARCHAR(50)`
- `JSON` → Use `TEXT` (serialize as JSON)
- `ENUM` → Use `VARCHAR` with constraints
- `TEXT[]` → Use separate junction table

---

## Example Queries

### Find all issues in PM column

```sql
SELECT id, title, priority, createdByName
FROM issues
WHERE kanbanColumn = 'pm'
ORDER BY kanbanPosition, createdAt DESC
LIMIT 20
```

### Get issue with all outputs

```sql
SELECT 
  i.id, i.title, i.status,
  ao.id as output_id, ao.agent, ao.status as output_status
FROM issues i
LEFT JOIN agent_outputs ao ON i.id = ao.issueId
WHERE i.id = 'issue-123'
ORDER BY ao.version DESC
```

### Cost by agent (last 30 days)

```sql
SELECT 
  agent,
  COUNT(*) as count,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost
FROM cost_logs
WHERE createdAt >= NOW() - INTERVAL '30 days'
GROUP BY agent
ORDER BY total_cost DESC
```

### Find issues pending approval

```sql
SELECT DISTINCT i.id, i.title, i.status
FROM issues i
JOIN agent_outputs ao ON i.id = ao.issueId
WHERE ao.status = 'pending'
  AND ao.approvedAt IS NULL
ORDER BY ao.createdAt ASC
```

---

## Migration Path from Other Systems

### From Jira

- Issue.source = 'jira'
- Issue.sourceId = Jira issue key (e.g., 'PROJ-123')
- Issue.sourceUrl = Jira issue URL
- SyncLog tracks sync attempts

### From GitHub

- Issue.source = 'github'
- Issue.sourceId = GitHub issue number
- Issue.sourceUrl = GitHub issue URL
- IssueLink tracks PR associations

### From Manual

- Issue.source = 'manual'
- Issue.sourceId = NULL
- Issue.sourceUrl = NULL
- Created directly in KAIROS

---

## Conclusion

**This schema provides:**

✅ **Normalized design** (no data duplication)
✅ **Relational integrity** (proper foreign keys)
✅ **Performance** (strategic indexing)
✅ **Audit trail** (timestamps, sync logs)
✅ **Flexibility** (JSON for extensibility)
✅ **Multi-source support** (Jira, GitHub, GitLab)
✅ **Cost tracking** (analytics ready)
✅ **Plugin system** (extensible)

**ORM-agnostic** - works with any TypeScript ORM!
