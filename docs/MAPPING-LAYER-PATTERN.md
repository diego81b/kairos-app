# KAIROS Mapping Layer Pattern

## Vision

Complete separation of layers through mapping:

```
External World (Frontend)
        ↑↓
    ViewModel (JSON Response)
        ↑↓
    Mapper (DTO ↔ ViewModel)
        ↑↓
    Data Transfer Object (DTO)
        ↑↓
    Mapper (Entity ↔ DTO)
        ↑↓
    Entity (Database Model)
        ↑↓
Domain Logic
```

**Why this matters:**
- Frontend doesn't know about database structure
- Database doesn't know about API contracts
- Services don't leak domain objects
- Each layer can evolve independently
- Easy testing with mocks

---

## Comparison: C# AutoMapper vs TypeScript

### C# (you know):

```csharp
// AutoMapper
var config = new MapperConfiguration(cfg => {
    cfg.CreateMap<Issue, IssueDTO>()
        .ForMember(d => d.CreatedByName, 
                   opt => opt.MapFrom(s => s.CreatedBy.Name));
    
    cfg.CreateMap<IssueDTO, IssueViewModel>()
        .ForMember(v => v.DisplayStatus,
                   opt => opt.MapFrom(s => s.Status.ToUpper()));
});

var mapper = config.CreateMapper();
var dto = mapper.Map<IssueDTO>(entity);
var viewModel = mapper.Map<IssueViewModel>(dto);
```

### TypeScript Equivalent (class-transformer + custom):

```typescript
// TypeScript approach (similar to AutoMapper)
// Option 1: class-transformer (automatic)
import { plainToInstance, instanceToPlain } from 'class-transformer'

const dto = plainToInstance(IssueDTO, entity)
const json = instanceToPlain(dto)

// Option 2: Custom mappers (more control)
@Injectable()
export class IssueMapper {
  dtoToEntity(dto: CreateIssueDTO): Issue {
    const issue = new Issue()
    issue.title = dto.title
    issue.description = dto.description
    return issue
  }
  
  entityToDTO(entity: Issue): IssueDTO {
    return {
      id: entity.id,
      title: entity.title,
      createdByName: entity.createdBy.name
    }
  }
  
  dtoToViewModel(dto: IssueDTO): IssueViewModel {
    return {
      id: dto.id,
      title: dto.title,
      displayStatus: dto.status.toUpperCase()
    }
  }
}

// Recommended: Mix both approaches
// Use class-transformer for simple mappings
// Use custom mappers for complex logic
```

---

## Three Mapping Layers

### Layer 1: Entity ↔ DTO (Persistence)

**Purpose:** Separate what the database knows from what services know

```
Entity (what database returns)
        ↓
DTO (normalized for services)
        ↓
Service logic
```

**Example:**

```typescript
// Entity (from database)
@Entity()
export class Issue {
  @PrimaryKey()
  id: string
  
  @Property()
  title: string
  
  @ManyToOne()
  createdBy: User // Relationship
  
  @OneToMany()
  agentOutputs: Collection<AgentOutput>
  
  @Property({ type: 'json' })
  enabledAgents: Record<string, boolean>
}

// DTO (for internal use)
export class IssueDTO {
  id: string
  title: string
  description: string
  createdById: string
  createdByName: string // Denormalized from User
  agentOutputCount: number // Computed
  status: string
}

// Mapper (Entity → DTO)
@Injectable()
export class IssueEntityMapper {
  entityToDTO(entity: Issue): IssueDTO {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      createdById: entity.createdBy.id,
      createdByName: entity.createdBy.name, // Flatten
      agentOutputCount: entity.agentOutputs.length, // Compute
      status: entity.status
    }
  }
  
  dtoToEntity(dto: IssueDTO, entity: Issue): Issue {
    entity.title = dto.title
    entity.description = dto.description
    // createdById should be set separately
    return entity
  }
}
```

### Layer 2: DTO ↔ CreateDTO (Input)

**Purpose:** Separate what frontend sends from what services use

```
HTTP Request Body
        ↓
CreateIssueDTO (validated input)
        ↓
IssueDTO (internal representation)
        ↓
Service logic
```

**Example:**

```typescript
// CreateIssueDTO (what frontend sends)
export class CreateIssueDTO {
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
}

// IssueDTO (internal)
export class IssueDTO {
  id: string
  title: string
  description?: string
  source: string
  sourceId?: string
  createdById: string
  createdAt: Date
  // ... more fields
}

// Mapper (CreateDTO → DTO)
@Injectable()
export class CreateIssueMapper {
  createDTOToDTO(
    createDTO: CreateIssueDTO,
    userId: string
  ): Partial<IssueDTO> {
    return {
      title: createDTO.title,
      description: createDTO.description,
      source: createDTO.source || 'manual',
      sourceId: createDTO.sourceId,
      createdById: userId,
      createdAt: new Date()
    }
  }
}
```

### Layer 3: DTO ↔ ViewModel (Output)

**Purpose:** Separate what services return from what frontend displays

```
IssueDTO (from service)
        ↓
IssueViewModel (for HTTP response)
        ↓
JSON Response to Frontend
```

**Example:**

```typescript
// IssueDTO (from service)
export class IssueDTO {
  id: string
  title: string
  status: string // 'backlog' | 'in_progress' | 'done'
  createdAt: Date
  agentOutputCount: number
}

// IssueViewModel (for API response)
export class IssueViewModel {
  id: string
  title: string
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE' // UI-friendly
  statusLabel: string // 'Backlog' (localized)
  createdAt: string // ISO string
  agentOutputCount: number
  formattedCreatedAt: string // 'Apr 18, 2024'
}

// Mapper (DTO → ViewModel)
@Injectable()
export class IssueViewModelMapper {
  dtoToViewModel(dto: IssueDTO): IssueViewModel {
    return {
      id: dto.id,
      title: dto.title,
      status: dto.status.toUpperCase(), // Format for UI
      statusLabel: this.getStatusLabel(dto.status), // Localization
      createdAt: dto.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(dto.createdAt), // UI display
      agentOutputCount: dto.agentOutputCount
    }
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'backlog': 'Backlog',
      'in_progress': 'In Progress',
      'done': 'Done'
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
```

---

## Complete Mapping Flow in Service

```typescript
@Injectable()
export class IssueService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    
    // Mappers
    private readonly entityMapper: IssueEntityMapper,
    private readonly createMapper: CreateIssueMapper,
    private readonly viewModelMapper: IssueViewModelMapper
  ) {}
  
  // CREATE FLOW
  async createIssue(
    createDTO: CreateIssueDTO,
    userId: string
  ): Promise<IssueViewModel> {
    // Step 1: Map CreateDTO → DTO
    const partialDTO = this.createMapper.createDTOToDTO(createDTO, userId)
    
    // Step 2: Map DTO → Entity
    const entity = new Issue()
    entity.title = partialDTO.title
    entity.description = partialDTO.description
    entity.source = partialDTO.source
    
    // Step 3: Persist entity
    this.em.persist(entity)
    await this.em.flush()
    
    // Step 4: Map Entity → DTO
    const dto = this.entityMapper.entityToDTO(entity)
    
    // Step 5: Map DTO → ViewModel (for response)
    return this.viewModelMapper.dtoToViewModel(dto)
  }
  
  // READ FLOW
  async getIssue(id: string): Promise<IssueViewModel> {
    // Step 1: Get entity from database
    const entity = await this.issueRepository.findOne(
      { id },
      { populate: ['createdBy', 'agentOutputs'] }
    )
    
    if (!entity) {
      throw new NotFoundException('Issue not found')
    }
    
    // Step 2: Map Entity → DTO
    const dto = this.entityMapper.entityToDTO(entity)
    
    // Step 3: Map DTO → ViewModel (for response)
    return this.viewModelMapper.dtoToViewModel(dto)
  }
  
  // UPDATE FLOW
  async updateIssue(
    id: string,
    updateDTO: UpdateIssueDTO
  ): Promise<IssueViewModel> {
    // Step 1: Get entity
    const entity = await this.issueRepository.findOne({ id })
    
    if (!entity) {
      throw new NotFoundException('Issue not found')
    }
    
    // Step 2: Map UpdateDTO → Entity
    if (updateDTO.title) entity.title = updateDTO.title
    if (updateDTO.status) entity.status = updateDTO.status
    
    // Step 3: Persist changes
    await this.em.flush()
    
    // Step 4: Map Entity → DTO
    const dto = this.entityMapper.entityToDTO(entity)
    
    // Step 5: Map DTO → ViewModel
    return this.viewModelMapper.dtoToViewModel(dto)
  }
  
  // LIST FLOW
  async listIssues(
    skip: number = 0,
    take: number = 20
  ): Promise<{
    items: IssueViewModel[]
    total: number
  }> {
    // Step 1: Get entities
    const [entities, total] = await this.issueRepository.findAndCount(
      {},
      { offset: skip, limit: take, populate: ['createdBy'] }
    )
    
    // Step 2: Map each Entity → DTO
    const dtos = entities.map(e => this.entityMapper.entityToDTO(e))
    
    // Step 3: Map each DTO → ViewModel
    const viewModels = dtos.map(d => this.viewModelMapper.dtoToViewModel(d))
    
    return {
      items: viewModels,
      total
    }
  }
}
```

---

## Controller Layer (Uses ViewModels)

```typescript
@Controller('issues')
export class IssueController {
  constructor(
    private readonly issueService: IssueService,
    private readonly viewModelMapper: IssueViewModelMapper
  ) {}
  
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createDTO: CreateIssueDTO,
    @Request() req: any
  ): Promise<ApiResponse<IssueViewModel>> {
    // Service returns ViewModel
    const viewModel = await this.issueService.createIssue(
      createDTO,
      req.user.id
    )
    
    // Return standard response
    return {
      success: true,
      data: viewModel,
      meta: {
        timestamp: new Date().toISOString()
      }
    }
  }
  
  @Get(':id')
  async getOne(
    @Param('id') id: string
  ): Promise<ApiResponse<IssueViewModel>> {
    // Service returns ViewModel
    const viewModel = await this.issueService.getIssue(id)
    
    return {
      success: true,
      data: viewModel
    }
  }
  
  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ): Promise<ApiResponse<{
    items: IssueViewModel[]
    total: number
  }>> {
    const result = await this.issueService.listIssues(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20
    )
    
    return {
      success: true,
      data: result
    }
  }
  
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDTO: UpdateIssueDTO
  ): Promise<ApiResponse<IssueViewModel>> {
    const viewModel = await this.issueService.updateIssue(id, updateDTO)
    
    return {
      success: true,
      data: viewModel
    }
  }
}
```

---

## Mapper Organization

```
mappers/
├─ interfaces/
│  ├─ IMapper.ts
│  └─ IEntityMapper.ts
│
├─ entity-mappers/
│  ├─ IssueEntityMapper.ts      (Entity ↔ DTO)
│  ├─ AgentOutputEntityMapper.ts
│  └─ UserEntityMapper.ts
│
├─ dto-mappers/
│  ├─ CreateIssueMapper.ts      (CreateDTO → DTO)
│  ├─ UpdateIssueMapper.ts      (UpdateDTO → DTO)
│  └─ CreateAgentOutputMapper.ts
│
├─ viewmodel-mappers/
│  ├─ IssueViewModelMapper.ts   (DTO → ViewModel)
│  ├─ AgentOutputViewModelMapper.ts
│  └─ UserViewModelMapper.ts
│
└─ mapping.module.ts             (Import all mappers)
```

### Mapper Interface

```typescript
// mappers/interfaces/IMapper.ts

export interface IMapper<TSource, TDestination> {
  map(source: TSource): TDestination
  mapArray(sources: TSource[]): TDestination[]
}

export interface IEntityMapper<TEntity, TDto> {
  entityToDTO(entity: TEntity): TDto
  dtoToEntity(dto: TDto): TEntity
  entityToDTOArray(entities: TEntity[]): TDto[]
}

export interface IViewModelMapper<TDto, TViewModel> {
  dtoToViewModel(dto: TDto): TViewModel
  dtoToViewModelArray(dtos: TDto[]): TViewModel[]
}
```

### Mapping Module

```typescript
// mappers/mapping.module.ts

import { Module } from '@nestjs/common'

import { IssueEntityMapper } from './entity-mappers/IssueEntityMapper'
import { AgentOutputEntityMapper } from './entity-mappers/AgentOutputEntityMapper'
import { UserEntityMapper } from './entity-mappers/UserEntityMapper'

import { CreateIssueMapper } from './dto-mappers/CreateIssueMapper'
import { UpdateIssueMapper } from './dto-mappers/UpdateIssueMapper'

import { IssueViewModelMapper } from './viewmodel-mappers/IssueViewModelMapper'
import { AgentOutputViewModelMapper } from './viewmodel-mappers/AgentOutputViewModelMapper'

@Module({
  providers: [
    // Entity Mappers
    IssueEntityMapper,
    AgentOutputEntityMapper,
    UserEntityMapper,
    
    // DTO Mappers
    CreateIssueMapper,
    UpdateIssueMapper,
    
    // ViewModel Mappers
    IssueViewModelMapper,
    AgentOutputViewModelMapper
  ],
  exports: [
    IssueEntityMapper,
    AgentOutputEntityMapper,
    UserEntityMapper,
    CreateIssueMapper,
    UpdateIssueMapper,
    IssueViewModelMapper,
    AgentOutputViewModelMapper
  ]
})
export class MappingModule {}
```

---

## Advanced Mapping Scenarios

### 1. Nested Mappings

```typescript
// Issue has AgentOutputs relationship

@Injectable()
export class IssueViewModelMapper {
  constructor(
    private readonly agentOutputMapper: AgentOutputViewModelMapper
  ) {}
  
  dtoToViewModel(dto: IssueDTO): IssueViewModel {
    return {
      id: dto.id,
      title: dto.title,
      // Map nested objects
      agentOutputs: dto.agentOutputs?.map(ao =>
        this.agentOutputMapper.dtoToViewModel(ao)
      ) || []
    }
  }
}
```

### 2. Conditional Mapping

```typescript
@Injectable()
export class IssueViewModelMapper {
  dtoToViewModel(dto: IssueDTO, includeDetails = false): IssueViewModel {
    const viewModel: IssueViewModel = {
      id: dto.id,
      title: dto.title
    }
    
    // Only include expensive data if requested
    if (includeDetails) {
      viewModel.description = dto.description
      viewModel.agentOutputs = dto.agentOutputs
      viewModel.syncHistory = dto.syncHistory
    }
    
    return viewModel
  }
}
```

### 3. Transformation During Mapping

```typescript
@Injectable()
export class CostLogViewModelMapper {
  dtoToViewModel(dto: CostLogDTO): CostLogViewModel {
    return {
      id: dto.id,
      provider: dto.provider,
      model: dto.model,
      
      // Transform
      cost: this.formatCost(dto.cost),
      costFormatted: `$${dto.cost.toFixed(2)}`,
      
      // Compute
      totalTokens: dto.inputTokens + dto.outputTokens,
      costPerToken: dto.cost / (dto.inputTokens + dto.outputTokens),
      
      // Format
      date: this.formatDate(dto.createdAt),
      time: this.formatTime(dto.createdAt)
    }
  }
  
  private formatCost(cost: number): number {
    return Math.round(cost * 100) / 100
  }
}
```

### 4. Bulk Mapping with Performance

```typescript
@Injectable()
export class IssueViewModelMapper {
  // Single item
  dtoToViewModel(dto: IssueDTO): IssueViewModel {
    return { /* ... */ }
  }
  
  // Array (optimized)
  dtoToViewModelArray(dtos: IssueDTO[]): IssueViewModel[] {
    // Batch cache lookups if needed
    return dtos.map(dto => this.dtoToViewModel(dto))
  }
  
  // With pagination
  dtoToViewModelPaginated(
    dtos: IssueDTO[],
    total: number
  ): PaginatedViewModel<IssueViewModel> {
    return {
      items: this.dtoToViewModelArray(dtos),
      pagination: {
        total,
        hasMore: dtos.length < total
      }
    }
  }
}
```

---

## Comparison: With vs Without Mapping

### Without Mapping (Bad)

```typescript
// Entity leaked to HTTP layer
@Get(':id')
async getIssue(@Param('id') id: string) {
  const issue = await this.issueRepository.findOne(id)
  return issue // Returns Entity directly!
}

// Problems:
// ❌ Frontend sees database relationships
// ❌ Can't format dates for UI
// ❌ Can't denormalize data
// ❌ Database schema changes break API
// ❌ Can't add computed fields
// ❌ No way to hide sensitive data
```

### With Mapping (Good)

```typescript
// Entity → DTO → ViewModel
@Get(':id')
async getIssue(@Param('id') id: string): Promise<IssueViewModel> {
  const entity = await this.issueRepository.findOne(id)
  const dto = this.entityMapper.entityToDTO(entity)
  return this.viewModelMapper.dtoToViewModel(dto)
}

// Benefits:
// ✅ Frontend sees API contract only
// ✅ Can format dates, enum values
// ✅ Can denormalize (flatten relationships)
// ✅ Database changes don't break API
// ✅ Can add computed fields
// ✅ Can filter sensitive data
// ✅ Easy to version API (old/new ViewModels)
```

---

## Testing Mappers

```typescript
describe('IssueViewModelMapper', () => {
  let mapper: IssueViewModelMapper
  
  beforeEach(() => {
    mapper = new IssueViewModelMapper()
  })
  
  describe('dtoToViewModel', () => {
    it('should map status to uppercase', () => {
      const dto: IssueDTO = {
        id: '1',
        title: 'Test',
        status: 'backlog'
      }
      
      const viewModel = mapper.dtoToViewModel(dto)
      
      expect(viewModel.status).toBe('BACKLOG')
    })
    
    it('should format date', () => {
      const date = new Date('2024-04-18')
      const dto: IssueDTO = {
        // ...
        createdAt: date
      }
      
      const viewModel = mapper.dtoToViewModel(dto)
      
      expect(viewModel.formattedCreatedAt).toBe('Apr 18, 2024')
    })
    
    it('should map nested agentOutputs', () => {
      const dto: IssueDTO = {
        // ...
        agentOutputs: [
          { id: '1', agent: 'pm' },
          { id: '2', agent: 'architect' }
        ]
      }
      
      const viewModel = mapper.dtoToViewModel(dto)
      
      expect(viewModel.agentOutputs).toHaveLength(2)
      expect(viewModel.agentOutputs[0].agent).toBe('pm')
    })
  })
})
```

---

## Best Practices

### 1. Always Use Mappers

```typescript
// ❌ Bad
return entity

// ✅ Good
const dto = this.entityMapper.entityToDTO(entity)
return this.viewModelMapper.dtoToViewModel(dto)
```

### 2. Keep Mappers Simple

```typescript
// ❌ Bad - Business logic in mapper
dtoToViewModel(dto: IssueDTO): IssueViewModel {
  return {
    // ...
    totalCost: this.calculateComplexCost(dto) // Wrong place!
  }
}

// ✅ Good - Keep it simple
dtoToViewModel(dto: IssueDTO): IssueViewModel {
  return {
    // ...
    totalCost: dto.totalCost // Already computed
  }
}
```

### 3. One Mapper Per Direction

```typescript
// ❌ Bad - Bidirectional in one mapper
class IssueMapper {
  dtoToViewModel(dto) { /* ... */ }
  viewModelToDTO(vm) { /* ... */ } // Confusing
}

// ✅ Good - Separate mappers
class IssueViewModelMapper {
  dtoToViewModel(dto) { /* ... */ }
}

class CreateIssueMapper {
  createDTOToDTO(createDTO) { /* ... */ }
}
```

### 4. Use Type Safety

```typescript
// ❌ Bad - Any type
dtoToViewModel(dto: any): any { }

// ✅ Good - Strong types
dtoToViewModel(dto: IssueDTO): IssueViewModel { }
```

### 5. Handle Nulls

```typescript
// ❌ Bad - Crashes if null
dtoToViewModel(dto: IssueDTO): IssueViewModel {
  return {
    title: dto.title,
    description: dto.description.toUpperCase() // Crashes if null!
  }
}

// ✅ Good - Handle nulls
dtoToViewModel(dto: IssueDTO): IssueViewModel {
  return {
    title: dto.title,
    description: dto.description?.toUpperCase() || ''
  }
}
```

---

## Complete Example: Issue Feature with Full Mapping

```typescript
// entities/Issue.ts
@Entity()
export class Issue {
  @PrimaryKey()
  id: string
  
  @Property()
  title: string
  
  @Property({ columnType: 'text', nullable: true })
  description?: string
  
  @Enum()
  status: 'backlog' | 'in_progress' | 'done' = 'backlog'
  
  @ManyToOne()
  createdBy: User
  
  @OneToMany(() => AgentOutput, ao => ao.issue)
  agentOutputs = new Collection<AgentOutput>(this)
  
  @Property()
  createdAt: Date = new Date()
}

// dtos/issue.dto.ts
export class IssueDTO {
  id: string
  title: string
  description?: string
  status: string
  createdById: string
  createdByName: string
  agentOutputCount: number
  createdAt: Date
}

// dtos/create-issue.dto.ts
export class CreateIssueDTO {
  @IsString()
  @MinLength(1)
  title: string
  
  @IsOptional()
  @IsString()
  description?: string
}

// viewmodels/issue.viewmodel.ts
export class IssueViewModel {
  id: string
  title: string
  description?: string
  status: string
  statusLabel: string
  createdByName: string
  agentOutputCount: number
  createdAt: string
  formattedCreatedAt: string
}

// mappers/entity-mappers/IssueEntityMapper.ts
@Injectable()
export class IssueEntityMapper {
  entityToDTO(entity: Issue): IssueDTO {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      createdById: entity.createdBy.id,
      createdByName: entity.createdBy.name,
      agentOutputCount: entity.agentOutputs.length,
      createdAt: entity.createdAt
    }
  }
}

// mappers/dto-mappers/CreateIssueMapper.ts
@Injectable()
export class CreateIssueMapper {
  createDTOToDTO(createDTO: CreateIssueDTO, userId: string): Partial<IssueDTO> {
    return {
      title: createDTO.title,
      description: createDTO.description,
      createdById: userId,
      createdAt: new Date()
    }
  }
}

// mappers/viewmodel-mappers/IssueViewModelMapper.ts
@Injectable()
export class IssueViewModelMapper {
  dtoToViewModel(dto: IssueDTO): IssueViewModel {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      statusLabel: this.getStatusLabel(dto.status),
      createdByName: dto.createdByName,
      agentOutputCount: dto.agentOutputCount,
      createdAt: dto.createdAt.toISOString(),
      formattedCreatedAt: this.formatDate(dto.createdAt)
    }
  }
  
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'backlog': 'Backlog',
      'in_progress': 'In Progress',
      'done': 'Done'
    }
    return labels[status] || status
  }
  
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US').format(date)
  }
}

// services/issue.service.ts
@Injectable()
export class IssueService {
  constructor(
    private readonly em: EntityManager,
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    private readonly entityMapper: IssueEntityMapper,
    private readonly createMapper: CreateIssueMapper,
    private readonly viewModelMapper: IssueViewModelMapper
  ) {}
  
  async createIssue(
    createDTO: CreateIssueDTO,
    userId: string
  ): Promise<IssueViewModel> {
    const user = await this.em.findOne(User, userId)
    
    const partialDTO = this.createMapper.createDTOToDTO(createDTO, userId)
    
    const entity = new Issue()
    entity.title = partialDTO.title!
    entity.description = partialDTO.description
    entity.createdBy = user
    
    this.em.persist(entity)
    await this.em.flush()
    
    const dto = this.entityMapper.entityToDTO(entity)
    return this.viewModelMapper.dtoToViewModel(dto)
  }
  
  async getIssue(id: string): Promise<IssueViewModel> {
    const entity = await this.issueRepository.findOne(
      { id },
      { populate: ['createdBy', 'agentOutputs'] }
    )
    
    if (!entity) throw new NotFoundException('Issue not found')
    
    const dto = this.entityMapper.entityToDTO(entity)
    return this.viewModelMapper.dtoToViewModel(dto)
  }
}

// controllers/issue.controller.ts
@Controller('issues')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}
  
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createDTO: CreateIssueDTO,
    @Request() req: any
  ): Promise<ApiResponse<IssueViewModel>> {
    return {
      success: true,
      data: await this.issueService.createIssue(createDTO, req.user.id)
    }
  }
  
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<ApiResponse<IssueViewModel>> {
    return {
      success: true,
      data: await this.issueService.getIssue(id)
    }
  }
}
```

---

## Conclusion

**This mapping pattern provides:**

✅ **Clean separation of concerns** (Entity, DTO, ViewModel)
✅ **Type safety** (strong types at each layer)
✅ **Flexibility** (change database without breaking API)
✅ **Testability** (test mappers independently)
✅ **Maintainability** (clear data flow)
✅ **Performance** (control what's fetched/transformed)
✅ **Consistency** (same pattern across all features)

**Like C# AutoMapper but with explicit control!** 🚀

