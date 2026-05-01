# KAIROS Webapp - Complete Documentation Index

**Version:** 1.2 (MVP + Plugin System + Per-User Config)
**Created:** April 2026
**Updated:** April 27, 2026
**Total:** 10 documents (Per-User Config integrated into PLUGIN-SYSTEM-DESIGN.md)

---

## Implementation Status (Backend)

- Core plugin architecture delivered (PR1-PR6)
- Plugin tables and provider resolution active
- Admin endpoints for providers/plugins/bindings/credentials active
- Legacy data backfill migration added and idempotent
- Audit log and local package security policy integrated
- **Per-user agent configuration system active**
- TypeScript compile status: clean (`npx tsc --noEmit`)

---

## 📚 Reading Guide

### For Quick Start (30 min)

1. **Start here:** KAIROS-WEBAPP-ORCHESTRATION.md (5 min)
   - What is KAIROS webapp?
   - Kanban board workflow
   - Multi-source issue ingestion

2. **Then architecture:** ARCHITECTURE.md (15 min)
   - Tech stack overview
   - Framework choice (Fastify selected)
   - Folder structure

3. **Finally database:** DATABASE-SCHEMA.md (10 min)
   - 8 tables (MVP-focused)
   - Quick schema overview
   - Example queries

---

### For Full Implementation (2-3 hours)

**Phase 1: Backend Setup** (1 hour)
1. ARCHITECTURE.md - Complete read
2. NESTJS-MIKROORM-DEEP-DIVE.md - Setup + examples
3. AUTHENTICATION-STRATEGY.md - Auth choice + implementation

**Phase 2: Data Layer** (30 min)
1. DATABASE-SCHEMA.md - Complete table definitions
2. NESTJS-MIKROORM-DEEP-DIVE.md - Entity mapping section

**Phase 3: API Layer** (1 hour)
1. REQUEST-RESPONSE-PATTERN.md - Naming conventions + mappers
2. MAPPING-LAYER-PATTERN.md - Complete layer flow

**Phase 4: Features** (30 min)
1. PLUGIN-SYSTEM-DESIGN.md - Custom agent creation
2. AGENT-STRATEGY-ANALYSIS.md - Direct API usage

---

## 📄 Document Descriptions

### 1. KAIROS-WEBAPP-ORCHESTRATION.md (11 KB)
**What:** The business view of KAIROS webapp  
**Topics:**
- Kanban board architecture
- Multi-source issue ingestion (Jira, GitHub, GitLab)
- Agent orchestration flow
- Direct API strategy (not LangChain)
- Webhook support

**Read if:** You want to understand what the webapp does

---

### 2. AGENT-STRATEGY-ANALYSIS.md (22 KB)
**What:** Why Direct API > LangChain for KAIROS  
**Topics:**
- Cost comparison (Direct API cheaper)
- Implementation patterns
- Per-provider routing logic
- Team coordination patterns

**Read if:** You're deciding on implementation strategy

---

### 3. PLUGIN-SYSTEM-DESIGN.md (33 KB)
**What:** How users create custom agents and configure them  
**Topics:**
- Three plugin types (provider, agent, tool)
- Configuration management
- Admin panel design
- Plugin development guide
- Hot-reload capability

**Read if:** You want custom agent creation to be flexible

---

### 4. ARCHITECTURE.md (44 KB)
**What:** Complete tech stack and project structure  
**Topics:**
- NestJS + Fastify + MikroORM + Postgres
- 10 alternative frameworks comparison
- Complete folder structure (100+ files)
- JWT authentication flow
- Error handling + middleware
- Testing strategy
- Deployment architecture

**Read if:** You need complete technical overview

---

### 5. NESTJS-MIKROORM-DEEP-DIVE.md (27 KB)
**What:** Why MikroORM for C# developers + full setup  
**Topics:**
- MikroORM vs Prisma (for C# devs)
- Entity definition with decorators
- Repository pattern
- Unit of Work transactions
- Complete working examples
- Database migrations

**Read if:** You're implementing the backend

---

### 6. MAPPING-LAYER-PATTERN.md (25 KB)
**What:** Entity ↔ DTO ↔ ViewModel mapping  
**Topics:**
- Three mapping layers clearly separated
- C# AutoMapper comparison
- Mapper interfaces
- Nested mappings
- Testing mappers
- Best practices

**Read if:** You want clean layer separation

---

### 7. REQUEST-RESPONSE-PATTERN.md (36 KB)
**What:** HTTP contract naming convention  
**Topics:**
- IssueCreateRequest (input) naming
- IssueResponse (output) naming
- Complete request/response classes
- Request mappers (Request → DTO)
- Response mappers (DTO → Response)
- Full controller implementation
- Example workflows

**Read if:** You're building HTTP endpoints

---

### 8. AUTHENTICATION-STRATEGY.md (16 KB)
**What:** Three auth options and how they affect database  
**Topics:**
- Option 1: Built-in JWT (recommended)
  - Database tables: users + refresh_tokens
  - Full implementation example
- Option 2: External service (Auth0, Firebase)
  - Minimal database tables
- Option 3: OAuth2 (GitHub, Google)
  - Social login approach
- Comparison table

**Read if:** You're choosing authentication approach

---

### 9. DATABASE-SCHEMA.md (24 KB)
**What:** MVP database design (ORM-agnostic)  
**Topics:**
- 8 tables for MVP
- Detailed field descriptions
- Relationships and constraints
- Indexes strategy
- Example queries
- Data types (PostgreSQL)
- What was removed for MVP
- Migration path for future features

**Read if:** You need to understand the database

---



## 🗂️ Dependency Map

```
START HERE
   ↓
KAIROS-WEBAPP-ORCHESTRATION.md
   ↓
ARCHITECTURE.md ← Read for overall understanding
   ├─ Then: NESTJS-MIKROORM-DEEP-DIVE.md (backend)
   ├─ Then: AUTHENTICATION-STRATEGY.md (auth)
   └─ Then: DATABASE-SCHEMA.md (data)
   
For API:
   ├─ REQUEST-RESPONSE-PATTERN.md (naming)
   ├─ MAPPING-LAYER-PATTERN.md (separation)
   └─ AGENT-STRATEGY-ANALYSIS.md (routing)

For extensibility:
   ├─ PLUGIN-SYSTEM-DESIGN.md (custom agents + per-user config)
   └─ KAIROS-WEBAPP-ORCHESTRATION.md (workflows)
```

---

## 🎯 By Role

### Backend Developer

**Must read:**
1. ARCHITECTURE.md
2. NESTJS-MIKROORM-DEEP-DIVE.md
3. DATABASE-SCHEMA.md
4. REQUEST-RESPONSE-PATTERN.md
5. MAPPING-LAYER-PATTERN.md
6. AUTHENTICATION-STRATEGY.md
7. PLUGIN-SYSTEM-DESIGN.md (includes Per-User Agent Configuration)

**Nice to have:**
- AGENT-STRATEGY-ANALYSIS.md

### Frontend Developer

**Must read:**
1. KAIROS-WEBAPP-ORCHESTRATION.md
2. REQUEST-RESPONSE-PATTERN.md (API contract)
3. PLUGIN-SYSTEM-DESIGN.md (custom agent UI)

**Nice to have:**
- ARCHITECTURE.md (overall context)
- DATABASE-SCHEMA.md (data understanding)

### Project Manager

**Must read:**
1. KAIROS-WEBAPP-ORCHESTRATION.md
2. PLUGIN-SYSTEM-DESIGN.md

**Nice to have:**
- ARCHITECTURE.md (scope understanding)

### DevOps / Infrastructure

**Must read:**
1. ARCHITECTURE.md (tech stack + deployment)
2. DATABASE-SCHEMA.md (schema migration)

---

## 📊 Key Decisions Made

| Decision | Value |
|----------|-------|
| **Frontend** | Nuxt 4 + Nuxt UI |
| **Backend** | NestJS + Fastify adapter |
| **ORM** | MikroORM (C# developer friendly) |
| **Database** | PostgreSQL 16+ |
| **Auth** | Built-in JWT (recommended) |
| **API strategy** | Direct API (not LangChain) |
| **Agent creation** | User-defined (table-based) |
| **Mapping layers** | Entity → DTO → Response |
| **MVP scope** | 8 tables (simplified) |
| **Logging** | Application logger (no SyncLog table) |

---

## 🚀 Implementation Order

### Week 1: Foundation
- [ ] Choose authentication (AUTHENTICATION-STRATEGY.md)
- [ ] Set up NestJS + Fastify + MikroORM
- [ ] Create database schema (DATABASE-SCHEMA.md)
- [ ] Implement User + Auth endpoints

### Week 2: Core Features
- [ ] Issue CRUD (REQUEST-RESPONSE-PATTERN.md)
- [ ] Kanban board backend (KAIROS-WEBAPP-ORCHESTRATION.md)
- [ ] Mapping layers (MAPPING-LAYER-PATTERN.md)
- [ ] Agent CRUD (custom agents)

### Week 3: Integration
- [ ] Agent execution (AGENT-STRATEGY-ANALYSIS.md)
- [ ] Cost tracking
- [ ] Frontend integration (REQUEST-RESPONSE-PATTERN.md)
- [ ] Plugin system basics (PLUGIN-SYSTEM-DESIGN.md)

### Week 4+: Polish
- [ ] Multi-source ingestion (Jira, GitHub)
- [ ] Advanced plugin features
- [ ] Testing + documentation
- [ ] Deployment

---

## 💡 Important Concepts

### MVP Database (8 Tables)
- users (auth)
- refresh_tokens (JWT)
- issues (Kanban board)
- agents (user-created)
- agent_outputs (execution results)
- agent_configurations (settings)
- provider_credentials (API keys)
- cost_logs (analytics)

### Removed for MVP (Add Later)
- ❌ SyncLog table (use logger)
- ❌ IssueLink table (use linkedPrMrUrl)
- ❌ Issue.priority (not in scope)
- ❌ Issue.kanbanPosition (order by created_at)
- ❌ Issue.enabledAgents (run all agents)

### Three Layers
```
HTTP (Request/Response)
   ↓ Mapper
DTO (Services)
   ↓ Mapper
Entity (Database)
```

### Authentication Options
1. **Built-in JWT** (recommended for MVP)
   - Simple, no dependencies
   - users + refresh_tokens tables
   
2. **External service** (Auth0, Firebase)
   - Better for scaling
   - Only externalId in users table
   
3. **OAuth2** (GitHub, Google)
   - Social login
   - provider info in users table

---

## 📞 FAQ

**Q: Where do I start?**  
A: Read KAIROS-WEBAPP-ORCHESTRATION.md first (5 min), then ARCHITECTURE.md (15 min)

**Q: Which ORM should I use?**  
A: MikroORM (C# devs will love it). See NESTJS-MIKROORM-DEEP-DIVE.md

**Q: How do I create custom agents?**  
A: See PLUGIN-SYSTEM-DESIGN.md + agent CRUD endpoints

**Q: What about multi-source sync (Jira, GitHub)?**  
A: In KAIROS-WEBAPP-ORCHESTRATION.md. For MVP, basic webhook support

**Q: Is the database ORM-specific?**  
A: No! DATABASE-SCHEMA.md is ORM-agnostic. Works with MikroORM, TypeORM, etc.

**Q: How do I organize Request/Response DTOs?**  
A: See REQUEST-RESPONSE-PATTERN.md. Use suffix: IssueCreateRequest, IssueResponse

**Q: How do I structure mapping?**  
A: See MAPPING-LAYER-PATTERN.md. Three layers: Request → DTO → Entity

**Q: What auth should I use?**  
A: Built-in JWT for MVP. See AUTHENTICATION-STRATEGY.md for options

---

## 📦 File Manifest

```
1. KAIROS-WEBAPP-ORCHESTRATION.md   (11 KB) ← Start here
2. AGENT-STRATEGY-ANALYSIS.md       (22 KB)
3. PLUGIN-SYSTEM-DESIGN.md          (33 KB)
4. ARCHITECTURE.md                  (44 KB)
5. NESTJS-MIKROORM-DEEP-DIVE.md     (27 KB)
6. MAPPING-LAYER-PATTERN.md         (25 KB)
7. REQUEST-RESPONSE-PATTERN.md      (36 KB)
8. AUTHENTICATION-STRATEGY.md       (16 KB)
9. DATABASE-SCHEMA.md               (24 KB)

Total: ~240 KB, 9 documents
```

---

## ✅ Checklist Before Coding

- [ ] Read KAIROS-WEBAPP-ORCHESTRATION.md
- [ ] Read ARCHITECTURE.md
- [ ] Choose authentication (AUTHENTICATION-STRATEGY.md)
- [ ] Read DATABASE-SCHEMA.md
- [ ] Understand REQUEST-RESPONSE-PATTERN.md
- [ ] Understand MAPPING-LAYER-PATTERN.md
- [ ] Read NESTJS-MIKROORM-DEEP-DIVE.md
- [ ] Plan initial sprint

---

**You're ready to build! 🚀**

Questions? Review the specific document sections listed above.
