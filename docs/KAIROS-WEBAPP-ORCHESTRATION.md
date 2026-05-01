# KAIROS Webapp Orchestration System

## Vision

A Kanban-based webapp that orchestrates KAIROS agents by:
1. **Ingesting issues** from multiple sources (Jira, GitHub, GitLab, etc)
2. **Managing workflow** via Kanban columns (one per agent)
3. **Enriching issues** as they flow through agent columns
4. **Syncing results** back to original sources
5. **Controlling iterations** manually (for now)

---

## Quick Architecture

```
Issue Sources (Jira/GitHub/GitLab) 
        ↓
    Database (local copy + links)
        ↓
 KANBAN BOARD (7 columns, one per agent)
        ↓
 Backlog → PM → Architect → [Dev: Manual] → Review → Test → Release
        ↓
 Orchestrator calls agents for each column
        ↓
 Outputs stored, user approves/iterates
        ↓
 Sync back to source
```

---

## Key Features

### 1. Multi-Source Issue Ingestion
- Pull from: Jira, GitHub, GitLab, Linear, manual entry
- Store locally with link to original
- Maintain bidirectional sync

### 2. Kanban Workflow
- Column per agent (PM, Architect, Reviewer, Tester, Release)
- Drag-to-move triggers agent execution
- Display agent output inline

### 3. Agent Configuration
- Parse checklist in issue to enable/disable agents
- Or use preset templates (Full, Analysis Only, etc)
- Skip Implementer (no code execution for now)

### 4. Iteration Loop
- User approves or requests changes
- Re-run agent with feedback
- Track versions

### 5. Development Integration Point
- Implementer column is MANUAL
- Developer creates PR/MR locally
- User uploads PR → Resume workflow
- Continue with Review → Test → Release

### 6. Source Sync
- Approved outputs sync back to Jira/GitHub/etc
- Comments posted with analysis
- Issue linked to webapp

---

## Database Schema

### Core Tables

```
issues
├─ id, source (jira|github|gitlab), source_id, source_url
├─ title, description
├─ enabled_agents (JSON: which agents to run)
├─ kanban_column (backlog|pm|architect|review|test|release)
├─ status (backlog|in_progress|done|stuck)
└─ created_at, synced_at

agent_outputs
├─ id, issue_id, agent (pm|architect|etc)
├─ output_data (JSON from agent)
├─ version (iteration count)
├─ status (pending|approved|rejected|synced)
├─ feedback (if rejected, user feedback for re-run)
└─ approved_by, approved_at

sync_log
├─ id, issue_id, direction (import|export)
├─ source, action (created|updated|synced)
├─ status (success|failed)
└─ created_at

issue_links
├─ source_issue_id, source_system
├─ internal_issue_id
├─ linked_pr_mr_id (after dev)
└─ created_at
```

---

## Kanban Columns & Agent Mapping

| Column | Agent | Input | Output | Skip? |
|--------|-------|-------|--------|-------|
| Backlog | - | Ingested issues | Configure agents | No |
| PM | pm-agent | Requirements | Analysis JSON | Optional |
| Architect | architect-agent | PM output | Design spec JSON | Optional |
| Implementer | N/A | Architecture | Code (manual) | YES (default) |
| Review | code-reviewer | PR/MR code | Quality JSON | Optional |
| Test | test-verifier | Tests + code | Coverage JSON | Optional |
| Release | release-planner | Everything | Deployment plan | Optional |

---

## Agent Enable/Disable

### Method 1: Checklist in Issue

```
Issue description contains:
✅ PM Agent
✅ Architect Agent
❌ Implementer Agent
✅ Code Reviewer
✅ Test Verifier
✅ Release Planner
```

### Method 2: Database Config

```json
{
  "pm_agent": true,
  "architect_agent": true,
  "implementer_agent": false,
  "code_reviewer": true,
  "test_verifier": true,
  "release_planner": true
}
```

### Method 3: Preset Templates

```
- "Full Pipeline": All agents enabled
- "Analysis Only": PM + Architect
- "QA Only": Reviewer + Tester
- "Custom": Manual selection
```

---

## Workflow Example

```
1. INGEST
   User: "Add GitHub issue #456"
   → Issue appears in Backlog with agent config form

2. CONFIGURE
   User: Sees checklist from issue
   → Selects which agents to enable
   → Columns appear accordingly

3. PM ANALYSIS
   User: Drag issue Backlog → PM column
   → Orchestrator calls pm-agent
   → Output stored in DB
   → Card shows: [Approve] [Request Changes]

4. ARCHITECT DESIGN
   User: Approve PM, drag to Architect
   → Orchestrator calls architect-agent
   → Output shown in card

5. ARCHITECT ITERATION (if needed)
   User: Click [Request Changes]
   User: "Add webhook handling"
   → Orchestrator re-runs architect-agent
   → Version 2 generated and shown

6. SKIP IMPLEMENTER
   User: Approve architect
   → Issue auto-moves to Review (implementer skipped)

7. WAIT FOR CODE
   Card shows: "Waiting for PR/MR"
   Developer: Creates PR with code
   
8. RESUME FROM PR
   User: Click [Upload PR from GitHub]
   → PR metadata fetched
   → Code imported
   → Move to Review
   
9. CODE REVIEW
   Orchestrator calls code-reviewer on PR code
   → Quality report shown

10. TEST VERIFICATION
    User: Approve review, move to Test
    → test-verifier runs on test files

11. RELEASE PLANNING
    User: Move to Release
    → release-planner generates deployment plan

12. SYNC
    User: Click [Sync All]
    → All approved outputs sync to GitHub
    → Comments posted with analysis
```

---

## API Endpoints

### Issues
```
GET    /api/issues                    # List
GET    /api/issues/{id}               # Detail
POST   /api/issues                    # Create
PUT    /api/issues/{id}               # Update (move column, etc)
GET    /api/issues/{id}/history       # All agent outputs + iterations
```

### Agent Orchestration
```
POST   /api/issues/{id}/run-agent
       { agent: "architect", feedback?: "..." }
       → Trigger agent, store output

PUT    /api/issues/{id}/agent-output/{output_id}
       { status: "approved|rejected", feedback?: "..." }
       → Update output, trigger re-run if needed

POST   /api/issues/{id}/sync
       → Sync approved outputs to source
```

### Kanban
```
PUT    /api/issues/{id}/move
       { column: "architect", position: 3 }
       → Move card, auto-trigger agent if enabled

GET    /api/kanban
       → Full board state
```

### Sources
```
GET    /api/sources/{source}/search
       params: query, status, assignee
       → Search Jira/GitHub/etc

POST   /api/sources/{source}/{source_id}/ingest
       → Fetch and ingest single issue

GET    /api/sources/{source}/{source_id}/sync-status
       → Check if synced back
```

---

## UI: Kanban Board

```
BACKLOG          PM           ARCHITECT        REVIEW          TEST
──────────────────────────────────────────────────────────────────
Issue #1    →  Issue #2    →  Issue #3       (Empty)        (Empty)
[Config]       [✓ Approve]    [↻ Changes]
               [Sync]         [View]

Issue #4                       Issue #5    →  Code Review
[Config]                       v2: [✓]    →  (Waiting for
                               [Sync]         code upload)
                                             [Upload PR]
```

---

## UI: Issue Detail

```
Payment System Integration (#JIRA-1234)

Description: Add Stripe payment processing...

Enabled Agents:
✅ PM ✅ Architect ❌ Implementer ✅ Reviewer ✅ Tester ✅ Release

Agent Outputs:
─────────────
[PM Agent] v1 ✅ Approved
└─ Requirements analysis (JSON)
   [View] [Sync]

[Architect] v2 ⏳ Pending
└─ System design spec
   [View] [Approve] [Request Changes]
   Cost: $0.80

[Code Reviewer] ⏳ Waiting for code
└─ (Awaiting PR/MR)
   [Upload PR] [Upload MR]

Sync Status:
✅ Synced to JIRA (2 min ago)
[Sync Again] [View in JIRA]
```

---

## Development Phase: Manual Resume

### Current Behavior

```
Architect → Design generated
           ↓
Implementer → SKIPPED (no code execution)
           ↓
Developer takes architect spec
        ↓
Creates PR in GitHub/GitLab locally
        ↓
User sees in webapp: "Waiting for code"
        ↓
User clicks [Upload PR from GitHub]
        ↓
PR code imported → Move to Review
        ↓
Continue with Code Reviewer, Tester, Release
```

### Resume Options

```
1. [Upload PR from GitHub]
   - Fetch PR metadata
   - Extract code files
   - Import as PR output

2. [Upload MR from GitLab]
   - Similar to PR

3. [Manual Upload]
   - User pastes code
   - Attach files

Result: Issue moves to REVIEW automatically
        and continues agent flow
```

---

## Configuration: Source APIs

### Jira
```
- API Endpoint: https://your-jira.atlassian.net
- Auth: Email + API token
- Features:
  - Ingest issues via JQL query
  - Post comments with outputs
  - Update custom fields
  - Add labels (e.g., "KAIROS-processed")
```

### GitHub
```
- Auth: OAuth token
- Features:
  - Search issues/PRs
  - Ingest issues
  - Post comments
  - Add labels/milestones
  - Fetch PR code
```

### GitLab
```
- Auth: Personal access token
- Features:
  - Search issues/MRs
  - Post comments
  - Fetch MR code
```

---

## Cost Tracking

Each agent output shows:
```
[Architect] v2 ⏳ Pending
Cost: $0.80
Time: 45 seconds
```

Tracks:
- Per-output cost
- Iteration costs (v1: $0.80, v2: $0.75)
- Total issue cost (sum of all agents)

---

## Implementation Roadmap

### Phase 1: MVP (Core)
- ✅ Database schema
- ✅ API CRUD endpoints
- ✅ Kanban board UI (static columns)
- ✅ Manual issue creation
- ✅ Manual column movement
- ✅ Approval buttons

### Phase 2: Source Integration
- ✅ Jira API ingest + sync
- ✅ GitHub API ingest + sync
- ✅ GitLab API ingest + sync
- ✅ Link tracking

### Phase 3: Agent Orchestration
- ✅ API calls to orchestrator
- ✅ Output parsing + storage
- ✅ Cost tracking
- ✅ Iteration loop

### Phase 4: Development Integration
- ✅ Manual PR/MR upload
- ✅ Resume from code
- ✅ Auto-move on code availability

### Phase 5: Polish
- ✅ Webhook auto-sync from sources
- ✅ Preset templates
- ✅ Batch operations
- ✅ Dashboard/analytics

---

## Tech Stack

### Frontend
- React / Vue
- Kanban library (react-beautiful-dnd)
- Tailwind CSS
- WebSockets / Server-Sent Events

### Backend
- FastAPI / Django
- PostgreSQL + JSONB
- Redis (caching)

### Integration
- LLM: Anthropic / OpenRouter
- External APIs: Jira, GitHub, GitLab SDKs
- Webhooks for real-time sync

---

## Conclusion

This webapp transforms KAIROS into a **visual, collaborative orchestration system**:
- Manage issues from multiple sources
- See agent analysis in real-time
- Iterate on quality
- Sync back automatically
- Keep development manual (for now)
- Full audit trail

Ready to pass to an LLM for implementation! 🚀

