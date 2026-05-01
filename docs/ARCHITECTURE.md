# KAIROS Webapp: Architecture & Tech Stack

## Final Tech Stack Decision

```
Frontend:
  • Nuxt 4 (Vue 3 Composition API)
  • Nuxt UI (component library)
  • TailwindCSS (styling)
  • Pinia (state management)

Backend: NestJS + Fastify Adapter
  • NestJS 10+ (framework)
  • Fastify adapter (HTTP layer)
  • MikroORM (ORM)
  • PostgreSQL 16+ (database)
  • TypeScript (language)

Infrastructure:
  • Docker & Docker Compose (local dev)
  • PostgreSQL 16+ (database)
  • Environment management (.env)

---

## Update: Implemented Plugin Architecture (April 26, 2026)

The backend now includes a modular plugin subsystem for LLM provider routing and agent-level configuration.

### Implemented modules/services

- `PluginModule`
- `PluginRegistry`
- `PluginDiscoveryService`
- `PluginDbSyncService`
- `ProviderResolutionService`
- `PluginAuditService`
- `LocalPackageSecurityPolicy`

### Implemented admin surface

- Provider administration
- Plugin discovery/sync administration
- Agent-plugin binding administration
- User-scoped provider credential administration

### Security model additions

- Encrypted provider credentials at rest
- Local package trust policy checks before registration
- Audit logging for sensitive plugin operations
```

---

## Why This Stack?

### NestJS (Enterprise Framework)

**Why chosen:**
- ✅ Built-in dependency injection (familiar to C# devs from ASP.NET Core)
- ✅ Module system (scalability)
- ✅ Decorators (@Controller, @Post, etc - like C# attributes)
- ✅ Built-in validation pipes
- ✅ Best practices enforced
- ✅ Great for team development
- ✅ Official Fastify adapter

**What you get:**
- Clear structure from day one
- Easy to onboard new developers
- Batteries included (logging, validation, etc)
- Great ecosystem of packages

---

### Fastify Adapter (Not Express)

**Why Fastify:**
- ⚡ **Performance** - 2-3x faster than Express
- 📦 **TypeScript** - Native TS support
- 🪶 **Lightweight** - Lower memory footprint
- 🔧 **Modern** - Built on modern Node.js features
- 🎯 **Perfect for NestJS** - Official support, seamless integration

**Not Express because:**
- ❌ Express is older (created 2010)
- ❌ Lower performance
- ❌ Less TypeScript support
- ❌ More boilerplate needed

**Fastify benefits:**
- ✅ Runs 2-3x faster (cost savings)
- ✅ Lower memory usage
- ✅ Better TypeScript integration
- ✅ Modern routing system

---

### MikroORM (Not Prisma, Not TypeORM)

**Why MikroORM (Perfect for C# Developers):**

```
Your C# Experience → MikroORM Equivalent

Entity Framework      → MikroORM
DbContext            → EntityManager
.SaveChanges()       → .flush()
Include()            → populate()
lazy loading         → Built-in
Change tracking      → Identity map
Migrations           → Code-based
Unit of Work         → em.fork()
```

**Key advantages:**
- ✅ **DbContext-like** - EntityManager feels familiar
- ✅ **Unit of Work pattern** - Just like EF Core
- ✅ **Change tracking** - Automatic tracking of changes
- ✅ **Identity map** - First-level cache
- ✅ **Lazy vs eager loading** - Full control
- ✅ **Code-first** - Entities → Database
- ✅ **Migrations** - Version control friendly
- ✅ **Short learning curve** - From C# background

**vs Prisma:**
- ❌ Prisma is schema-first (not code-first)
- ❌ No DbContext concept
- ❌ Manual change tracking
- ❌ Different mental model
- ✅ But Prisma is simpler if you prefer less control

**vs TypeORM:**
- ✅ MikroORM is lighter weight
- ✅ Better TypeScript integration
- ✅ More intuitive for C# devs
- ✅ Better performance

---

## Project Folder Structure

```
kairos-webapp-backend/
│
├─ src/
│  ├─ domain/                          # Business logic (language-independent)
│  │  ├─ entities/
│  │  │  ├─ IssueEntity.ts             # @Entity() decorated
│  │  │  ├─ AgentEntity.ts
│  │  │  ├─ AgentOutputEntity.ts
│  │  │  ├─ UserEntity.ts
│  │  │  └─ RefreshTokenEntity.ts
│  │  │
│  │  └─ interfaces/
│  │     ├─ repositories/              # Repository contracts
│  │     │  ├─ IIssueRepository.ts
│  │     │  └─ IAgentRepository.ts
│  │     └─ services/
│  │        └─ IAuthService.ts
│  │
│  ├─ application/                     # Use cases & business logic
│  │  ├─ dto/                          # Data transfer objects
│  │  │  ├─ IssueDTO.ts                # Internal representation
│  │  │  ├─ AgentDTO.ts
│  │  │  └─ UserDTO.ts
│  │  │
│  │  └─ services/                     # High-level business logic
│  │     ├─ IssueService.ts
│  │     ├─ AgentService.ts
│  │     ├─ AuthService.ts
│  │     ├─ CostService.ts
│  │     └─ ConfigService.ts
│  │
│  ├─ infrastructure/                  # Technical implementation
│  │  ├─ persistence/
│  │  │  ├─ repositories/
│  │  │  │  ├─ IssueRepository.ts      # Implements IIssueRepository
│  │  │  │  ├─ AgentRepository.ts
│  │  │  │  ├─ UserRepository.ts
│  │  │  │  └─ RefreshTokenRepository.ts
│  │  │  │
│  │  │  ├─ migrations/
│  │  │  │  ├─ Migration20260419100000_InitialSchema.ts
│  │  │  │  └─ Migration20260419120000_AddAgentTable.ts
│  │  │  │
│  │  │  └─ MikroOrmConfig.ts          # Database configuration
│  │  │
│  │  ├─ http/                         # NestJS HTTP layer
│  │  │  ├─ controllers/
│  │  │  │  ├─ IssueController.ts
│  │  │  │  ├─ AgentController.ts
│  │  │  │  ├─ ConfigController.ts
│  │  │  │  └─ AuthController.ts
│  │  │  │
│  │  │  ├─ guards/
│  │  │  │  ├─ JwtAuthGuard.ts
│  │  │  │  └─ RolesGuard.ts
│  │  │  │
│  │  │  ├─ middleware/
│  │  │  │  ├─ ErrorHandlerMiddleware.ts
│  │  │  │  ├─ RequestLoggerMiddleware.ts
│  │  │  │  └─ RateLimiterMiddleware.ts
│  │  │  │
│  │  │  └─ FastifyConfig.ts           # Fastify setup
│  │  │
│  │  ├─ external/
│  │  │  ├─ providers/
│  │  │  │  ├─ AnthropicProvider.ts    # LLM provider integration
│  │  │  │  ├─ OpenRouterProvider.ts
│  │  │  │  ├─ OpenAIProvider.ts
│  │  │  │  ├─ OllamaProvider.ts
│  │  │  │  └─ ProviderFactory.ts
│  │  │  │
│  │  │  ├─ sources/
│  │  │  │  ├─ JiraClient.ts           # External system integrations
│  │  │  │  ├─ GitHubClient.ts
│  │  │  │  ├─ GitLabClient.ts
│  │  │  │  └─ SourceFactory.ts
│  │  │  │
│  │  │  └─ webhooks/
│  │  │     ├─ JiraWebhookHandler.ts
│  │  │     ├─ GitHubWebhookHandler.ts
│  │  │     └─ WebhookValidator.ts
│  │  │
│  │  ├─ security/
│  │  │  ├─ PasswordHasher.ts
│  │  │  ├─ JWTGenerator.ts
│  │  │  ├─ JWTValidator.ts
│  │  │  └─ Encryption.ts
│  │  │
│  │  ├─ logging/
│  │  │  ├─ Logger.ts                 # Logger abstraction
│  │  │  └─ PinoLogger.ts             # Pino implementation
│  │  │
│  │  └─ config/
│  │     ├─ EnvConfig.ts               # Environment variables
│  │     ├─ DatabaseConfig.ts
│  │     └─ AppConfig.ts
│  │
│  ├─ presentation/                    # HTTP contracts
│  │  ├─ http/
│  │  │  ├─ requests/
│  │  │  │  ├─ IssueCreateRequest.ts   # Input DTOs
│  │  │  │  ├─ IssueUpdateRequest.ts
│  │  │  │  ├─ AgentRunRequest.ts
│  │  │  │  └─ AuthLoginRequest.ts
│  │  │  │
│  │  │  ├─ responses/
│  │  │  │  ├─ IssueResponse.ts        # Output DTOs
│  │  │  │  ├─ IssueDetailResponse.ts
│  │  │  │  ├─ AgentOutputResponse.ts
│  │  │  │  ├─ PaginatedResponse.ts
│  │  │  │  └─ ApiResponse.ts
│  │  │  │
│  │  │  └─ mappers/
│  │  │     ├─ request-mappers/
│  │  │     │  ├─ IssueCreateRequestMapper.ts
│  │  │     │  └─ IssueUpdateRequestMapper.ts
│  │  │     │
│  │  │     ├─ response-mappers/
│  │  │     │  ├─ IssueResponseMapper.ts
│  │  │     │  └─ AgentOutputResponseMapper.ts
│  │  │     │
│  │  │     └─ entity-mappers/
│  │  │        ├─ IssueEntityMapper.ts
│  │  │        └─ AgentEntityMapper.ts
│  │  │
│  │  └─ modules/                      # NestJS modules
│  │     ├─ auth/
│  │     │  ├─ auth.controller.ts
│  │     │  ├─ auth.service.ts
│  │     │  ├─ auth.module.ts
│  │     │  └─ jwt.strategy.ts
│  │     │
│  │     ├─ issue/
│  │     │  ├─ issue.controller.ts
│  │     │  ├─ issue.service.ts
│  │     │  ├─ issue.module.ts
│  │     │  └─ issue.repository.ts
│  │     │
│  │     ├─ agent/
│  │     │  ├─ agent.controller.ts
│  │     │  ├─ agent.service.ts
│  │     │  ├─ agent.module.ts
│  │     │  └─ agent.repository.ts
│  │     │
│  │     └─ config/
│  │        ├─ config.controller.ts
│  │        ├─ config.service.ts
│  │        └─ config.module.ts
│  │
│  ├─ shared/                          # Shared utilities
│  │  ├─ constants.ts
│  │  ├─ types.ts
│  │  ├─ errors.ts                     # Custom error classes
│  │  ├─ decorators.ts                 # Custom decorators
│  │  └─ utils/
│  │     ├─ validators.ts
│  │     ├─ converters.ts
│  │     └─ helpers.ts
│  │
│  ├─ app.module.ts                    # Root NestJS module
│  └─ main.ts                          # Application entry point
│
├─ tests/
│  ├─ unit/                            # Unit tests
│  │  ├─ services/
│  │  ├─ repositories/
│  │  └─ utils/
│  │
│  ├─ integration/                     # Integration tests
│  │  ├─ api/
│  │  ├─ database/
│  │  └─ external/
│  │
│  ├─ e2e/                             # End-to-end tests
│  │  └─ workflows/
│  │
│  └─ fixtures/
│     ├─ users.fixture.ts
│     ├─ issues.fixture.ts
│     └─ agents.fixture.ts
│
├─ docs/
│  ├─ API.md                           # OpenAPI documentation
│  ├─ SETUP.md                         # Development setup
│  ├─ DATABASE.md                      # Schema documentation
│  └─ DEPLOYMENT.md                    # Production deployment
│
├─ .env.example                        # Environment template
├─ .dockerignore
├─ .gitignore
├─ Dockerfile                          # Docker image
├─ docker-compose.yml                  # Local dev environment
├─ package.json
├─ tsconfig.json
├─ jest.config.js                      # Testing configuration
├─ .eslintrc.json                      # Linting configuration
├─ .prettierrc                         # Code formatting
├─ README.md
└─ LICENSE
```

---

## MikroORM Setup with NestJS

### Installation

```bash
# Create NestJS project with Fastify
nest new kairos-api --package-manager npm

# Add Fastify adapter
npm install @nestjs/platform-fastify fastify

# Add MikroORM
npm install @mikro-orm/core @mikro-orm/postgresql @mikro-orm/migrations
npm install --save-dev @mikro-orm/cli

# Other dependencies
npm install class-validator class-transformer
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcryptjs dotenv
npm install pino pino-pretty
```

### main.ts (Fastify Entry Point)

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
  
  // Global validation pipe (automatic DTO validation)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }))
  
  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })
  
  // Health check endpoint
  app.get('/health', () => ({ status: 'ok' }))
  
  await app.listen(3000, '0.0.0.0')
  console.log(`🚀 API running on http://localhost:3000`)
}

bootstrap()
```

### app.module.ts (Root Module)

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { JwtModule } from '@nestjs/jwt'

import { IssueEntity } from './domain/entities/IssueEntity'
import { AgentEntity } from './domain/entities/AgentEntity'
import { AgentOutputEntity } from './domain/entities/AgentOutputEntity'
import { UserEntity } from './domain/entities/UserEntity'
import { RefreshTokenEntity } from './domain/entities/RefreshTokenEntity'

import { AuthModule } from './presentation/modules/auth/auth.module'
import { IssueModule } from './presentation/modules/issue/issue.module'
import { AgentModule } from './presentation/modules/agent/agent.module'
import { ConfigModule as ConfigFeatureModule } from './presentation/modules/config/config.module'

@Module({
  imports: [
    // Environment variables (global)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    
    // MikroORM Database Connection
    MikroOrmModule.forRoot({
      driver: 'postgresql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      dbName: process.env.DB_NAME,
      
      // Entities
      entities: [
        IssueEntity,
        AgentEntity,
        AgentOutputEntity,
        UserEntity,
        RefreshTokenEntity
      ],
      entitiesTs: ['src/domain/entities'],
      
      // Migrations
      migrations: {
        path: 'src/infrastructure/persistence/migrations',
        pathTs: 'src/infrastructure/persistence/migrations',
        glob: '!(*.d).{js,ts}',
        transactional: true,
        disableForeignKeys: false,
        allOrNothing: true,
        dropTables: false,
        safe: true,
        snapshot: false,
        emit: 'ts'
      },
      
      // Caching (identity map)
      cache: {
        enabled: true,
        pretty: process.env.NODE_ENV === 'development'
      },
      
      // Seeding
      seeder: {
        pathTs: 'src/infrastructure/persistence/seeders'
      },
      
      debug: process.env.NODE_ENV === 'development'
    }),
    
    // JWT Module
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' }
    }),
    
    // Feature modules
    AuthModule,
    IssueModule,
    AgentModule,
    ConfigFeatureModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
```

### Entity Example (IssueEntity.ts)

```typescript
import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Enum,
  Index
} from '@mikro-orm/core'
import { UserEntity } from './UserEntity'
import { AgentOutputEntity } from './AgentOutputEntity'

@Entity({ tableName: 'issues' })
@Index({ properties: ['kanbanColumn', 'createdAt'] })
@Index({ properties: ['type'] })
@Index({ properties: ['source'] })
export class IssueEntity {
  @PrimaryKey()
  id: string = nanoid()
  
  @Property()
  title: string
  
  @Property({ columnType: 'text', nullable: true })
  description?: string
  
  @Property()
  type: string = 'feature' // User-defined categories
  
  @Property()
  source: string = 'manual' // jira|github|gitlab|manual
  
  @Property({ nullable: true })
  sourceId?: string
  
  @Property({ nullable: true })
  linkedPrMrUrl?: string
  
  @Property()
  kanbanColumn: string = 'backlog'
  
  @ManyToOne()
  createdBy: UserEntity
  
  @OneToMany(() => AgentOutputEntity, ao => ao.issue, {
    eager: false,
    cascade: [Cascade.REMOVE]
  })
  agentOutputs = new Collection<AgentOutputEntity>(this)
  
  @Property()
  createdAt: Date = new Date()
  
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date()
  
  @Property({ nullable: true })
  syncedAt?: Date
}
```

### Service Example (IssueService.ts)

```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { EntityManager, Repository } from '@mikro-orm/postgresql'
import { InjectRepository } from '@mikro-orm/nestjs'
import { IssueEntity } from '../domain/entities/IssueEntity'
import { IssueDTO } from '../application/dto/IssueDTO'
import { IssueResponseMapper } from '../presentation/http/mappers/response-mappers/IssueResponseMapper'

@Injectable()
export class IssueService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(IssueEntity)
    private readonly issueRepository: Repository<IssueEntity>,
    private readonly responseMapper: IssueResponseMapper
  ) {}
  
  // CREATE
  async createIssue(dto: IssueDTO): Promise<IssueDTO> {
    const issue = new IssueEntity()
    issue.title = dto.title
    issue.description = dto.description
    issue.type = dto.type
    issue.source = dto.source
    issue.sourceId = dto.sourceId
    
    this.em.persist(issue)
    await this.em.flush()
    
    return this.mapEntityToDTO(issue)
  }
  
  // READ
  async getIssueById(id: string): Promise<IssueDTO> {
    const issue = await this.issueRepository.findOne(
      { id },
      { populate: ['createdBy', 'agentOutputs'] }
    )
    
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`)
    }
    
    return this.mapEntityToDTO(issue)
  }
  
  // LIST
  async listIssues(skip: number = 0, take: number = 20): Promise<[IssueDTO[], number]> {
    const [entities, total] = await this.issueRepository.findAndCount(
      {},
      {
        offset: skip,
        limit: take,
        orderBy: { createdAt: 'DESC' },
        populate: ['createdBy']
      }
    )
    
    const dtos = entities.map(e => this.mapEntityToDTO(e))
    return [dtos, total]
  }
  
  // UPDATE
  async updateIssue(id: string, dto: Partial<IssueDTO>): Promise<IssueDTO> {
    const issue = await this.issueRepository.findOne({ id })
    
    if (!issue) {
      throw new NotFoundException(`Issue ${id} not found`)
    }
    
    // Change tracking is automatic
    if (dto.title) issue.title = dto.title
    if (dto.kanbanColumn) issue.kanbanColumn = dto.kanbanColumn
    
    await this.em.flush() // Only changed fields updated
    
    return this.mapEntityToDTO(issue)
  }
  
  // DELETE
  async deleteIssue(id: string): Promise<void> {
    const issue = await this.issueRepository.findOne({ id })
    
    if (issue) {
      this.em.remove(issue)
      await this.em.flush()
    }
  }
  
  // TRANSACTION (Unit of Work)
  async updateIssueWithOutput(issueId: string, output: any): Promise<IssueDTO> {
    const uow = this.em.fork() // Fork for transaction
    
    try {
      const issue = await uow.findOne(IssueEntity, issueId)
      if (!issue) throw new NotFoundException('Issue not found')
      
      issue.kanbanColumn = 'review'
      // Create output here too
      
      await uow.flush() // All or nothing
      
      return this.mapEntityToDTO(issue)
    } catch (error) {
      // Automatic rollback on fork error
      throw error
    }
  }
  
  private mapEntityToDTO(entity: IssueEntity): IssueDTO {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      type: entity.type,
      source: entity.source,
      sourceId: entity.sourceId,
      linkedPrMrUrl: entity.linkedPrMrUrl,
      kanbanColumn: entity.kanbanColumn,
      createdByName: entity.createdBy.name,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      syncedAt: entity.syncedAt
    }
  }
}
```

### Controller Example (IssueController.ts)

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
  Request as FastifyRequest
} from '@nestjs/common'
import { FastifyRequest } from 'fastify'
import { JwtAuthGuard } from '../guards/JwtAuthGuard'
import { IssueService } from '../../../application/services/IssueService'
import { IssueCreateRequest } from '../requests/IssueCreateRequest'
import { IssueUpdateRequest } from '../requests/IssueUpdateRequest'
import { IssueResponse } from '../responses/IssueResponse'
import { ApiResponse } from '../responses/ApiResponse'

@Controller('issues')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}
  
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() request: IssueCreateRequest,
    @FastifyRequest() req: FastifyRequest
  ): Promise<ApiResponse<IssueResponse>> {
    const dto = this.mapRequestToDTO(request)
    const resultDTO = await this.issueService.createIssue(dto)
    const response = this.mapDTOToResponse(resultDTO)
    
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() }
    }
  }
  
  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ): Promise<ApiResponse<any>> {
    const [dtos, total] = await this.issueService.listIssues(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20
    )
    
    const responses = dtos.map(d => this.mapDTOToResponse(d))
    
    return {
      success: true,
      data: {
        items: responses,
        total
      }
    }
  }
  
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<ApiResponse<IssueResponse>> {
    const dto = await this.issueService.getIssueById(id)
    const response = this.mapDTOToResponse(dto)
    
    return {
      success: true,
      data: response
    }
  }
  
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() request: IssueUpdateRequest
  ): Promise<ApiResponse<IssueResponse>> {
    const updates = this.mapUpdateRequestToDTO(request)
    const resultDTO = await this.issueService.updateIssue(id, updates)
    const response = this.mapDTOToResponse(resultDTO)
    
    return {
      success: true,
      data: response
    }
  }
  
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string): Promise<ApiResponse<void>> {
    await this.issueService.deleteIssue(id)
    
    return {
      success: true
    }
  }
  
  private mapRequestToDTO(request: IssueCreateRequest): any { /* ... */ }
  private mapUpdateRequestToDTO(request: IssueUpdateRequest): any { /* ... */ }
  private mapDTOToResponse(dto: any): IssueResponse { /* ... */ }
}
```

---

## Database Migrations

### Creating a Migration

```bash
# Auto-generate from entities
npx mikro-orm migration:create --name add-issue-table
```

### Migration File Example

```typescript
// src/infrastructure/persistence/migrations/Migration20260419100000_InitialSchema.ts

import { Migration } from '@mikro-orm/migrations'

export class Migration20260419100000_InitialSchema extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "users" (
        "id" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "name" varchar(255) NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_unique" UNIQUE ("email")
      );
    `)
    
    this.addSql(`
      CREATE TABLE "issues" (
        "id" varchar(255) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "type" varchar(50) NOT NULL DEFAULT 'feature',
        "source" varchar(50) NOT NULL DEFAULT 'manual',
        "source_id" varchar(255) NULL,
        "kanban_column" varchar(50) NOT NULL DEFAULT 'backlog',
        "created_by" varchar(255) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "synced_at" timestamp NULL,
        CONSTRAINT "issues_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "issues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "issues_source_source_id_unique" UNIQUE ("source", "source_id")
      );
    `)
    
    this.addSql(`CREATE INDEX "issues_kanban_column_created_at_idx" ON "issues" ("kanban_column", "created_at");`)
    this.addSql(`CREATE INDEX "issues_type_idx" ON "issues" ("type");`)
    this.addSql(`CREATE INDEX "issues_source_idx" ON "issues" ("source");`)
  }
  
  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "issues" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "users" CASCADE;`)
  }
}
```

### Running Migrations

```bash
# Create/update tables
npx mikro-orm migration:up

# Rollback last migration
npx mikro-orm migration:down

# Fresh database (drop all, create all)
npx mikro-orm migration:fresh

# Show migration status
npx mikro-orm migration:check
```

---

## Fastify Middleware Stack

```
Request Flow:

1. CORS Middleware
   └─ Handle cross-origin requests

2. Request Logger
   └─ Log all incoming requests

3. Body Parser
   └─ Parse JSON/form data

4. Rate Limiter
   └─ Prevent abuse

5. Auth Guard (if @UseGuards(JwtAuthGuard))
   └─ Verify JWT token

6. Validation Pipe
   └─ Validate request body/params

7. Route Handler
   └─ Controller method

8. Error Handler
   └─ Catch and format errors

9. Response Logger
   └─ Log response data


Fastify-specific advantages:
✅ Decorators for hooks
✅ Built-in TypeScript support
✅ Faster request processing
✅ Lower memory footprint
```

---

## Development Setup

```bash
# Clone and install
git clone <repo>
cd kairos-api
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Create database
createdb kairos_dev

# Run migrations
npx mikro-orm migration:up

# Start development server
npm run start:dev

# Run tests
npm run test
npm run test:watch

# Lint and format
npm run lint
npm run format
```

### .env.example

```
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=kairos_dev

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Frontend
FRONTEND_URL=http://localhost:3000

# API
API_PORT=3000
API_HOST=0.0.0.0
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: kairos_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('IssueService', () => {
  let service: IssueService
  let repository: Repository<IssueEntity>
  let em: EntityManager
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueService,
        {
          provide: getRepositoryToken(IssueEntity),
          useClass: MockRepository
        },
        {
          provide: EntityManager,
          useClass: MockEntityManager
        }
      ]
    }).compile()
    
    service = module.get<IssueService>(IssueService)
    repository = module.get(getRepositoryToken(IssueEntity))
    em = module.get(EntityManager)
  })
  
  describe('createIssue', () => {
    it('should create issue with valid data', async () => {
      const dto: IssueDTO = {
        title: 'Test Issue',
        type: 'feature'
      }
      
      const result = await service.createIssue(dto)
      
      expect(result.id).toBeDefined()
      expect(result.title).toBe('Test Issue')
      expect(em.persist).toHaveBeenCalled()
      expect(em.flush).toHaveBeenCalled()
    })
  })
})
```

### Integration Tests

```typescript
describe('IssueController (Integration)', () => {
  let app: INestApplication<any>
  let token: string
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()
    
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    )
    
    await app.init()
    
    // Get auth token
    token = await getAuthToken()
  })
  
  it('POST /issues should create issue', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/issues',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        title: 'Test Issue',
        type: 'feature'
      }
    })
    
    expect(response.statusCode).toBe(201)
    expect(response.json().data.id).toBeDefined()
  })
})
```

---

## Deployment Architecture

```
┌─────────────────┐
│  Git Repository │
└────────┬────────┘
         │
         │ git push
         ↓
┌──────────────────────────────────┐
│ CI/CD Pipeline (GitHub Actions)  │
├──────────────────────────────────┤
│ 1. Run tests                     │
│ 2. Lint code                     │
│ 3. Build Docker image            │
│ 4. Push to Docker registry       │
│ 5. Deploy to production          │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│ Production (Docker)              │
├──────────────────────────────────┤
│ Backend Container:               │
│  - NestJS + Fastify              │
│  - Microservices-ready           │
│  - Auto-restart on crash         │
│                                  │
│ Database:                        │
│  - PostgreSQL 16                 │
│  - Automatic backups             │
│  - Monitoring                    │
│                                  │
│ Reverse Proxy (Nginx):           │
│  - Load balancing                │
│  - SSL/TLS termination           │
│  - Compression                   │
└──────────────────────────────────┘
```

---

## Key Features of This Stack

### NestJS + Fastify
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Fast** - Fastify 2-3x faster than Express
- ✅ **Scalable** - Module system for feature organization
- ✅ **Tested** - Built-in testing utilities
- ✅ **DI** - Dependency injection (like Spring/ASP.NET)

### MikroORM
- ✅ **C# familiar** - DbContext-like EntityManager
- ✅ **Change tracking** - Automatic change detection
- ✅ **Unit of Work** - em.fork() for transactions
- ✅ **Migrations** - Code-based, version controlled
- ✅ **Performance** - Identity map, lazy loading

### PostgreSQL
- ✅ **Robust** - ACID transactions
- ✅ **Rich types** - JSON, arrays, enums
- ✅ **Scalable** - Handles millions of records
- ✅ **Free** - Open source

---

## Conclusion

**This architecture stack is production-ready:**

✅ **Modern** - NestJS + Fastify are cutting edge
✅ **Performant** - Fastify is fastest Node.js framework
✅ **Developer-friendly** - Familiar for C# developers
✅ **Scalable** - Module system, clean architecture
✅ **Maintainable** - Clear folder structure, best practices
✅ **Testable** - Built-in testing framework
✅ **Deployable** - Docker ready

**Ready to code!** 🚀
