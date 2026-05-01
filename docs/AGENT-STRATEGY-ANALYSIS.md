# Agent Execution Strategy: Direct API Only

## Decision: Direct API (No LangChain)

**Chosen approach:** Direct HTTP calls to LLM providers  
**Why:** Simpler, cheaper, more control, better performance

---

## Why Direct API Over Frameworks

### Direct API Approach (CHOSEN)

```typescript
// Simple, direct HTTP call
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    model: 'claude-opus-4-6',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000
  })
})

const data = await response.json()
// Extract: content, usage (input_tokens, output_tokens)
// Calculate cost from tokens
```

**Advantages:**
- ✅ No dependencies (no LangChain bloat)
- ✅ Direct control over requests
- ✅ Easy to debug (just HTTP)
- ✅ Cheaper (no abstraction overhead)
- ✅ Fast (no library processing)
- ✅ Easy to add new providers (5 min per provider)
- ✅ Cost tracking is trivial (tokens in response)
- ✅ Feedback loops simple (just re-call with feedback)

**Disadvantages:**
- ❌ More boilerplate per provider
- ⚠️ Need to handle provider differences

---

## Provider Implementations

### Base Provider Interface

```typescript
interface ILLMProvider {
  // Call LLM with prompt
  call(prompt: string, options?: CallOptions): Promise<CallResult>
  
  // Get available models
  getModels(): Promise<string[]>
  
  // Check if provider is available
  isAvailable(): Promise<boolean>
}

interface CallOptions {
  model: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

interface CallResult {
  content: string              // The response
  usage: {
    inputTokens: number
    outputTokens: number
    cost: number              // Calculated
  }
  metadata: Record<string, any>
}
```

---

### 1. Anthropic Provider

```typescript
// infrastructure/external/providers/AnthropicProvider.ts

import { Injectable } from '@nestjs/common'
import { ILLMProvider, CallOptions, CallResult } from '../interfaces/ILLMProvider'

@Injectable()
export class AnthropicProvider implements ILLMProvider {
  private apiKey: string
  private baseUrl = 'https://api.anthropic.com/v1'
  
  // Pricing per token (as of April 2026)
  private pricing = {
    'claude-opus-4-6': {
      input: 0.000003,      // $3 per 1M tokens
      output: 0.000015      // $15 per 1M tokens
    },
    'claude-sonnet-4-6': {
      input: 0.000003,
      output: 0.000015
    },
    'claude-haiku-4-5': {
      input: 0.00000008,
      output: 0.0000004
    }
  }
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async call(prompt: string, options?: CallOptions): Promise<CallResult> {
    const model = options?.model || 'claude-opus-4-6'
    const temperature = options?.temperature ?? 0.7
    const maxTokens = options?.maxTokens ?? 2000
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Extract content
    const content = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')
    
    // Calculate cost
    const inputTokens = data.usage.input_tokens
    const outputTokens = data.usage.output_tokens
    const pricing = this.pricing[model as keyof typeof this.pricing]
    
    const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output)
    
    return {
      content,
      usage: {
        inputTokens,
        outputTokens,
        cost
      },
      metadata: {
        model,
        provider: 'anthropic'
      }
    }
  }
  
  async getModels(): Promise<string[]> {
    return [
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-haiku-4-5'
    ]
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'x-api-key': this.apiKey }
      })
      return response.ok
    } catch {
      return false
    }
  }
}
```

---

### 2. OpenRouter Provider

```typescript
// infrastructure/external/providers/OpenRouterProvider.ts

import { Injectable } from '@nestjs/common'
import { ILLMProvider, CallOptions, CallResult } from '../interfaces/ILLMProvider'

@Injectable()
export class OpenRouterProvider implements ILLMProvider {
  private apiKey: string
  private baseUrl = 'https://openrouter.io/api/v1'
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async call(prompt: string, options?: CallOptions): Promise<CallResult> {
    const model = options?.model || 'mistral/mistral-7b'
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Cost from response headers
    const costHeader = response.headers.get('x-cost')
    const cost = costHeader ? parseFloat(costHeader) : 0
    
    return {
      content: data.choices[0].message.content,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        cost
      },
      metadata: {
        model,
        provider: 'openrouter'
      }
    }
  }
  
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    })
    
    const data = await response.json()
    return data.data.map((m: any) => m.id)
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      })
      return response.ok
    } catch {
      return false
    }
  }
}
```

---

### 3. OpenAI Provider

```typescript
// infrastructure/external/providers/OpenAIProvider.ts

import { Injectable } from '@nestjs/common'
import { ILLMProvider, CallOptions, CallResult } from '../interfaces/ILLMProvider'

@Injectable()
export class OpenAIProvider implements ILLMProvider {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'
  
  private pricing = {
    'gpt-4-turbo': {
      input: 0.00001,       // $10 per 1M tokens
      output: 0.00003       // $30 per 1M tokens
    },
    'gpt-4': {
      input: 0.00003,
      output: 0.00006
    }
  }
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async call(prompt: string, options?: CallOptions): Promise<CallResult> {
    const model = options?.model || 'gpt-4-turbo'
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    const inputTokens = data.usage.prompt_tokens
    const outputTokens = data.usage.completion_tokens
    const pricing = this.pricing[model as keyof typeof this.pricing]
    
    const cost = (inputTokens * pricing.input) + (outputTokens * pricing.output)
    
    return {
      content: data.choices[0].message.content,
      usage: {
        inputTokens,
        outputTokens,
        cost
      },
      metadata: {
        model,
        provider: 'openai'
      }
    }
  }
  
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    })
    
    const data = await response.json()
    return data.data
      .filter((m: any) => m.id.includes('gpt-4'))
      .map((m: any) => m.id)
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      })
      return response.ok
    } catch {
      return false
    }
  }
}
```

---

### 4. Ollama Provider (Local)

```typescript
// infrastructure/external/providers/OllamaProvider.ts

import { Injectable } from '@nestjs/common'
import { ILLMProvider, CallOptions, CallResult } from '../interfaces/ILLMProvider'

@Injectable()
export class OllamaProvider implements ILLMProvider {
  private baseUrl: string
  
  constructor(endpoint: string = 'http://localhost:11434') {
    this.baseUrl = endpoint
  }
  
  async call(prompt: string, options?: CallOptions): Promise<CallResult> {
    const model = options?.model || 'mistral'
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2000
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      content: data.response,
      usage: {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
        cost: 0  // Local, no cost
      },
      metadata: {
        model,
        provider: 'ollama',
        isLocal: true
      }
    }
  }
  
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      const data = await response.json()
      return data.models.map((m: any) => m.name)
    } catch {
      return []
    }
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      return response.ok
    } catch {
      return false
    }
  }
}
```

---

## Provider Factory & Routing

### Provider Factory

```typescript
// infrastructure/external/providers/ProviderFactory.ts

import { Injectable } from '@nestjs/common'
import { AnthropicProvider } from './AnthropicProvider'
import { OpenRouterProvider } from './OpenRouterProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { OllamaProvider } from './OllamaProvider'
import { ILLMProvider } from '../interfaces/ILLMProvider'

@Injectable()
export class ProviderFactory {
  constructor(private credentials: Map<string, string>) {}
  
  getProvider(providerName: string): ILLMProvider {
    switch (providerName.toLowerCase()) {
      case 'anthropic':
        return new AnthropicProvider(
          this.credentials.get('anthropic-api-key') || ''
        )
      
      case 'openrouter':
        return new OpenRouterProvider(
          this.credentials.get('openrouter-api-key') || ''
        )
      
      case 'openai':
        return new OpenAIProvider(
          this.credentials.get('openai-api-key') || ''
        )
      
      case 'ollama':
        return new OllamaProvider(
          this.credentials.get('ollama-endpoint') || 'http://localhost:11434'
        )
      
      default:
        throw new Error(`Unknown provider: ${providerName}`)
    }
  }
}
```

---

### Routing Logic (Agnostic)

```typescript
// application/services/AgentRoutingService.ts

import { Injectable } from '@nestjs/common'
import { AgentEntity } from '../../domain/entities/AgentEntity'
import { AgentConfigurationEntity } from '../../domain/entities/AgentConfigurationEntity'
import { ProviderFactory } from '../../infrastructure/external/providers/ProviderFactory'

@Injectable()
export class AgentRoutingService {
  constructor(
    private providerFactory: ProviderFactory
  ) {}
  
  /**
   * Determine which provider to use for an agent
   * 
   * Rules:
   * 1. Read agent.configuration.provider
   * 2. Validate provider is available
   * 3. Return provider instance
   * 
   * This is NOT language-specific.
   * Same logic works in any language/framework.
   */
  async getProviderForAgent(agent: AgentEntity): Promise<any> {
    // Read provider from agent configuration
    const config = agent.configuration
    const providerName = config.provider
    
    // Validate provider exists
    const provider = this.providerFactory.getProvider(providerName)
    
    // Check if available
    const available = await provider.isAvailable()
    if (!available) {
      throw new Error(`Provider ${providerName} is not available`)
    }
    
    return provider
  }
  
  /**
   * Route to appropriate provider based on agent config
   * 
   * No hardcoded agent types!
   * Users create custom agents with their chosen provider
   */
  async executeAgent(
    agent: AgentEntity,
    prompt: string,
    feedback?: string
  ): Promise<any> {
    // Get provider for this agent
    const provider = await this.getProviderForAgent(agent)
    
    // Build final prompt with feedback
    const finalPrompt = feedback 
      ? `${prompt}\n\nFeedback from previous iteration:\n${feedback}`
      : prompt
    
    // Read model from agent config
    const model = agent.configuration.model
    
    // Call provider
    const result = await provider.call(finalPrompt, {
      model,
      temperature: agent.configuration.temperature,
      maxTokens: agent.configuration.maxTokens
    })
    
    return result
  }
}
```

---

## Agent Execution Flow

### Flow Diagram

```
1. User runs agent for issue
   ↓
2. Load agent configuration
   ├─ provider: 'anthropic'
   ├─ model: 'claude-opus-4-6'
   ├─ temperature: 0.7
   └─ maxTokens: 2000
   ↓
3. Get provider instance (Anthropic)
   ↓
4. Build prompt from issue + agent system prompt
   ↓
5. Call provider.call(prompt, options)
   ├─ HTTP request to API
   ├─ Parse response
   └─ Calculate cost
   ↓
6. Store output in agent_outputs table
   ├─ content (response)
   ├─ status: 'pending'
   ├─ inputTokens
   ├─ outputTokens
   └─ cost
   ↓
7. Log cost in cost_logs table
   ↓
8. Return response to controller
   ↓
9. Return to frontend
   ├─ Display for approval
   └─ Await feedback or approval
   ↓
10. User provides feedback (optional)
    ↓
11. If feedback, re-run same agent with feedback in prompt
    ├─ version: 2
    ├─ feedback: "user's comments"
    └─ Repeat flow
```

---

## Cost Tracking (Simple)

```typescript
// application/services/CostService.ts

import { Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/postgresql'
import { CostLogEntity } from '../../domain/entities/CostLogEntity'

@Injectable()
export class CostService {
  constructor(private em: EntityManager) {}
  
  /**
   * Log cost after agent execution
   * 
   * Simple: just store the numbers from provider response
   */
  async logCost(
    issueId: string,
    agentId: string,
    providerName: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    const costLog = new CostLogEntity()
    costLog.issueId = issueId
    costLog.agentId = agentId
    costLog.provider = providerName
    costLog.model = model
    costLog.inputTokens = inputTokens
    costLog.outputTokens = outputTokens
    costLog.cost = cost
    costLog.createdAt = new Date()
    
    this.em.persist(costLog)
    await this.em.flush()
  }
  
  /**
   * Query costs for analytics
   */
  async getCostsByAgent(agentId: string, days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const logs = await this.em.find(CostLogEntity, {
      agentId,
      createdAt: { $gte: since }
    })
    
    return {
      executions: logs.length,
      totalCost: logs.reduce((sum, log) => sum + log.cost, 0),
      avgCost: logs.reduce((sum, log) => sum + log.cost, 0) / logs.length,
      byProvider: this.groupByProvider(logs)
    }
  }
  
  private groupByProvider(logs: CostLogEntity[]): Record<string, any> {
    const grouped: Record<string, any> = {}
    
    for (const log of logs) {
      if (!grouped[log.provider]) {
        grouped[log.provider] = { cost: 0, executions: 0 }
      }
      
      grouped[log.provider].cost += log.cost
      grouped[log.provider].executions++
    }
    
    return grouped
  }
}
```

---

## Feedback Loop (Simple)

```typescript
// User approves agent output and provides feedback
// OR user rejects and provides feedback

// Flow:
// 1. User sees output in UI
// 2. Clicks "Request Changes" button
// 3. Enters feedback comment
// 4. Frontend calls: PUT /issues/{id}/agent-outputs/{outputId}
//    {
//      status: 'rejected',
//      feedback: 'Please focus more on performance...'
//    }
// 5. Backend updates agent_outputs table
// 6. Frontend shows "Re-run with feedback" button
// 7. User clicks it
// 8. Frontend calls: POST /issues/{id}/run-agent/{agentId}
//    {
//      feedback: 'Please focus more on performance...'
//    }
// 9. Backend calls AgentRoutingService.executeAgent(agent, prompt, feedback)
// 10. AgentRoutingService builds prompt with feedback
// 11. Calls provider again with updated prompt
// 12. Stores new output (version: 2)
// 13. Display new version to user

// That's it! No special framework needed, just HTTP calls + feedback in prompt
```

---

## Comparison: Direct API vs LangChain

| Aspect | Direct API | LangChain |
|--------|-----------|-----------|
| **Dependencies** | 0 | 1 heavy library |
| **Learning curve** | 1 day | 3-5 days |
| **Provider setup** | 5 min each | 5 min each (same!) |
| **Debugging** | Easy (just HTTP) | Complex (library stack) |
| **Cost** | Transparent | Black box |
| **Token tracking** | Trivial | Manual |
| **Feedback loops** | Simple (re-call) | Complex (chains) |
| **Performance** | Native | +10-20% overhead |
| **Team onboarding** | Days | Weeks |
| **Lines of code** | Fewer | More |
| **Flexibility** | High | Medium |

---

## Adding a New Provider (5 minutes)

```typescript
// 1. Create provider class
export class NewProviderProvider implements ILLMProvider {
  async call(prompt, options) {
    // 1. Make HTTP request
    // 2. Parse response
    // 3. Calculate cost
    // 4. Return CallResult
  }
}

// 2. Add to factory
case 'newprovider':
  return new NewProviderProvider(apiKey)

// Done! No framework updates needed
```

---

## Conclusion

**Direct API approach is perfect for KAIROS:**

✅ **Simple** - Just HTTP calls
✅ **Transparent** - Full control
✅ **Cheap** - No framework overhead
✅ **Fast** - Direct execution
✅ **Flexible** - Easy to add providers
✅ **Debuggable** - No abstraction layers
✅ **Cost tracking** - Tokens in response
✅ **Feedback loops** - Just re-call with feedback
✅ **Team-friendly** - Easy to understand

**No LangChain, no unnecessary complexity. Just code.** 🚀
