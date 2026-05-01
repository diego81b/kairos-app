# NestJS + Fastify Adapter + MikroORM Deep Dive

## Why This Stack is Perfect for C# Developers

```
Your C# Background:
├─ Entity Framework → MikroORM (same philosophy)
├─ ASP.NET Core → NestJS (batteries included)
├─ Dependency Injection → NestJS built-in
├─ Decorators → TypeScript decorators (familiar)
├─ HttpClient → HTTP module (familiar)
└─ DbContext → EntityManager (similar)

MikroORM vs Prisma for C# developers:

MikroORM feels like Entity Framework:
✅ DbContext-like EntityManager
✅ Unit of Work pattern (repositories)
✅ Lazy loading / eager loading control
✅ Migrations are migrations (not snapshots)
✅ Change tracking (what changed?)
✅ Identity map (1st level cache)

Prisma feels different:
❌ No DbContext equivalent
❌ Schema-first (not code-first)
❌ No explicit Unit of Work
❌ Less control over queries
❌ Different mental model
```

---

## Why MikroORM > Prisma (for C# developers)

### 1. DbContext-Like EntityManager

**C# Entity Framework:**
```csharp
using (var context = new AppDbContext())
{
    var issue = context.Issues.FirstOrDefault(i => i.Id == 1);
    context.SaveChanges();
}
```

**MikroORM (feels same):**
```typescript
class IssueService {
  constructor(private em: EntityManager) {}
  
  async getIssue(id: string) {
    const issue = await this.em.findOne(Issue, id)
    // Changes tracked automatically
    await this.em.flush() // SaveChanges()
  }
}
```

**Prisma (feels different):**
```typescript
const issue = await prisma.issue.findFirst({
  where: { id: "1" }
})
// No entity manager concept
// Manual change tracking
```

---

### 2. Unit of Work Pattern

**C# (you know this):**
```csharp
using (var context = new AppDbContext())
{
    var issue = context.Issues.Find(1);
    issue.Status = "done";
    
    var output = context.AgentOutputs.Create(new AgentOutput {...});
    
    context.SaveChanges(); // All or nothing
}
```

**MikroORM (same pattern):**
```typescript
class IssueService {
  constructor(private em: EntityManager) {}
  
  async updateIssueWithOutput(issueId: string, output: AgentOutput) {
    const issue = await this.em.findOne(Issue, issueId)
    issue.status = 'done'
    
    this.em.create(AgentOutput, output)
    
    await this.em.flush() // All or nothing
  }
}
```

**Prisma (no UoW):**
```typescript
// No built-in transaction/UoW
// Must use prisma.$transaction()
await prisma.$transaction([
  prisma.issue.update({...}),
  prisma.agentOutput.create({...})
])
// Less elegant, more imperative
```

---

### 3. Lazy Loading vs Eager Loading

**C# (you know this):**
```csharp
var issue = context.Issues.Find(1);
// Related data NOT loaded

var issueWithOutputs = context.Issues
    .Include(i => i.AgentOutputs)
    .FirstOrDefault(i => i.Id == 1);
// Now related data IS loaded
```

**MikroORM (same concept):**
```typescript
// Lazy loading (by default)
const issue = await this.em.findOne(Issue, 1)
console.log(issue.agentOutputs) // Not loaded!

// Eager loading (explicit)
const issueWithOutputs = await this.em.findOne(Issue, 1, {
  populate: ['agentOutputs', 'syncLogs']
})
console.log(issueWithOutputs.agentOutputs) // Loaded!
```

**Prisma (include/select only):**
```typescript
// Always eager (no lazy loading option)
const issue = await prisma.issue.findFirst({
  where: { id: "1" },
  include: { agentOutputs: true } // Must specify
})
// More explicit, but less flexible
```

---

### 4. Change Tracking & Identity Map

**C# (you know this):**
```csharp
var issue = context.Issues.Find(1);
issue.Title = "New Title";
// EF tracks change automatically

var sameIssue = context.Issues.Find(1);
// Same instance from identity map
issue.Title == sameIssue.Title // true (both point to same object)

context.SaveChanges();
// Only changed properties updated
```

**MikroORM (same):**
```typescript
const issue = await this.em.findOne(Issue, 1)
issue.title = "New Title"
// MikroORM tracks change automatically

const sameIssue = await this.em.findOne(Issue, 1)
// Same instance from identity map
issue === sameIssue // true (same JavaScript object)

await this.em.flush()
// Only changed properties updated in SQL
```

**Prisma (different):**
```typescript
const issue = await prisma.issue.findFirst({id: "1"})
issue.title = "New Title"
// Nothing tracked

const updated = await prisma.issue.update({
  where: { id: "1" },
  data: { title: "New Title" }
})
// Must explicitly call update
// Every field included in SQL UPDATE
```

---

### 5. Migrations (Code-First vs Schema-First)

**C# Code-First (you know this):**
```csharp
// Define in code
public class Issue
{
    public string Id { get; set; }
    public string Title { get; set; }
}

// Generate migration
// dotnet ef migrations add AddIssue

// Migration file created (auto)
// dotnet ef database update
```

**MikroORM Code-First (same):**
```typescript
// Define in code
@Entity()
export class Issue {
  @PrimaryKey()
  id: string

  @Property()
  title: string
}

// Generate migration
// npx mikro-orm migration:create

// Migration file created (auto)
// npx mikro-orm migration:up
```

**Prisma Schema-First (different):**
```prisma
// Define in .prisma schema file
model Issue {
  id String @id @default(cuid())
  title String
}

// Generate migration
// npx prisma migrate dev --name add_issue

// Different mental model
// More visual, but less code-first
```

---

## Stack Architecture Comparison

### Your C# Experience:

```
C# Architecture (you know):
├─ Entity Framework (ORM)
├─ ASP.NET Core (framework)
├─ Dependency Injection (built-in)
├─ Decorators/Attributes (for metadata)
├─ DbContext (data layer)
├─ Controllers (HTTP layer)
└─ Services (business layer)
```

### NestJS + MikroORM (equivalent):

```
NestJS Architecture (equivalent):
├─ MikroORM (ORM) ← Like Entity Framework
├─ NestJS (framework) ← Like ASP.NET Core
├─ Built-in DI ← Same as ASP.NET Core
├─ @Decorators ← Same as C# attributes
├─ EntityManager ← Like DbContext
├─ Controllers ← Same as ASP.NET
└─ Services ← Same as ASP.NET
```

### Prisma (different):

```
Prisma feels like:
├─ Database client (not EF)
├─ Type-safe queries (yes, but different)
├─ Schema-first (not code-first)
├─ Less OOP philosophy
└─ More functional approach
```

---

## MikroORM Detailed Features

### Entity Definition (Code-First)

```typescript
// entities/Issue.ts

import { 
  Entity, 
  PrimaryKey, 
  Property, 
  OneToMany, 
  ManyToOne,
  Collection,
  Enum
} from '@mikro-orm/core'

@Entity()
export class Issue {
  @PrimaryKey()
  id: string = nanoid()
  
  // Simple properties
  @Property()
  title: string
  
  @Property({ columnType: 'text', nullable: true })
  description?: string
  
  // Enums
  @Enum()
  status: 'backlog' | 'in_progress' | 'done' | 'stuck' = 'backlog'
  
  @Enum()
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  
  // Relationships
  @OneToMany(() => AgentOutput, output => output.issue, {
    eager: false, // Lazy load by default
    cascade: [Cascade.REMOVE] // Delete outputs when issue deleted
  })
  agentOutputs = new Collection<AgentOutput>(this)
  
  @OneToMany(() => SyncLog, log => log.issue)
  syncLogs = new Collection<SyncLog>(this)
  
  @ManyToOne()
  createdBy: User
  
  // JSON type (for complex data)
  @Property({ type: 'json' })
  enabledAgents: {
    pm: boolean
    architect: boolean
    implementer: boolean
    reviewer: boolean
    tester: boolean
    release: boolean
  }
  
  // Timestamps
  @Property()
  createdAt: Date = new Date()
  
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date()
  
  @Property({ nullable: true })
  syncedAt?: Date
}
```

### Repository Pattern (Unit of Work)

```typescript
// repositories/IssueRepository.ts

import { Repository } from '@mikro-orm/postgresql'
import { Issue } from '../entities/Issue'

@Injectable()
export class IssueRepository extends Repository<Issue> {}

// In service:
@Injectable()
export class IssueService {
  constructor(
    private readonly em: EntityManager,
    private readonly issueRepository: Repository<Issue>
  ) {}
  
  async createIssue(data: CreateIssueDTO, userId: string): Promise<Issue> {
    const user = await this.em.findOne(User, userId)
    
    const issue = new Issue()
    issue.title = data.title
    issue.description = data.description
    issue.createdBy = user
    
    // Unit of Work: persist the entity
    this.em.persist(issue)
    
    // Flush ALL changes
    await this.em.flush()
    
    return issue
  }
  
  async getIssueWithOutputs(id: string): Promise<Issue | null> {
    return this.issueRepository.findOne(id, {
      populate: ['agentOutputs', 'syncLogs'] // Eager load
    })
  }
  
  async updateIssueStatus(id: string, status: string): Promise<Issue> {
    const issue = await this.issueRepository.findOne(id)
    
    if (!issue) {
      throw new NotFoundException('Issue not found')
    }
    
    // Change tracked automatically
    issue.status = status
    
    // Only persist what changed
    await this.em.flush()
    
    return issue
  }
  
  async deleteIssue(id: string): Promise<void> {
    const issue = await this.issueRepository.findOne(id)
    
    if (issue) {
      // Cascade delete agentOutputs, syncLogs
      this.em.remove(issue)
      await this.em.flush()
    }
  }
}
```

### Transactions (Like DbContext)

```typescript
// C# you know:
using (var transaction = context.Database.BeginTransaction())
{
    try
    {
        context.Issues.Add(issue);
        context.SaveChanges();
        
        context.AgentOutputs.Add(output);
        context.SaveChanges();
        
        transaction.Commit();
    }
    catch
    {
        transaction.Rollback();
    }
}

// MikroORM equivalent:
async updateIssueWithOutput(issueId: string, output: any) {
  const uow = this.em.fork() // Fork for transaction
  
  try {
    const issue = await uow.findOne(Issue, issueId)
    issue.status = 'done'
    
    const agentOutput = new AgentOutput()
    agentOutput.issue = issue
    agentOutput.agent = 'pm'
    uow.persist(agentOutput)
    
    await uow.flush() // All or nothing
  } catch (e) {
    // Automatic rollback
    throw e
  }
}
```

### Querying (Like LINQ)

```typescript
// C# LINQ you know:
var activeIssues = context.Issues
    .Where(i => i.Status == "in_progress")
    .OrderBy(i => i.Priority)
    .Take(10)
    .ToList()

var withOutputs = context.Issues
    .Include(i => i.AgentOutputs)
    .Where(i => i.AgentOutputs.Any(o => o.Status == "pending"))
    .ToList()

// MikroORM QueryBuilder (similar):
const activeIssues = await this.em.createQueryBuilder(Issue)
  .where({ status: 'in_progress' })
  .orderBy({ priority: 'DESC' })
  .limit(10)
  .getResultList()

const withOutputs = await this.em.createQueryBuilder(Issue)
  .leftJoinAndSelect('agentOutputs', 'o')
  .where('EXISTS(SELECT 1 FROM agent_output o WHERE o.status = ?)', ['pending'])
  .getResultList()

// Or simpler (like LINQ):
const activeIssues = await this.issueRepository.find(
  { status: 'in_progress' },
  { orderBy: { priority: 'DESC' }, limit: 10 }
)
```

### Eager vs Lazy Loading

```typescript
// Like C# Include()

// Lazy loading (default)
const issue = await this.issueRepository.findOne(1)
// agentOutputs NOT loaded

console.log(issue.agentOutputs.isInitialized()) // false
// accessing agentOutputs would lazy load IF enabled
// (disabled by default for performance)

// Eager loading (explicit)
const issueWithOutputs = await this.issueRepository.findOne(1, {
  populate: ['agentOutputs', 'syncLogs']
})

console.log(issueWithOutputs.agentOutputs.isInitialized()) // true
// agentOutputs LOADED in single query (or joined)
```

### Change Tracking

```typescript
// C# you know:
var issue = context.Issues.Find(1)
issue.Title = "New"
// Change tracked

var syncLog = new SyncLog { /* ... */ }
context.SyncLogs.Add(syncLog)
// Add tracked

context.SaveChanges() // All changes persisted

// MikroORM same:
const issue = await this.em.findOne(Issue, 1)
issue.title = "New"
// Change tracked automatically

const syncLog = new SyncLog()
this.em.persist(syncLog)
// Add tracked

await this.em.flush() // All changes persisted
```

---

## NestJS + Fastify Setup

### Installation

```bash
# Create NestJS project
npm install -g @nestjs/cli
nest new kairos-api --package-manager npm

# Add Fastify adapter
npm install @nestjs/platform-fastify

# Add MikroORM
npm install @mikro-orm/core @mikro-orm/postgresql @mikro-orm/migrations
npm install --save-dev @mikro-orm/cli

# Other dependencies
npm install class-validator class-transformer
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcryptjs
npm install dotenv
```

### main.ts (Entry Point)

```typescript
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  )
  
  // Global validation pipe (DTO validation)
  app.useGlobalPipes(new ValidationPipe())
  
  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  })
  
  await app.listen(3000, '0.0.0.0')
  console.log('API running on http://localhost:3000')
}

bootstrap()
```

### app.module.ts (Root Module)

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { JwtModule } from '@nestjs/jwt'

import { Issue } from './entities/Issue'
import { AgentOutput } from './entities/AgentOutput'
import { User } from './entities/User'
// ... other entities

import { IssueModule } from './modules/issue/issue.module'
import { AuthModule } from './modules/auth/auth.module'
import { ConfigModule as ConfigModuleNest } from './modules/config/config.module'
// ... other modules

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    
    // MikroORM (connects to PostgreSQL, manages schema)
    MikroOrmModule.forRoot({
      driver: 'postgresql', // or require('@mikro-orm/postgresql')
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dbName: process.env.DB_NAME,
      
      entities: [Issue, AgentOutput, User, AgentConfiguration, /*...*/],
      entitiesTs: ['src/entities'],
      
      // Auto-generate migrations
      migrations: {
        path: 'src/migrations',
        pathTs: 'src/migrations',
        glob: '!(*.d).{js,ts}',
        transactional: true,
        disableForeignKeys: true,
        allOrNothing: true,
        dropTables: false,
        safe: true,
        snapshot: false,
        emit: 'ts'
      },
      
      // Cache (identity map, first-level cache)
      cache: {
        pretty: true
      },
      
      debug: process.env.NODE_ENV === 'development',
      seeder: {
        pathTs: 'src/seeds'
      }
    }),
    
    // JWT
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' }
    }),
    
    // Feature modules
    AuthModule,
    IssueModule,
    ConfigModuleNest,
    // ... other modules
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
```

### issue.module.ts (Feature Module)

```typescript
import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Issue } from '../entities/Issue'
import { AgentOutput } from '../entities/AgentOutput'
import { IssueController } from './issue.controller'
import { IssueService } from './issue.service'

@Module({
  imports: [
    MikroOrmModule.forFeature([Issue, AgentOutput])
  ],
  controllers: [IssueController],
  providers: [IssueService],
  exports: [IssueService] // If other modules need it
})
export class IssueModule {}
```

### issue.service.ts (Business Logic)

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { EntityManager, Repository } from '@mikro-orm/postgresql'
import { InjectRepository } from '@mikro-orm/nestjs'
import { Issue } from '../entities/Issue'
import { CreateIssueDTO, UpdateIssueDTO } from './dto'

@Injectable()
export class IssueService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>
  ) {}
  
  async createIssue(
    createIssueDTO: CreateIssueDTO,
    userId: string
  ): Promise<Issue> {
    const user = await this.em.findOne(User, userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    
    const issue = new Issue()
    issue.title = createIssueDTO.title
    issue.description = createIssueDTO.description
    issue.source = createIssueDTO.source || 'manual'
    issue.createdBy = user
    
    // MikroORM tracks this
    this.em.persist(issue)
    
    // Flush all changes (Unit of Work pattern)
    await this.em.flush()
    
    return issue
  }
  
  async getIssues(
    kanbanColumn?: string,
    status?: string,
    skip: number = 0,
    take: number = 20
  ): Promise<[Issue[], number]> {
    const where: any = {}
    
    if (kanbanColumn) where.kanbanColumn = kanbanColumn
    if (status) where.status = status
    
    // Query with pagination and relationships
    return this.issueRepository.findAndCount(where, {
      orderBy: { createdAt: 'DESC' },
      populate: ['agentOutputs', 'syncLogs'],
      offset: skip,
      limit: take
    })
  }
  
  async getIssueById(id: string): Promise<Issue> {
    const issue = await this.issueRepository.findOne(
      { id },
      { populate: ['agentOutputs', 'syncLogs', 'issueLinks'] }
    )
    
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`)
    }
    
    return issue
  }
  
  async updateIssue(
    id: string,
    updateIssueDTO: UpdateIssueDTO
  ): Promise<Issue> {
    const issue = await this.issueRepository.findOne({ id })
    
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`)
    }
    
    // Change tracking automatic
    Object.assign(issue, updateIssueDTO)
    
    // Only changed properties will be updated in SQL
    await this.em.flush()
    
    return issue
  }
  
  async moveToColumn(id: string, column: string): Promise<Issue> {
    const validColumns = ['backlog', 'pm', 'architect', 'review', 'test', 'release']
    
    if (!validColumns.includes(column)) {
      throw new BadRequestException(`Invalid column: ${column}`)
    }
    
    const issue = await this.issueRepository.findOne({ id })
    
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`)
    }
    
    issue.kanbanColumn = column
    issue.status = 'in_progress'
    
    await this.em.flush()
    
    return issue
  }
  
  async deleteIssue(id: string): Promise<void> {
    const issue = await this.issueRepository.findOne({ id })
    
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`)
    }
    
    // Cascade delete agentOutputs, syncLogs
    this.em.remove(issue)
    await this.em.flush()
  }
  
  // Transaction example
  async updateIssueWithOutput(
    issueId: string,
    output: any
  ): Promise<Issue> {
    // Fork EntityManager for transaction
    const uow = this.em.fork()
    
    try {
      const issue = await uow.findOne(Issue, issueId)
      if (!issue) {
        throw new NotFoundException('Issue not found')
      }
      
      issue.status = 'done'
      
      const agentOutput = new AgentOutput()
      agentOutput.issue = issue
      agentOutput.agent = 'pm'
      agentOutput.outputData = output.data
      
      uow.persist(agentOutput)
      
      // All or nothing
      await uow.flush()
      
      return issue
    } catch (error) {
      // Automatic rollback on fork
      throw error
    }
  }
}
```

### issue.controller.ts (HTTP Layer)

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { IssueService } from './issue.service'
import { CreateIssueDTO, UpdateIssueDTO } from './dto'

@Controller('issues')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}
  
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createIssueDTO: CreateIssueDTO,
    @Request() req: any
  ) {
    const issue = await this.issueService.createIssue(
      createIssueDTO,
      req.user.id
    )
    
    return {
      success: true,
      data: issue
    }
  }
  
  @Get()
  async findAll(
    @Query('kanbanColumn') kanbanColumn?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    const [issues, total] = await this.issueService.getIssues(
      kanbanColumn,
      status,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20
    )
    
    return {
      success: true,
      data: issues,
      pagination: {
        total,
        skip: skip ? parseInt(skip) : 0,
        take: take ? parseInt(take) : 20
      }
    }
  }
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const issue = await this.issueService.getIssueById(id)
    
    return {
      success: true,
      data: issue
    }
  }
  
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateIssueDTO: UpdateIssueDTO
  ) {
    const issue = await this.issueService.updateIssue(
      id,
      updateIssueDTO
    )
    
    return {
      success: true,
      data: issue
    }
  }
  
  @Put(':id/move')
  @UseGuards(JwtAuthGuard)
  async moveToColumn(
    @Param('id') id: string,
    @Body('column') column: string
  ) {
    const issue = await this.issueService.moveToColumn(id, column)
    
    return {
      success: true,
      data: issue
    }
  }
  
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    await this.issueService.deleteIssue(id)
    
    return {
      success: true,
      message: 'Issue deleted'
    }
  }
}
```

### DTO with Validation

```typescript
// issue/dto/create-issue.dto.ts

import { IsString, IsOptional, IsEnum } from 'class-validator'

export class CreateIssueDTO {
  @IsString()
  title: string
  
  @IsOptional()
  @IsString()
  description?: string
  
  @IsOptional()
  @IsEnum(['jira', 'github', 'gitlab', 'manual'])
  source?: string
  
  @IsOptional()
  @IsString()
  sourceId?: string
  
  @IsOptional()
  @IsString()
  sourceUrl?: string
}

export class UpdateIssueDTO {
  @IsOptional()
  @IsString()
  title?: string
  
  @IsOptional()
  @IsString()
  description?: string
  
  @IsOptional()
  @IsEnum(['backlog', 'in_progress', 'done', 'stuck'])
  status?: string
  
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string
}
```

---

## Database Migrations

### Create Migration

```bash
# Auto-generate from entities
npx mikro-orm migration:create --name add-issue-table

# Creates: src/migrations/Migration20240418103000_AddIssueTable.ts
```

### Migration File Example

```typescript
// src/migrations/Migration20240418103000_AddIssueTable.ts

import { Migration } from '@mikro-orm/migrations'

export class Migration20240418103000_AddIssueTable extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "issue" (
        "id" varchar(255) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "source" varchar(255) NOT NULL DEFAULT 'manual',
        "source_id" varchar(255) NULL,
        "source_url" varchar(255) NULL,
        "kanban_column" varchar(255) NOT NULL DEFAULT 'backlog',
        "kanban_position" int NOT NULL DEFAULT 0,
        "status" varchar(255) NOT NULL DEFAULT 'backlog',
        "priority" varchar(255) NOT NULL DEFAULT 'medium',
        "enabled_agents" json NOT NULL,
        "created_by" varchar(255) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "synced_at" timestamp NULL,
        CONSTRAINT "issue_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "issue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `)
    
    this.addSql(`CREATE UNIQUE INDEX "issue_source_source_id_unique" ON "issue" ("source", "source_id");`)
    this.addSql(`CREATE INDEX "issue_created_by_index" ON "issue" ("created_by");`)
    this.addSql(`CREATE INDEX "issue_kanban_column_index" ON "issue" ("kanban_column");`)
  }
  
  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "issue" CASCADE;`)
  }
}
```

### Run Migrations

```bash
# Create tables
npx mikro-orm migration:up

# Rollback
npx mikro-orm migration:down

# Fresh (drop all, create all)
npx mikro-orm migration:fresh
```

---

## Why MikroORM > Prisma for C# Developers

### Summary Table

| Feature | MikroORM | Prisma | C# EF |
|---------|----------|--------|-------|
| **DbContext** | ✅ EntityManager | ❌ Client | ✅ DbContext |
| **Unit of Work** | ✅ Built-in | ❌ Manual | ✅ Built-in |
| **Code-First** | ✅ Yes | ❌ Schema-First | ✅ Yes |
| **Change Tracking** | ✅ Automatic | ❌ Manual | ✅ Automatic |
| **Lazy Loading** | ✅ Optional | ❌ No | ✅ Optional |
| **Eager Loading** | ✅ populate | ❌ include | ✅ Include |
| **Migrations** | ✅ Code-based | ⚠️ Snapshot | ✅ Code-based |
| **Identity Map** | ✅ Yes | ❌ No | ✅ Yes |
| **Transactions** | ✅ fork() | ⚠️ $transaction | ✅ Native |
| **Learning Curve** | ✅ Easy (from EF) | ❌ Medium | N/A |
| **Performance** | ✅ Good | ✅ Good | N/A |
| **Type Safety** | ✅ Excellent | ✅ Excellent | N/A |

---

## Quick Start

```bash
# Create project
nest new kairos-api
cd kairos-api

# Install dependencies
npm install @nestjs/platform-fastify
npm install @mikro-orm/core @mikro-orm/postgresql @mikro-orm/migrations
npm install @mikro-orm/cli --save-dev
npm install class-validator class-transformer

# Create entities
# Define Issue, AgentOutput, etc in src/entities/

# Create migrations
npx mikro-orm migration:create --name init

# Run migrations
npx mikro-orm migration:up

# Create modules
nest generate module modules/issue
nest generate service modules/issue
nest generate controller modules/issue

# Run
npm run start:dev
```

---

## Conclusion

**MikroORM + NestJS is PERFECT for C# developers because:**

✅ DbContext-like EntityManager
✅ Unit of Work pattern (same as EF)
✅ Code-first entities (same as EF)
✅ Automatic change tracking (same as EF)
✅ Migrations (same as EF)
✅ Lazy vs eager loading (same as EF)
✅ NestJS DI like ASP.NET Core
✅ Familiar mental model
✅ Short learning curve

**Fastify adapter:**
✅ Faster than Express
✅ Great TypeScript support
✅ Low memory footprint

**This stack = C# comfort + Node.js power** 🚀

