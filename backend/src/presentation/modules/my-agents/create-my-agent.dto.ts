import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator'
import { AgentType } from '../../../shared/types'

export class CreateMyAgentDto {
  @IsString()
  name!: string

  @IsIn(['pm', 'architect', 'reviewer', 'tester', 'planner'], { message: 'agentType must be one of pm, architect, reviewer, tester, planner' })
  agentType!: AgentType

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  systemPrompt?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @IsString()
  @IsOptional()
  output_format?: string

  @IsString()
  @IsOptional()
  output_example?: string

  @IsString()
  @IsOptional()
  after_output?: string
}
