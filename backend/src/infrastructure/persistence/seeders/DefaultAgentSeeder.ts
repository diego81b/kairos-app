import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import * as fs from 'fs'
import * as path from 'path'
import type { AgentType } from '../../../shared/types'
import { AgentEntity } from '../../../domain/entities/AgentEntity'

// Mapping da nome file agente a AgentType enum
const AGENT_TYPE_MAP: Record<string, AgentType> = {
  'pm-agent': 'pm',
  'architect-agent': 'architect',
  'code-reviewer-agent': 'reviewer',
  'test-verifier-agent': 'tester',
  'release-planner-agent': 'planner',
  'context-extractor-agent': 'pm', // Default fallback
}

/**
 * DefaultAgentSeeder
 *
 * Reads agent definition files from /agents/*.md and creates global AgentEntity records.
 * Each agent file contains YAML frontmatter with: name, description, tools[], model
 * Followed by markdown content (systemPrompt).
 *
 * Pattern: Idempotent upsert — creates if not exists, skips if already present.
 * All agents are created with visibility='global', created_by=null (system-owned).
 */
export class DefaultAgentSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const agentsDir = path.resolve(__dirname, '../../../../agents')

    if (!fs.existsSync(agentsDir)) {
      console.log(`⚠️  Agents directory not found: ${agentsDir}`)
      return
    }

    const files = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith('.md'))

    if (files.length === 0) {
      console.log(`ℹ️  No .md files found in ${agentsDir}`)
      return
    }

    console.log(`📖 Processing ${files.length} agent files...`)

    for (const file of files) {
      const filePath = path.join(agentsDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      try {
        const parsed = this.parseFrontmatter(content)

        const { name, description, systemPrompt, output_format, output_example, after_output } = parsed

        if (!name) {
          console.warn(`⚠️  Skipping ${file}: missing 'name' in frontmatter`)
          continue
        }

        // Determine agentType from filename
        const fileBaseName = path.basename(file, '.md')
        const agentType = AGENT_TYPE_MAP[fileBaseName] || 'pm'

        // Check if agent already exists
        const existing = await em.findOne(AgentEntity, { name })

        if (existing) {
          console.log(`✓ Agent '${name}' already exists (skipping)`)
          continue
        }

        // Create new agent
        const agent = new AgentEntity()

        agent.name = name
        agent.description = description || ''
        agent.agentType = agentType
        agent.systemPrompt = systemPrompt || ''
        agent.output_format = output_format || ''
        agent.output_example = output_example || ''
        agent.after_output = after_output || ''
        agent.visibility = 'global'
        agent.createdBy = undefined // System-owned
        agent.isActive = true

        await em.persistAndFlush(agent)
        console.log(`✅ Created agent: ${name} (type: ${agentType})`)
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message)
      }
    }

    console.log(`✅ DefaultAgentSeeder completed`)
  }

  /**
   * Parse YAML frontmatter from markdown file.
   * Returns object with: { name, description, agentType, systemPrompt }
   * If parsing fails or fields are missing, returns partial object with defaults.
   */
  private parseFrontmatter(content: string): {
    name: string
    description: string
    systemPrompt: string
    output_format?: string
    output_example?: string
    after_output?: string
  } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      return {
        name: '',
        description: '',
        systemPrompt: content,
      }
    }

    const [, frontmatterStr, systemPrompt] = match
    const frontmatter = this.parseYaml(frontmatterStr)

    return {
      name: frontmatter.name || '',
      description: frontmatter.description || '',
      systemPrompt: systemPrompt.trim(),
      output_format: frontmatter.output_format || '',
      output_example: frontmatter.output_example || '',
      after_output: frontmatter.after_output || '',
    }
  }

  /**
   * Simple YAML parser for basic key: value pairs.
   * Handles single quotes, double quotes, and unquoted values.
   */
  private parseYaml(yamlStr: string): Record<string, any> {
    const result: Record<string, any> = {}

    const lines = yamlStr.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      // Match key: value pattern
      const match = trimmed.match(/^(\w+):\s*(.*)$/)

      if (match) {
        const [, key, value] = match
        result[key] = this.parseValue(value)
      }
    }

    return result
  }

  /**
   * Parse YAML value: handle quotes, arrays, booleans, numbers.
   */
  private parseValue(value: string): any {
    const trimmed = value.trim()

    // Handle quoted strings
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1)
    }

    // Handle arrays [a, b, c]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const arrayStr = trimmed.slice(1, -1)
      return arrayStr.split(',').map((v) => v.trim())
    }

    // Handle booleans
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === 'null') return null

    // Handle numbers
    if (!isNaN(Number(trimmed))) {
      return Number(trimmed)
    }

    // Unquoted string
    return trimmed
  }
}
