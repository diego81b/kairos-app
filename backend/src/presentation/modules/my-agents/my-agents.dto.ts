import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, Min, Max } from 'class-validator'

export class UpsertMyAgentConfigDto {
  @IsString()
  chosenProviderId!: string

  @IsString()
  @IsOptional()
  chosenModel?: string

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  temperatureOverride?: number

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxTokensOverride?: number

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>

  @IsBoolean()
  @IsOptional()
  enabled?: boolean
  
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
