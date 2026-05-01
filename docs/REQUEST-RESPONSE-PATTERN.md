# Request/Response Pattern with Clean Layer Separation

## Vision

Clear naming convention for HTTP layer data:

```
Frontend (JSON)
        ↓
    IssueCreateRequest (what frontend sends)
        ↓
    Controller
        ↓
    Mapper (Request → DTO)
        ↓
    Service (works with DTO)
        ↓
    Mapper (DTO → Response)
        ↓
    IssueResponse (what frontend receives)
        ↓
Frontend (JSON)
```

**Naming Convention:**
- `XxxCreateRequest` = Data coming INTO the system (POST body)
- `XxxUpdateRequest` = Data coming INTO the system (PUT body)
- `XxxResponse` = Data going OUT of the system (HTTP response)
- `XxxDTO` = Internal representation (services)
- `XxxEntity` = Database model (ORM)

---

## Comparison: Old vs New Naming

### Old (Confusing)

```typescript
// What is this? Input or output?
export class CreateIssueDTO { }
export class IssueDTO { }
export class UpdateIssueDTO { }
export class IssueViewModel { }

// Mixed naming conventions
// Hard to understand data flow
```

### New (Crystal Clear)

```typescript
// HTTP Input (from frontend) - SUFFIX: Request
export class IssueCreateRequest { }
export class IssueUpdateRequest { }
export class IssueMoveRequest { }
export class AgentRunRequest { }

// HTTP Output (to frontend) - SUFFIX: Response
export class IssueResponse { }
export class IssueDetailResponse { }
export class AgentOutputResponse { }
export class SyncLogResponse { }

// Internal (services) - SUFFIX: DTO
export class IssueDTO { }
export class AgentOutputDTO { }

// Database (ORM) - SUFFIX: Entity
@Entity()
export class IssueEntity { }

@Entity()
export class AgentOutputEntity { }
```

---

## Three Clear Layers

```
┌──────────────────────────────────┐
│ HTTP Layer (Controllers)         │
├──────────────────────────────────┤
│ Input:  IssueCreateRequest       │
│ Output: IssueResponse            │
└────────────┬─────────────────────┘
             │ Mapper
┌────────────▼─────────────────────┐
│ Application Layer (Services)     │
├──────────────────────────────────┤
│ Works with: IssueDTO             │
│ Works with: AgentOutputDTO       │
└────────────┬─────────────────────┘
             │ Mapper
┌────────────▼─────────────────────┐
│ Persistence Layer (ORM)          │
├──────────────────────────────────┤
│ Entity: IssueEntity              │
│ Entity: AgentOutputEntity        │
└──────────────────────────────────┘
```

---

## File Organization

```
src/
├─ domain/
│  └─ entities/
│     ├─ IssueEntity.ts
│     ├─ AgentOutputEntity.ts
│     └─ UserEntity.ts
│
├─ application/
│  ├─ dto/
│  │  ├─ IssueDTO.ts
│  │  ├─ AgentOutputDTO.ts
│  │  └─ UserDTO.ts
│  │
│  └─ services/
│     ├─ IssueService.ts
│     ├─ AgentService.ts
│     └─ ...
│
├─ presentation/
│  ├─ http/
│  │  ├─ requests/
│  │  │  ├─ IssueCreateRequest.ts
│  │  │  ├─ IssueUpdateRequest.ts
│  │  │  ├─ IssueMoveRequest.ts
│  │  │  └─ ...
│  │  │
│  │  ├─ responses/
│  │  │  ├─ IssueResponse.ts
│  │  │  ├─ IssueDetailResponse.ts
│  │  │  ├─ AgentOutputResponse.ts
│  │  │  └─ ...
│  │  │
│  │  ├─ controllers/
│  │  │  ├─ IssueController.ts
│  │  │  ├─ AgentController.ts
│  │  │  └─ ...
│  │  │
│  │  └─ mappers/
│  │     ├─ request-mappers/
│  │     │  ├─ IssueCreateRequestMapper.ts
│  │     │  └─ IssueUpdateRequestMapper.ts
│  │     │
│  │     ├─ response-mappers/
│  │     │  ├─ IssueResponseMapper.ts
│  │     │  └─ AgentOutputResponseMapper.ts
│  │     │
│  │     └─ entity-mappers/
│  │        ├─ IssueEntityMapper.ts
│  │        └─ AgentOutputEntityMapper.ts
│  │
│  └─ middleware/
│     ├─ ErrorHandlerMiddleware.ts
│     └─ ...
```

---

## Request DTOs (Suffixed with Request)

### Request Classes (from Frontend)

```typescript
// presentation/http/requests/IssueCreateRequest.ts

import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator'

/**
 * What frontend sends when creating an issue
 * Example: POST /issues
 * Body: { title: "...", description: "...", source: "github" }
 */
export class IssueCreateRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string
  
  @IsOptional()
  @IsString()
  @MaxLength(5000)
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

// presentation/http/requests/IssueUpdateRequest.ts

/**
 * What frontend sends when updating an issue
 * Example: PUT /issues/{id}
 * Body: { title: "...", status: "done" }
 */
export class IssueUpdateRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string
  
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string
  
  @IsOptional()
  @IsEnum(['backlog', 'in_progress', 'done', 'stuck'])
  status?: string
  
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string
}

// presentation/http/requests/IssueMoveRequest.ts

/**
 * What frontend sends when moving issue in Kanban
 * Example: PUT /issues/{id}/move
 * Body: { column: "pm", position: 3 }
 */
export class IssueMoveRequest {
  @IsString()
  @IsEnum(['backlog', 'pm', 'architect', 'review', 'test', 'release'])
  column: string
  
  @IsOptional()
  @IsNumber()
  position?: number
}

// presentation/http/requests/AgentRunRequest.ts

/**
 * What frontend sends when running an agent
 * Example: POST /issues/{id}/run-agent
 * Body: { agent: "pm", feedback: "..." }
 */
export class AgentRunRequest {
  @IsString()
  @IsEnum(['pm', 'architect', 'reviewer', 'tester', 'planner'])
  agent: string
  
  @IsOptional()
  @IsString()
  feedback?: string
}

// presentation/http/requests/AgentOutputApproveRequest.ts

/**
 * What frontend sends when approving agent output
 * Example: PUT /issues/{id}/agent-output/{outputId}/approve
 * Body: { status: "approved", feedback: "..." }
 */
export class AgentOutputApproveRequest {
  @IsEnum(['approved', 'rejected'])
  status: string
  
  @IsOptional()
  @IsString()
  feedback?: string
}
```

---

## Response DTOs (Suffixed with Response)

### Response Classes (to Frontend)

```typescript
// presentation/http/responses/IssueResponse.ts

/**
 * What backend sends when listing issues or in summaries
 * Lightweight version with only essential fields
 * Used in list endpoints, Kanban board
 */
export class IssueResponse {
  id: string
  title: string
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE' | 'STUCK'
  statusLabel: string // 'Backlog', 'In Progress', etc
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priorityLabel: string
  
  source: string // 'jira', 'github', 'manual'
  createdByName: string
  agentOutputCount: number
  
  createdAt: string // ISO 8601
  formattedCreatedAt: string // 'Apr 18, 2024'
  updatedAt: string
}

// presentation/http/responses/IssueDetailResponse.ts

/**
 * What backend sends when getting a single issue
 * Full version with all related data
 * Used in detail endpoints
 */
export class IssueDetailResponse {
  id: string
  title: string
  description: string
  
  source: string // 'jira', 'github', etc
  sourceId?: string
  sourceUrl?: string
  
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE' | 'STUCK'
  statusLabel: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priorityLabel: string
  
  kanbanColumn: string
  kanbanPosition: number
  
  createdById: string
  createdByName: string
  
  enabledAgents: {
    pm: boolean
    architect: boolean
    implementer: boolean
    reviewer: boolean
    tester: boolean
    release: boolean
  }
  
  // Related data
  agentOutputs: AgentOutputResponse[]
  syncLogs: SyncLogResponse[]
  
  // Timestamps
  createdAt: string // ISO 8601
  formattedCreatedAt: string // 'Apr 18, 2024'
  updatedAt: string
  syncedAt?: string
}

// presentation/http/responses/AgentOutputResponse.ts

/**
 * What backend sends when returning agent output
 * Used in issue details and agent run endpoints
 */
export class AgentOutputResponse {
  id: string
  agent: 'pm' | 'architect' | 'reviewer' | 'tester' | 'planner'
  agentLabel: string // 'PM Agent', 'Architect Agent', etc
  version: number
  
  output: any // The JSON output from agent
  status: 'pending' | 'approved' | 'rejected' | 'synced'
  statusLabel: string
  
  cost: number
  costFormatted: string // '$0.80'
  
  inputTokens: number
  outputTokens: number
  totalTokens: number
  
  approvedBy?: string
  approvedAt?: string
  feedback?: string
  
  createdAt: string
  formattedCreatedAt: string
}

// presentation/http/responses/SyncLogResponse.ts

/**
 * What backend sends when returning sync history
 * Used in issue details
 */
export class SyncLogResponse {
  id: string
  
  direction: 'import' | 'export'
  directionLabel: string // 'Imported', 'Exported'
  
  source: 'jira' | 'github' | 'gitlab'
  action: 'created' | 'updated' | 'synced'
  actionLabel: string
  
  status: 'success' | 'failed' | 'pending'
  statusLabel: string
  statusColor: 'success' | 'danger' | 'warning'
  
  error?: string
  
  createdAt: string
  formattedCreatedAt: string
}

// presentation/http/responses/PaginatedResponse.ts

/**
 * Generic paginated response wrapper
 */
export class PaginatedResponse<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

// presentation/http/responses/ApiResponse.ts

/**
 * Standard API response wrapper for all endpoints
 */
export class ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    version: string
  }
}
```

---

## Mappers: Request → DTO

### Request Mappers

```typescript
// presentation/http/mappers/request-mappers/IssueCreateRequestMapper.ts

import { Injectable } from '@nestjs/common'
import { IssueCreateRequest } from '../../requests/IssueCreateRequest'
import { IssueDTO } from '../../../../application/dto/IssueDTO'

/**
 * Maps HTTP request to internal DTO
 * Adds server-side data (userId, timestamps)
 * Transforms request to DTO format
 */
@Injectable()
export class IssueCreateRequestMapper {
  map(request: IssueCreateRequest, userId: string): IssueDTO {
    return {
      title: request.title,
      description: request.description,
      source: request.source || 'manual',
      sourceId: request.sourceId,
      sourceUrl: request.sourceUrl,
      createdById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'backlog',
      priority: 'medium',
      kanbanColumn: 'backlog',
      kanbanPosition: 0,
      enabledAgents: {
        pm: true,
        architect: true,
        implementer: false,
        reviewer: true,
        tester: true,
        release: true
      }
    }
  }
}

// presentation/http/mappers/request-mappers/IssueUpdateRequestMapper.ts

import { Injectable } from '@nestjs/common'
import { IssueUpdateRequest } from '../../requests/IssueUpdateRequest'
import { IssueDTO } from '../../../../application/dto/IssueDTO'

/**
 * Maps HTTP update request to internal DTO
 * Only includes fields that should be updated
 */
@Injectable()
export class IssueUpdateRequestMapper {
  map(request: IssueUpdateRequest): Partial<IssueDTO> {
    const updates: Partial<IssueDTO> = {}
    
    if (request.title !== undefined) updates.title = request.title
    if (request.description !== undefined) updates.description = request.description
    if (request.status !== undefined) updates.status = request.status
    if (request.priority !== undefined) updates.priority = request.priority
    
    updates.updatedAt = new Date()
    
    return updates
  }
}

// presentation/http/mappers/request-mappers/IssueMoveRequestMapper.ts

import { Injectable } from '@nestjs/common'
import { IssueMoveRequest } from '../../requests/IssueMoveRequest'
import { IssueDTO } from '../../../../application/dto/IssueDTO'

/**
 * Maps move request to update DTO
 */
@Injectable()
export class IssueMoveRequestMapper {
  map(request: IssueMoveRequest): Partial<IssueDTO> {
    return {
      kanbanColumn: request.column,
      kanbanPosition: request.position || 0,
      status: request.column === 'backlog' ? 'backlog' : 'in_progress',
      updatedAt: new Date()
    }
  }
}

// presentation/http/mappers/request-mappers/AgentRunRequestMapper.ts

import { Injectable } from '@nestjs/common'
import { AgentRunRequest } from '../../requests/AgentRunRequest'

/**
 * Maps agent run request to service parameters
 * Validates agent type
 */
@Injectable()
export class AgentRunRequestMapper {
  map(request: AgentRunRequest) {
    return {
      agent: request.agent,
      feedback: request.feedback
    }
  }
}
```

---

## Mappers: DTO → Response

### Response Mappers

```typescript
// presentation/http/mappers/response-mappers/IssueResponseMapper.ts

import { Injectable } from '@nestjs/common'
import { IssueDTO } from '../../../../application/dto/IssueDTO'
import { IssueResponse } from '../../responses/IssueResponse'

/**
 * Maps internal DTO to HTTP response
 * Formats data for frontend (lowercase → UPPERCASE, etc)
 * Lightweight response for lists
 */
@Injectable()
export class IssueResponseMapper {
  map(dto: IssueDTO): IssueResponse {
    return {
      id: dto.id,
      title: dto.title,
      
      // Format status
      status: dto.status.toUpperCase() as 'BACKLOG' | 'IN_PROGRESS' | 'DONE' | 'STUCK',
      statusLabel: this.getStatusLabel(dto.status),
      
      // Format priority
      priority: dto.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      priorityLabel: this.getPriorityLabel(dto.priority),
      
      source: dto.source,
      createdByName: dto.createdByName,
      agentOutputCount: dto.agentOutputCount,
      
      // Format dates
      createdAt: dto.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(dto.createdAt),
      updatedAt: dto.updatedAt.toISOString()
    }
  }
  
  mapArray(dtos: IssueDTO[]): IssueResponse[] {
    return dtos.map(dto => this.map(dto))
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'backlog': 'Backlog',
      'in_progress': 'In Progress',
      'done': 'Done',
      'stuck': 'Stuck'
    }
    return labels[status] || status
  }
  
  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'critical': 'Critical'
    }
    return labels[priority] || priority
  }
  
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }
}

// presentation/http/mappers/response-mappers/IssueDetailResponseMapper.ts

import { Injectable } from '@nestjs/common'
import { IssueDTO } from '../../../../application/dto/IssueDTO'
import { IssueDetailResponse } from '../../responses/IssueDetailResponse'
import { AgentOutputResponseMapper } from './AgentOutputResponseMapper'
import { SyncLogResponseMapper } from './SyncLogResponseMapper'

/**
 * Maps internal DTO to detailed HTTP response
 * Full response for single issue endpoint
 * Includes related data (outputs, logs)
 */
@Injectable()
export class IssueDetailResponseMapper {
  constructor(
    private readonly agentOutputMapper: AgentOutputResponseMapper,
    private readonly syncLogMapper: SyncLogResponseMapper
  ) {}
  
  map(dto: IssueDTO): IssueDetailResponse {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      
      source: dto.source,
      sourceId: dto.sourceId,
      sourceUrl: dto.sourceUrl,
      
      status: dto.status.toUpperCase() as any,
      statusLabel: this.getStatusLabel(dto.status),
      priority: dto.priority.toUpperCase() as any,
      priorityLabel: this.getPriorityLabel(dto.priority),
      
      kanbanColumn: dto.kanbanColumn,
      kanbanPosition: dto.kanbanPosition,
      
      createdById: dto.createdById,
      createdByName: dto.createdByName,
      
      enabledAgents: dto.enabledAgents,
      
      // Map nested objects using their respective mappers
      agentOutputs: dto.agentOutputs?.map(ao =>
        this.agentOutputMapper.map(ao)
      ) || [],
      syncLogs: dto.syncLogs?.map(log =>
        this.syncLogMapper.map(log)
      ) || [],
      
      createdAt: dto.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(dto.createdAt),
      updatedAt: dto.updatedAt.toISOString(),
      syncedAt: dto.syncedAt?.toISOString()
    }
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'backlog': 'Backlog',
      'in_progress': 'In Progress',
      'done': 'Done',
      'stuck': 'Stuck'
    }
    return labels[status] || status
  }
  
  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
      'critical': 'Critical'
    }
    return labels[priority] || priority
  }
  
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }
}

// presentation/http/mappers/response-mappers/AgentOutputResponseMapper.ts

import { Injectable } from '@nestjs/common'
import { AgentOutputDTO } from '../../../../application/dto/AgentOutputDTO'
import { AgentOutputResponse } from '../../responses/AgentOutputResponse'

/**
 * Maps agent output DTO to HTTP response
 * Formats data for frontend display
 */
@Injectable()
export class AgentOutputResponseMapper {
  map(dto: AgentOutputDTO): AgentOutputResponse {
    return {
      id: dto.id,
      agent: dto.agent,
      agentLabel: this.getAgentLabel(dto.agent),
      version: dto.version,
      
      output: dto.outputData,
      status: dto.status,
      statusLabel: this.getStatusLabel(dto.status),
      
      cost: dto.cost || 0,
      costFormatted: `$${(dto.cost || 0).toFixed(2)}`,
      
      inputTokens: dto.inputTokens || 0,
      outputTokens: dto.outputTokens || 0,
      totalTokens: (dto.inputTokens || 0) + (dto.outputTokens || 0),
      
      approvedBy: dto.approvedBy,
      approvedAt: dto.approvedAt?.toISOString(),
      feedback: dto.feedback,
      
      createdAt: dto.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(dto.createdAt)
    }
  }
  
  mapArray(dtos: AgentOutputDTO[]): AgentOutputResponse[] {
    return dtos.map(dto => this.map(dto))
  }
  
  private getAgentLabel(agent: string): string {
    const labels: Record<string, string> = {
      'pm': 'PM Agent',
      'architect': 'Architect Agent',
      'reviewer': 'Code Reviewer',
      'tester': 'Test Verifier',
      'planner': 'Release Planner'
    }
    return labels[agent] || agent
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'synced': 'Synced'
    }
    return labels[status] || status
  }
  
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }
}

// presentation/http/mappers/response-mappers/SyncLogResponseMapper.ts

import { Injectable } from '@nestjs/common'
import { SyncLogDTO } from '../../../../application/dto/SyncLogDTO'
import { SyncLogResponse } from '../../responses/SyncLogResponse'

/**
 * Maps sync log DTO to HTTP response
 */
@Injectable()
export class SyncLogResponseMapper {
  map(dto: SyncLogDTO): SyncLogResponse {
    return {
      id: dto.id,
      
      direction: dto.direction,
      directionLabel: this.getDirectionLabel(dto.direction),
      
      source: dto.source,
      action: dto.action,
      actionLabel: this.getActionLabel(dto.action),
      
      status: dto.status,
      statusLabel: this.getStatusLabel(dto.status),
      statusColor: this.getStatusColor(dto.status),
      
      error: dto.error,
      
      createdAt: dto.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(dto.createdAt)
    }
  }
  
  mapArray(dtos: SyncLogDTO[]): SyncLogResponse[] {
    return dtos.map(dto => this.map(dto))
  }
  
  private getDirectionLabel(direction: string): string {
    return direction === 'import' ? 'Imported' : 'Exported'
  }
  
  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'created': 'Created',
      'updated': 'Updated',
      'synced': 'Synced'
    }
    return labels[action] || action
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'success': 'Success',
      'failed': 'Failed',
      'pending': 'Pending'
    }
    return labels[status] || status
  }
  
  private getStatusColor(status: string): 'success' | 'danger' | 'warning' {
    switch (status) {
      case 'success': return 'success'
      case 'failed': return 'danger'
      case 'pending': return 'warning'
      default: return 'warning'
    }
  }
  
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }
}
```

---

## Controller with Request/Response Pattern

```typescript
// presentation/http/controllers/IssueController.ts

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
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard } from '../guards/JwtAuthGuard'
import { IssueService } from '../../../application/services/IssueService'

// Requests
import { IssueCreateRequest } from '../requests/IssueCreateRequest'
import { IssueUpdateRequest } from '../requests/IssueUpdateRequest'
import { IssueMoveRequest } from '../requests/IssueMoveRequest'
import { AgentRunRequest } from '../requests/AgentRunRequest'
import { AgentOutputApproveRequest } from '../requests/AgentOutputApproveRequest'

// Responses
import { IssueResponse } from '../responses/IssueResponse'
import { IssueDetailResponse } from '../responses/IssueDetailResponse'
import { AgentOutputResponse } from '../responses/AgentOutputResponse'
import { PaginatedResponse } from '../responses/PaginatedResponse'
import { ApiResponse } from '../responses/ApiResponse'

// Mappers - Request
import { IssueCreateRequestMapper } from '../mappers/request-mappers/IssueCreateRequestMapper'
import { IssueUpdateRequestMapper } from '../mappers/request-mappers/IssueUpdateRequestMapper'
import { IssueMoveRequestMapper } from '../mappers/request-mappers/IssueMoveRequestMapper'
import { AgentRunRequestMapper } from '../mappers/request-mappers/AgentRunRequestMapper'

// Mappers - Response
import { IssueResponseMapper } from '../mappers/response-mappers/IssueResponseMapper'
import { IssueDetailResponseMapper } from '../mappers/response-mappers/IssueDetailResponseMapper'
import { AgentOutputResponseMapper } from '../mappers/response-mappers/AgentOutputResponseMapper'

@Controller('issues')
export class IssueController {
  constructor(
    private readonly issueService: IssueService,
    
    // Request mappers
    private readonly createRequestMapper: IssueCreateRequestMapper,
    private readonly updateRequestMapper: IssueUpdateRequestMapper,
    private readonly moveRequestMapper: IssueMoveRequestMapper,
    private readonly agentRunRequestMapper: AgentRunRequestMapper,
    
    // Response mappers
    private readonly issueResponseMapper: IssueResponseMapper,
    private readonly issueDetailResponseMapper: IssueDetailResponseMapper,
    private readonly agentOutputResponseMapper: AgentOutputResponseMapper
  ) {}
  
  /**
   * CREATE: POST /issues
   * Request: IssueCreateRequest (from frontend)
   * Response: IssueDetailResponse (to frontend)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() request: IssueCreateRequest,
    @Request() req: any
  ): Promise<ApiResponse<IssueDetailResponse>> {
    // Step 1: Map Request → DTO
    const dto = this.createRequestMapper.map(request, req.user.id)
    
    // Step 2: Call service (works with DTO)
    const resultDTO = await this.issueService.createIssue(dto)
    
    // Step 3: Map DTO → Response
    const response = this.issueDetailResponseMapper.map(resultDTO)
    
    // Step 4: Return API response
    return {
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    }
  }
  
  /**
   * READ LIST: GET /issues?skip=0&take=20
   * Response: PaginatedResponse<IssueResponse>
   */
  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ): Promise<ApiResponse<PaginatedResponse<IssueResponse>>> {
    const skipNum = skip ? parseInt(skip) : 0
    const takeNum = take ? parseInt(take) : 20
    
    // Call service (works with DTO)
    const [dtos, total] = await this.issueService.listIssues(skipNum, takeNum)
    
    // Map each DTO → Response
    const responses = this.issueResponseMapper.mapArray(dtos)
    
    return {
      success: true,
      data: {
        items: responses,
        pagination: {
          total,
          page: Math.floor(skipNum / takeNum) + 1,
          pageSize: takeNum,
          totalPages: Math.ceil(total / takeNum),
          hasNextPage: skipNum + takeNum < total,
          hasPreviousPage: skipNum > 0
        }
      }
    }
  }
  
  /**
   * READ DETAIL: GET /issues/{id}
   * Response: IssueDetailResponse
   */
  @Get(':id')
  async getOne(
    @Param('id') id: string
  ): Promise<ApiResponse<IssueDetailResponse>> {
    // Call service (works with DTO)
    const dto = await this.issueService.getIssueById(id)
    
    // Map DTO → Response
    const response = this.issueDetailResponseMapper.map(dto)
    
    return {
      success: true,
      data: response
    }
  }
  
  /**
   * UPDATE: PUT /issues/{id}
   * Request: IssueUpdateRequest
   * Response: IssueDetailResponse
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() request: IssueUpdateRequest
  ): Promise<ApiResponse<IssueDetailResponse>> {
    // Step 1: Map Request → DTO (partial)
    const updates = this.updateRequestMapper.map(request)
    
    // Step 2: Call service
    const resultDTO = await this.issueService.updateIssue(id, updates)
    
    // Step 3: Map DTO → Response
    const response = this.issueDetailResponseMapper.map(resultDTO)
    
    return {
      success: true,
      data: response
    }
  }
  
  /**
   * MOVE (Kanban): PUT /issues/{id}/move
   * Request: IssueMoveRequest
   * Response: IssueDetailResponse
   */
  @Put(':id/move')
  @UseGuards(JwtAuthGuard)
  async move(
    @Param('id') id: string,
    @Body() request: IssueMoveRequest
  ): Promise<ApiResponse<IssueDetailResponse>> {
    // Step 1: Map Request → DTO
    const updates = this.moveRequestMapper.map(request)
    
    // Step 2: Call service
    const resultDTO = await this.issueService.updateIssue(id, updates)
    
    // Step 3: Map DTO → Response
    const response = this.issueDetailResponseMapper.map(resultDTO)
    
    return {
      success: true,
      data: response
    }
  }
  
  /**
   * RUN AGENT: POST /issues/{id}/run-agent
   * Request: AgentRunRequest
   * Response: AgentOutputResponse
   */
  @Post(':id/run-agent')
  @UseGuards(JwtAuthGuard)
  async runAgent(
    @Param('id') id: string,
    @Body() request: AgentRunRequest
  ): Promise<ApiResponse<AgentOutputResponse>> {
    // Step 1: Map Request → parameters
    const params = this.agentRunRequestMapper.map(request)
    
    // Step 2: Call service
    const outputDTO = await this.issueService.runAgent(id, params.agent, params.feedback)
    
    // Step 3: Map DTO → Response
    const response = this.agentOutputResponseMapper.map(outputDTO)
    
    return {
      success: true,
      data: response
    }
  }
  
  /**
   * DELETE: DELETE /issues/{id}
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string
  ): Promise<void> {
    await this.issueService.deleteIssue(id)
  }
}
```

---

## Mapping Module (Dependency Injection)

```typescript
// presentation/http/mappers/mappers.module.ts

import { Module } from '@nestjs/common'

// Request Mappers
import { IssueCreateRequestMapper } from './request-mappers/IssueCreateRequestMapper'
import { IssueUpdateRequestMapper } from './request-mappers/IssueUpdateRequestMapper'
import { IssueMoveRequestMapper } from './request-mappers/IssueMoveRequestMapper'
import { AgentRunRequestMapper } from './request-mappers/AgentRunRequestMapper'

// Response Mappers
import { IssueResponseMapper } from './response-mappers/IssueResponseMapper'
import { IssueDetailResponseMapper } from './response-mappers/IssueDetailResponseMapper'
import { AgentOutputResponseMapper } from './response-mappers/AgentOutputResponseMapper'
import { SyncLogResponseMapper } from './response-mappers/SyncLogResponseMapper'

// Entity Mappers (from previous documents)
import { IssueEntityMapper } from './entity-mappers/IssueEntityMapper'
import { AgentOutputEntityMapper } from './entity-mappers/AgentOutputEntityMapper'

@Module({
  providers: [
    // Request Mappers
    IssueCreateRequestMapper,
    IssueUpdateRequestMapper,
    IssueMoveRequestMapper,
    AgentRunRequestMapper,
    
    // Response Mappers
    IssueResponseMapper,
    IssueDetailResponseMapper,
    AgentOutputResponseMapper,
    SyncLogResponseMapper,
    
    // Entity Mappers
    IssueEntityMapper,
    AgentOutputEntityMapper
  ],
  exports: [
    // Request Mappers
    IssueCreateRequestMapper,
    IssueUpdateRequestMapper,
    IssueMoveRequestMapper,
    AgentRunRequestMapper,
    
    // Response Mappers
    IssueResponseMapper,
    IssueDetailResponseMapper,
    AgentOutputResponseMapper,
    SyncLogResponseMapper,
    
    // Entity Mappers
    IssueEntityMapper,
    AgentOutputEntityMapper
  ]
})
export class MappersModule {}
```

---

## Summary: Request/Response Pattern

```
┌─────────────────────────────────────────┐
│ Frontend sends JSON                     │
├─────────────────────────────────────────┤
│ IssueCreateRequest                      │
│ {                                       │
│   title: "Payment System",              │
│   description: "..."                    │
│ }                                       │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │   Mapper    │
        │   Request   │
        │     →       │
        │    DTO      │
        └──────┬──────┘
               │
┌──────────────▼──────────────────────────┐
│ Service (works with IssueDTO)           │
│ - Business logic                        │
│ - Database operations                   │
│ - Returns IssueDTO                      │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │   Mapper    │
        │    DTO      │
        │     →       │
        │  Response   │
        └──────┬──────┘
               │
┌──────────────▼──────────────────────────┐
│ IssueDetailResponse                     │
│ {                                       │
│   id: "123",                            │
│   title: "Payment System",              │
│   status: "IN_PROGRESS",                │
│   statusLabel: "In Progress",           │
│   agentOutputs: [...],                  │
│   createdAt: "2024-04-18T..."           │
│ }                                       │
├─────────────────────────────────────────┤
│ Frontend receives JSON                  │
└─────────────────────────────────────────┘
```

---

## Benefits of Request/Response Naming

✅ **Crystal clear intent:**
- `IssueCreateRequest` = comes FROM frontend
- `IssueResponse` = goes TO frontend

✅ **No ambiguity:**
- Unlike `CreateIssueDTO` (is this input or output?)
- Unlike `IssueViewModel` (is this for display?)

✅ **Consistent across codebase:**
- Every HTTP endpoint follows same pattern
- New developers immediately understand

✅ **Type-safe at every layer:**
- Compiler catches mismatches
- No runtime surprises

✅ **Easy to maintain:**
- Changing Response doesn't affect Request
- Changing Request doesn't affect Response
- Service changes are isolated

✅ **Perfect for C# developers:**
- Similar to Input/Output models in ASP.NET
- Clear separation like DataContract attributes

---

## Complete Data Flow Example

```
Frontend User creates issue:

1. Frontend: POST /issues
   Body: IssueCreateRequest {
     title: "Add Stripe Payment",
     description: "Integrate Stripe for payment processing"
   }

2. Controller receives and validates
   @Body() request: IssueCreateRequest

3. Mapper: IssueCreateRequest → IssueDTO
   {
     title: "Add Stripe Payment",
     description: "Integrate Stripe...",
     createdById: "user-123",
     createdAt: 2024-04-18T10:30:00Z,
     status: "backlog",
     priority: "medium",
     kanbanColumn: "backlog",
     enabledAgents: {...}
   }

4. Service: CreateIssue(DTO)
   - Creates Entity from DTO
   - Saves to database
   - Returns DTO

5. Mapper: IssueDTO → IssueDetailResponse
   {
     id: "issue-456",
     title: "Add Stripe Payment",
     description: "Integrate Stripe...",
     status: "BACKLOG",
     statusLabel: "Backlog",
     priority: "MEDIUM",
     priorityLabel: "Medium",
     createdAt: "2024-04-18T10:30:00Z",
     formattedCreatedAt: "Apr 18, 2024",
     agentOutputs: [],
     syncLogs: []
   }

6. API Response: ApiResponse<IssueDetailResponse>
   {
     success: true,
     data: {...},
     meta: {...}
   }

7. Frontend receives and displays
   - Type-safe JSON response
   - No database details leaked
   - UI-formatted values
```

---

## Conclusion

**Request/Response Pattern provides:**

✅ **Clear naming convention** (Request = input, Response = output)
✅ **Complete layer separation** (Presentation → Application → Domain)
✅ **Type safety** at every boundary
✅ **Easy maintenance** (change Request without affecting Response)
✅ **Frontend-friendly** (formatted, localized responses)
✅ **Familiar to C# developers** (like Input/Output models)

**This pattern scales beautifully** as your application grows! 🚀

