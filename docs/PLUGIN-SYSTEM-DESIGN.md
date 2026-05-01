# KAIROS Plugin System & Configuration Management

## Vision

Enable users to:
1. **Create custom plugins** for each subagent (agnostic to language/framework)
2. **Configure provider + model** per subagent individually
3. **Admin panel** to manage configurations
4. **Plugin registry** to discover and enable plugins
5. **Hot-swap** plugins without restarting

---

## Current Implementation (April 27, 2026)

The plugin system described in this document is now implemented in the backend with the following scope.

### Data model and migrations

- `llm_providers`
- `llm_provider_credentials` (user-scoped credentials)
- `plugins`
- `agent_plugin_bindings`
- `plugin_audit_log`
- `cost_logs` extended for plugin/provider references
- `agents` (extended with `visibility` and `created_by` for private agents)
- `user_agent_configurations` (per-user per-agent configuration)

Migrations created:

- `Migration20260420_InitialSchema.ts`
- `Migration20260426_AuditLog.ts`
- `Migration20260426_BackfillLegacyData.ts` (idempotent legacy copy)
- `Migration20260426_PluginSystem.ts`
- `Migration20260426_UserAgentConfiguration.ts` (per-user config table)

### Resolution and discovery

- Provider/model resolution implemented with fallback order:
  1. user configuration override
  2. binding model
  3. plugin default model
  4. provider metadata default model
- Built-in and local plugin discovery implemented
- DB sync implemented on startup (`PluginDbSyncService`)

### Admin APIs delivered

- Providers admin endpoints
- Plugins listing/detail/sync endpoints
- Agent binding management endpoints
- User credential management endpoints
- Dry-run resolution endpoint for debugging provider selection

### User Configuration APIs delivered (NEW - April 27, 2026)

- `GET /api/me/agents` — List global agents with user's configurations
- `GET /api/me/agents/all` — List global + user's private agents
- `POST /api/me/agents` — Create private agent (user-owned)
- `GET /api/me/agents/:agentId/config` — Get user's configuration for agent
- `PUT /api/me/agents/:agentId/config` — Upsert user's configuration for agent

### Security and audit

- API keys encrypted at rest
- Local package security policy enforced for discovery:
  - path containment
  - naming convention or allowlist
  - optional checksum verification
  - strict `source='local_package'`
- Audit events persisted (`plugin_audit_log`) for:
  - credential access/upsert/delete
  - provider connection tests
  - binding create/delete
  - plugin sync
- Per-user configuration isolation (users can only access own configs)
- Private agent visibility scoping (users can only see own private agents)

---

## Architecture Overview

```
┌───────────────────────────────────────────────┐
│ KAIROS Webapp                                 │
├───────────────────────────────────────────────┤
│                                               │
│  ┌───────────────────────────────────────┐    │
│  │ Configuration Panel                   │    │
│  ├───────────────────────────────────────┤    │
│  │ • Select provider per agent           │    │
│  │ • Select model per agent              │    │
│  │ • Enable/disable agents               │    │
│  │ • Set API keys + credentials          │    │
│  │ • View usage & costs                  │    │
│  └───────────────────────────────────────┘    │
│         ↓ stores in                           │
│  ┌───────────────────────────────────────┐    │
│  │ Configuration Store                   │    │
│  ├───────────────────────────────────────┤    │
│  │ Agents Config (JSON/YAML)             │    │
│  │ ├─ PM Agent                           │    │
│  │ │  ├─ provider: "anthropic"           │    │
│  │ │  ├─ model: "claude-opus-4-6"        │    │
│  │ │  ├─ plugins: [...]                  │    │
│  │ │  └─ enabled: true                   │    │
│  │ ├─ Architect Agent                    │    │
│  │ │  ├─ provider: "openrouter"          │    │
│  │ │  ├─ model: "mistral/7b"             │    │
│  │ │  └─ ...                             │    │
│  │ └─ ...                                │    │
│  │                                       │    │
│  │ Provider Credentials                  │    │
│  │ ├─ anthropic_api_key                  │    │
│  │ ├─ openrouter_api_key                 │    │
│  │ ├─ openai_api_key                     │    │
│  │ └─ ...                                │    │
│  │                                       │    │
│  │ Plugin Registry                       │    │
│  │ ├─ Built-in Plugins                   │    │
│  │ ├─ User Plugins                       │    │
│  │ └─ Marketplace Plugins                │    │
│  └───────────────────────────────────────┘    │
│         ↓ loaded by                           │
│  ┌───────────────────────────────────────┐    │
│  │ Plugin System                         │    │
│  ├───────────────────────────────────────┤    │
│  │ Plugin Loader                         │    │
│  │ ├─ Load plugin by name                │    │
│  │ ├─ Validate plugin interface          │    │
│  │ ├─ Initialize plugin instance         │    │
│  │ └─ Hot-reload on change               │    │
│  │                                       │    │
│  │ Plugin Base Classes                   │    │
│  │ ├─ ProviderPlugin                     │    │
│  │ ├─ AgentPlugin                        │    │
│  │ └─ ToolPlugin                         │    │
│  │                                       │    │
│  │ Plugin Instances                      │    │
│  │ ├─ AnthropicProvider (built-in)       │    │
│  │ ├─ OpenRouterProvider (built-in)      │    │
│  │ ├─ OpenAIProvider (built-in)          │    │
│  │ ├─ OllamaProvider (built-in)          │    │
│  │ ├─ MyCustomProvider (user)            │    │
│  │ └─ ...                                │    │
│  └───────────────────────────────────────┘    │
│         ↓ used by                             │
│  ┌───────────────────────────────────────┐    │
│  │ Agent Execution Engine                │    │
│  ├───────────────────────────────────────┤    │
│  │ 1. Load agent config                  │    │
│  │ 2. Load selected provider plugin      │    │
│  │ 3. Load custom agent plugins          │    │
│  │ 4. Execute with selected model        │    │
│  │ 5. Track cost + usage                 │    │
│  └───────────────────────────────────────┘    │
│                                               │
└───────────────────────────────────────────────┘
```

---

## Plugin Types

### 1. Provider Plugins

**Purpose:** Implement communication with LLM providers

**Responsibility:**
- Make API calls to provider
- Handle authentication
- Parse responses
- Track token usage
- Return standardized output

**Interface:**

```
ProviderPlugin:
  ├─ name: String
  ├─ version: String
  ├─ provider_name: String (anthropic|openrouter|openai|ollama|custom)
  │
  ├─ initialize(config: Object)
  │  └─ Set up API keys, base URLs, etc
  │
  ├─ call(prompt: String, model: String, options: Object) → Promise/Future
  │  ├─ Input: prompt text, model name, optional parameters
  │  └─ Output: {
  │        content: String,
  │        usage: {
  │          input_tokens: Number,
  │          output_tokens: Number,
  │          cost: Number
  │        },
  │        metadata: Object
  │      }
  │
  ├─ validate_model(model: String) → Boolean
  │  └─ Check if provider supports this model
  │
  ├─ get_models() → Array[String]
  │  └─ List available models
  │
  └─ is_available() → Boolean
     └─ Check if API is reachable
```

**Examples:**

```
AnthropicProvider:
  - authenticate with API key
  - call messages endpoint
  - extract usage from response
  - return standardized format

OpenRouterProvider:
  - authenticate with Bearer token
  - call /api/v1/chat/completions
  - parse cost from headers
  - handle provider fallbacks

CustomProvider (User):
  - implement same interface
  - call custom backend API
  - map response to standard format
```

---

### 2. Agent Plugins

**Purpose:** Customize agent behavior (prompts, parsing, tools)

**Responsibility:**
- Build agent-specific prompts
- Parse agent outputs
- Add custom tools/validators
- Handle agent-specific logic

**Interface:**

```
AgentPlugin:
  ├─ name: String
  ├─ version: String
  ├─ agent_type: String (pm|architect|implementer|reviewer|tester|release)
  │
  ├─ build_prompt(issue: Object, context: Object, feedback: String?) → String
  │  └─ Generate prompt for this agent
  │
  ├─ parse_output(response: String) → Object
  │  └─ Parse LLM response into structured format
  │
  ├─ validate_output(parsed: Object) → {valid: Boolean, errors: Array}
  │  └─ Validate parsed output
  │
  ├─ post_process(output: Object, context: Object) → Object
  │  └─ Additional processing
  │
  └─ get_tools() → Array[Tool]
     └─ Custom tools available to this agent
```

**Examples:**

```
PMAgentPlugin:
  - build_prompt: Generate PM-specific prompt template
  - parse_output: Extract scope, constraints, risks, criteria
  - validate_output: Check all fields present
  - post_process: Enrich with issue metadata

CustomPMAgentPlugin (User):
  - override build_prompt with custom template
  - add custom parsing logic
  - add domain-specific validation
```

---

### 3. Tool Plugins

**Purpose:** Add tools/capabilities to agents

**Responsibility:**
- Define tool interface
- Execute tool logic
- Return results

**Interface:**

```
ToolPlugin:
  ├─ name: String
  ├─ version: String
  ├─ description: String
  │
  ├─ execute(input: Object, context: Object) → Object/Promise
  │  └─ Execute tool with given input
  │
  ├─ validate_input(input: Object) → {valid: Boolean, errors: Array}
  │  └─ Validate input before execution
  │
  └─ get_schema() → Object
     └─ JSON Schema describing tool
```

**Examples:**

```
CodeAnalyzerTool:
  - input: code snippet
  - output: analysis results

DBSchemaTool:
  - input: requirements
  - output: proposed schema

WikiSearchTool:
  - input: query
  - output: search results
```

---

## Configuration Management

### Configuration Structure

```
Configuration (stored in Database or File):

┌─────────────────────────────────────┐
│ Global Settings                     │
├─────────────────────────────────────┤
│ • Default provider                  │
│ • Default model                     │
│ • Cost tracking enabled             │
│ • Plugin auto-update                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Provider Credentials                │
├─────────────────────────────────────┤
│ anthropic:                          │
│   api_key: "sk-ant-..."             │
│                                     │
│ openrouter:                         │
│   api_key: "sk-or-..."              │
│                                     │
│ openai:                             │
│   api_key: "sk-..."                 │
│                                     │
│ custom_provider:                    │
│   endpoint: "https://..."           │
│   api_key: "..."                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Agent Configurations (Per Agent)    │
├─────────────────────────────────────┤
│ PM Agent:                           │
│   enabled: true                     │
│   provider: "anthropic"             │
│   model: "claude-opus-4-6"          │
│   temperature: 0.7                  │
│   max_tokens: 2000                  │
│   plugins:                          │
│     - pm-agent-custom               │
│     - code-analyzer-tool            │
│   cost_limit: 10.0 (per execution)  │
│                                     │
│ Architect Agent:                    │
│   enabled: true                     │
│   provider: "openrouter"            │
│   model: "mistral/mistral-7b"       │
│   temperature: 0.5                  │
│   max_tokens: 3000                  │
│   plugins:                          │
│     - architect-agent-default       │
│     - db-schema-tool                │
│   cost_limit: 5.0                   │
│                                     │
│ Code Reviewer Agent:                │
│   enabled: true                     │
│   provider: "openai"                │
│   model: "gpt-4-turbo"              │
│   temperature: 0.3                  │
│   plugins:                          │
│     - reviewer-agent-custom         │
│   cost_limit: 15.0                  │
│                                     │
│ ... (other agents)                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Plugin Registry                     │
├─────────────────────────────────────┤
│ Built-in Plugins:                   │
│   ├─ AnthropicProvider v1.0         │
│   ├─ OpenRouterProvider v1.0        │
│   ├─ OpenAIProvider v1.0            │
│   ├─ OllamaProvider v1.0            │
│   ├─ PMAgentPlugin v1.0             │
│   ├─ ArchitectAgentPlugin v1.0      │
│   └─ ...                            │
│                                     │
│ User Plugins:                       │
│   ├─ MyCustomPMAgent v1.0           │
│   ├─ MyCompanyProvider v1.0         │
│   └─ ...                            │
│                                     │
│ Marketplace Plugins:                │
│   ├─ WikiSearchTool v2.1            │
│   ├─ DBSchemaValidator v1.5         │
│   └─ ...                            │
└─────────────────────────────────────┘
```

### Configuration Storage Options

**Option 1: Database**
```
Table: agent_configurations
├─ id
├─ agent_type (pm|architect|etc)
├─ provider
├─ model
├─ temperature
├─ max_tokens
├─ plugins (JSON array)
├─ enabled
├─ cost_limit
├─ created_at
├─ updated_at
└─ updated_by

Table: provider_credentials
├─ id
├─ provider_name
├─ api_key (encrypted)
├─ endpoint_url
├─ extra_params (JSON)
├─ is_active
└─ created_at
```

**Option 2: Configuration Files**
```
config/
├─ agents.yaml
├─ providers.yaml
├─ plugins.yaml
└─ credentials.yaml

Example agents.yaml:
---
pm_agent:
  enabled: true
  provider: anthropic
  model: claude-opus-4-6
  temperature: 0.7
  max_tokens: 2000
  plugins:
    - pm-agent-default
    - code-analyzer
  cost_limit: 10.0

architect_agent:
  enabled: true
  provider: openrouter
  model: mistral/7b
  temperature: 0.5
  plugins:
    - architect-agent-default
  cost_limit: 5.0
```

**Option 3: Hybrid (Recommended)**
- Configuration defaults in files (version control)
- Runtime overrides in database (hot-swap)
- Credentials always in secure storage (never in files)

---

## Per-User Agent Configuration

### Overview

Enables each user to:
1. **Configure global agents** individually (choose provider, model, temperature, tokens)
2. **Create private agents** (visible only to them, with full customization)
3. **Apply per-user overrides** to agent execution without affecting other users

### Design

**Visibility Model:**

| Agent Type | Visibility | Scope | Who Can Configure |
|------------|------------|-------|-------------------|
| **Global** | `visibility='global'` | All users | User for themselves |
| **Private** | `visibility='private'` | Creator only | Creator only |

**Configuration Storage:**

```sql
Table: user_agent_configurations
├─ id (nanoid)
├─ user_id (FK to users.id)
├─ agent_id (FK to agents.id)
├─ chosen_provider_id (FK to llm_providers.id)
├─ chosen_model (varchar, override default)
├─ temperature_override (decimal 0.0-2.0)
├─ max_tokens_override (integer)
├─ config (jsonb for future use)
├─ enabled (boolean)
├─ created_at, updated_at
└─ UNIQUE(user_id, agent_id)
```

**Agent Extensions:**

```sql
ALTER TABLE agents ADD COLUMN (
  visibility varchar(50) DEFAULT 'global',  -- 'global' | 'private'
  created_by varchar(21) REFERENCES users(id)  -- NULL = built-in
);
```

### API Endpoints

All endpoints require JWT authentication and are scoped by logged-in user.

```
GET /api/me/agents
  Returns: All global active agents + user's configurations
  Example:
  {
    "success": true,
    "data": [
      {
        "id": "architect-id",
        "name": "Architect Agent",
        "agentType": "architect",
        "visibility": "global",
        "userConfig": {
          "chosenProvider": { "id": "...", "key": "anthropic" },
          "chosenModel": "claude-opus",
          "temperatureOverride": 0.7,
          "enabled": true
        }
      },
      {
        "id": "pm-id",
        "name": "PM Agent",
        "visibility": "global",
        "userConfig": null  // Not configured yet
      }
    ]
  }

GET /api/me/agents/all
  Returns: All visible agents (global + user's private)

POST /api/me/agents
  Body: { name, agentType, description, systemPrompt, isActive }
  Creates: User-owned private agent

GET /api/me/agents/:agentId/config
  Returns: User's configuration for specific agent

PUT /api/me/agents/:agentId/config
  Body: { chosenProviderId, chosenModel, temperatureOverride, maxTokensOverride }
  Upserts: User's configuration for agent
```

### Authorization Rules

**Global Agents:**
- Any authenticated user can see list
- Any user can configure for themselves
- Cannot modify or delete (admin only)

**Private Agents:**
- Only creator can see or list
- Only creator can configure
- Only creator can modify or delete
- Other users cannot access

### Resolution Priority

When executing an agent, provider/model is resolved in order:

1. User's configuration override (if configured)
2. Agent default binding (if exists)
3. Provider default model (from llm_providers.metadata)

Example:
```
User configured architect_agent with model="gpt-4"
→ Use gpt-4 (ignores agent/provider defaults)

User NOT configured
→ Check agent's agent_plugin_bindings for default model
→ If none, use provider's metadata.defaultModel
```

---

## Admin Configuration Panel

### UI Components

```
┌────────────────────────────────────────────────┐
│ KAIROS Admin Settings                          │
├────────────────────────────────────────────────┤
│                                                │
│ [Providers] [Agents] [Plugins] [Costs]        │
│                                                │
│ ┌─ Providers Tab ─────────────────────┐       │
│ │                                     │       │
│ │ ✅ Anthropic (Connected)            │       │
│ │    API Key: ••••••••••••            │       │
│ │    [Edit] [Test] [Remove]           │       │
│ │                                     │       │
│ │ ✅ OpenRouter (Connected)           │       │
│ │    API Key: ••••••••••••            │       │
│ │    [Edit] [Test] [Remove]           │       │
│ │                                     │       │
│ │ ❌ OpenAI (Not Connected)           │       │
│ │    [Add API Key]                    │       │
│ │                                     │       │
│ │ [+ Add Provider]                    │       │
│ └─────────────────────────────────────┘       │
│                                                │
│ ┌─ Agents Tab ────────────────────────┐       │
│ │                                     │       │
│ │ PM Agent ◆                          │       │
│ │  ├─ Enabled: [Toggle ✓]            │       │
│ │  ├─ Provider: [Dropdown ▼]          │       │
│ │  │           Currently: Anthropic  │       │
│ │  ├─ Model: [Dropdown ▼]             │       │
│ │  │        Currently: claude-opus   │       │
│ │  ├─ Temperature: [Slider 0.0...1]  │       │
│ │  │              Currently: 0.7     │       │
│ │  ├─ Max Tokens: [Number Input]     │       │
│ │  │             Currently: 2000     │       │
│ │  ├─ Plugins:                        │       │
│ │  │  ☑ pm-agent-default             │       │
│ │  │  ☑ code-analyzer                │       │
│ │  │  [+ Add Plugin]                  │       │
│ │  ├─ Cost Limit: [Number] $ per run │       │
│ │  └─ [Save Changes] [Reset]         │       │
│ │                                     │       │
│ │ Architect Agent ◆                   │       │
│ │  ├─ Enabled: [Toggle ✓]            │       │
│ │  ├─ Provider: [Dropdown ▼]          │       │
│ │  │           Currently: OpenRouter │       │
│ │  ├─ Model: [Dropdown ▼]             │       │
│ │  │        Currently: mistral/7b    │       │
│ │  └─ ... (similar config)            │       │
│ │                                     │       │
│ │ Code Reviewer Agent ◆               │       │
│ │  ├─ Enabled: [Toggle ✓]            │       │
│ │  ├─ Provider: [Dropdown ▼]          │       │
│ │  │           Currently: OpenAI     │       │
│ │  ├─ Model: [Dropdown ▼]             │       │
│ │  │        Currently: gpt-4-turbo   │       │
│ │  └─ ... (similar config)            │       │
│ │                                     │       │
│ │ [+ Add Agent] [Test All]            │       │
│ └─────────────────────────────────────┘       │
│                                                │
│ ┌─ Plugins Tab ───────────────────────┐       │
│ │                                     │       │
│ │ Built-in Plugins (Read-only):       │       │
│ │  ├─ AnthropicProvider v1.0          │       │
│ │  ├─ OpenRouterProvider v1.0         │       │
│ │  ├─ OpenAIProvider v1.0             │       │
│ │  ├─ OllamaProvider v1.0             │       │
│ │  ├─ PMAgentPlugin v1.0              │       │
│ │  └─ ...                             │       │
│ │                                     │       │
│ │ User Plugins:                       │       │
│ │  ├─ MyCustomPMAgent v1.0            │       │
│ │  │  Status: Active                  │       │
│ │  │  [View Code] [Disable] [Delete]  │       │
│ │  │  [Test]                          │       │
│ │  │                                  │       │
│ │  └─ MyCompanyProvider v1.0          │       │
│ │     Status: Inactive                │       │
│ │     [View Code] [Enable] [Delete]   │       │
│ │                                     │       │
│ │ [+ Upload Plugin] [Browse Marketplace]│     │
│ └─────────────────────────────────────┘       │
│                                                │
│ ┌─ Costs Tab ─────────────────────────┐       │
│ │                                     │       │
│ │ Today: $42.18                       │       │
│ │ This Month: $1,203.45               │       │
│ │                                     │       │
│ │ By Agent:                           │       │
│ │  PM Agent:           $102.30 (5%)  │       │
│ │  Architect Agent:    $450.20 (35%) │       │
│ │  Code Reviewer:      $651.95 (50%) │       │
│ │  Test Verifier:      $..            │       │
│ │                                     │       │
│ │ By Provider:                        │       │
│ │  Anthropic:          $651.45 (50%) │       │
│ │  OpenRouter:         $310.25 (25%) │       │
│ │  OpenAI:             $241.75 (20%) │       │
│ │  Local (Ollama):     $0.00 (0%)    │       │
│ │                                     │       │
│ │ [Export Report] [View Details]      │       │
│ └─────────────────────────────────────┘       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Plugin Development Guide

### Creating a Provider Plugin

**Steps:**

1. **Define plugin metadata**
   ```
   Name: MyCustomProvider
   Version: 1.0.0
   Type: provider
   Supports: text completion
   Authors: Your Company
   Description: Connect to our internal LLM service
   ```

2. **Implement required interface**
   ```
   Function: initialize(config)
     - Read API key from config
     - Set up base URL
     - Validate credentials
   
   Function: call(prompt, model, options)
     - Make HTTP request
     - Handle errors
     - Parse response
     - Calculate token count
     - Return standardized output
   
   Function: validate_model(model)
     - Check if model is available
   
   Function: get_models()
     - Return list of supported models
   
   Function: is_available()
     - Check API connectivity
   ```

3. **Write documentation**
   ```
   - How to get API key
   - Supported models
   - Parameters/options
   - Error handling
   - Cost calculation method
   ```

4. **Package plugin**
   ```
   my-custom-provider/
   ├─ plugin.yaml          (metadata)
   ├─ implementation.*      (code in any language)
   ├─ schema.json          (expected config format)
   ├─ README.md
   ├─ LICENSE
   └─ tests/
   ```

5. **Submit to registry**
   - Upload to marketplace
   - Or enable locally via configuration

### Creating an Agent Plugin

**Steps:**

1. **Define plugin metadata**
   ```
   Name: MyPMAgent
   Version: 1.0.0
   Type: agent
   AgentType: pm
   Description: Customized PM analysis with company standards
   ```

2. **Implement required interface**
   ```
   Function: build_prompt(issue, context, feedback)
     - Use company-specific prompt template
     - Include custom instructions
     - Add feedback from previous iteration
     - Return complete prompt
   
   Function: parse_output(response)
     - Extract JSON from response
     - Map fields to standard schema
     - Handle parsing errors
   
   Function: validate_output(parsed)
     - Check all required fields
     - Validate field formats
     - Return errors if invalid
   
   Function: post_process(output, context)
     - Enrich with metadata
     - Add timestamps
     - Link to issue
   
   Function: get_tools()
     - Return available tools
     - Tool definitions
   ```

3. **Package and submit**
   - Same process as provider plugin

### Creating a Tool Plugin

**Steps:**

1. **Define metadata**
   ```
   Name: CodeAnalyzerTool
   Version: 1.0.0
   Type: tool
   Description: Analyze code quality and patterns
   ```

2. **Implement interface**
   ```
   Function: execute(input, context)
     - Perform analysis
     - Return results
   
   Function: validate_input(input)
     - Check input schema
   
   Function: get_schema()
     - Define input/output schema
   ```

3. **Package and submit**

---

## Plugin Loading & Execution

### Plugin Loading Process

```
1. READ CONFIGURATION
   - Load agent config (which provider, which plugins)
   - Load provider credentials

2. RESOLVE PROVIDER PLUGIN
   - Look up provider name in registry
   - Initialize provider plugin with credentials
   - Test connectivity

3. RESOLVE AGENT PLUGINS
   - Load agent-specific plugins (if any)
   - Load tool plugins
   - Validate plugin compatibility

4. INSTANTIATE
   - Create provider instance
   - Create agent instance with plugins
   - Ready to execute

5. EXECUTE
   - Build prompt via agent plugin
   - Call LLM via provider plugin
   - Parse output via agent plugin
   - Track costs

6. UNLOAD (Optional)
   - Cache for performance
   - Or unload to save memory
```

### Hot-Reload Capability

```
Scenario: User changes agent configuration

1. User clicks [Save Changes] in admin panel
2. New config written to database
3. Existing plugin instance invalidated
4. Next agent execution:
   - Detects config change
   - Unloads old plugins
   - Loads new plugins
   - Executes with new configuration
5. No restart needed
```

---

## Plugin Registry

### Structure

```
Registry (stores in database):

Entry:
├─ id
├─ name (unique)
├─ version
├─ type (provider|agent|tool)
├─ plugin_type (anthropic|pm|etc)
├─ status (active|deprecated|beta)
├─ source (built-in|user|marketplace)
├─ description
├─ documentation_url
├─ code_url (can be local file or GitHub)
├─ compatibility (which agents can use this)
├─ dependencies (other plugins needed)
├─ created_by
├─ created_at
├─ last_updated
├─ download_count
├─ rating (if marketplace)
├─ downloads_enabled (if marketplace)
└─ implementation (actual plugin code/reference)
```

### Built-in vs User Plugins

**Built-in Plugins:**
- Shipped with KAIROS
- Read-only
- Can be disabled but not deleted
- Always available
- Automatically updated

**User Plugins:**
- Created/uploaded by users
- Can be edited
- Can be enabled/disabled
- Only visible to creator (or shared workspace)
- Custom version control

---

## Workflow Examples

### Example 1: Using Different Providers Per Agent

```
Configuration:

PM Agent:
  Provider: Anthropic (best for requirements)
  Model: claude-opus-4-6
  Cost limit: $10

Architect Agent:
  Provider: OpenRouter (cheap, fast)
  Model: mistral/mistral-7b
  Cost limit: $5

Code Reviewer Agent:
  Provider: OpenAI (best for code)
  Model: gpt-4-turbo
  Cost limit: $15

Total monthly cost optimized: Use right tool for right job
```

### Example 2: User Creates Custom PM Agent

```
Step 1: User creates MyPMAgent plugin
- Implements build_prompt with company templates
- Custom parsing for internal format
- Adds internal tool for compliance checking

Step 2: Upload to personal registry
- Via admin panel: [+ Upload Plugin]
- MyPMAgent v1.0 appears in plugin list

Step 3: Configure to use new plugin
- Agent Config → PM Agent
- Plugin: [Dropdown] select MyPMAgent
- Save

Step 4: Next execution
- PM Agent uses MyPMAgent plugin
- Custom prompt template used
- Custom parsing applied
- Company standards enforced
```

### Example 3: Switch Provider Due to Cost

```
Scenario: OpenRouter becomes expensive

Current config:
  Architect Agent uses OpenRouter

Step 1: Admin notices high costs
Step 2: Changes config
  Provider: [Dropdown] switch to Ollama (local, free)
  Model: [Dropdown] select local-mistral

Step 3: Test
  [Test Agent] button checks connectivity

Step 4: Next execution
  - Architect Agent now uses local Ollama
  - Same interface, different backend
  - Cost: $0 (local)
  - Slightly slower, but much cheaper
```

---

## API Endpoints for Configuration

```
Configuration Management:

GET    /api/admin/agents
       → List all agent configurations

GET    /api/admin/agents/{agent_type}
       → Get specific agent configuration

PUT    /api/admin/agents/{agent_type}
       Body: {provider, model, temperature, plugins, cost_limit}
       → Update agent configuration

GET    /api/admin/providers
       → List all provider configurations

POST   /api/admin/providers/{provider}/test
       → Test provider connectivity

GET    /api/admin/plugins
       → List all plugins (built-in + user)

POST   /api/admin/plugins/upload
       Body: form data with plugin files
       → Upload new plugin

DELETE /api/admin/plugins/{plugin_name}
       → Delete user plugin

GET    /api/admin/costs
       → Get cost breakdown by agent/provider

GET    /api/admin/costs/today
       → Today's costs

GET    /api/admin/costs/month
       → This month's costs


Plugin Runtime:

GET    /api/plugins/{plugin_name}/schema
       → Get plugin input/output schema

POST   /api/plugins/{plugin_name}/test
       Body: {input}
       → Test plugin with sample input

GET    /api/plugins/marketplace
       → Browse available plugins to download

POST   /api/plugins/marketplace/{plugin_id}/install
       → Install marketplace plugin
```

---

## Security Considerations

### API Keys & Credentials

```
Storage:
- Never store plain text
- Encrypt at rest
- Use HSM if available
- Rotate regularly

Access:
- Only admin can view (masked)
- API keys never returned in API responses
- Audit log all credential access

Scope:
- Provider credentials separate per provider
- Can limit API key scope (if provider supports)
- Can use rate-limited keys
```

### Plugin Security

```
Validation:
- Scan plugins for malicious code
- Sandbox execution if possible
- Rate limit plugin execution
- Monitor resource usage (CPU, memory)

Signing:
- Sign built-in plugins
- Allow users to sign their plugins
- Warn on unsigned plugins

Permissions:
- Plugins can only access LLM APIs
- No access to database
- No access to file system (unless explicitly granted)
- Plugins run in isolated context
```

### Audit Trail

```
Log:
- Who changed what configuration
- When providers were enabled/disabled
- Cost alerts
- Plugin installation/removal
- Configuration rollbacks
```

---

## Migration & Rollback

### Configuration Versioning

```
Each config change creates a version:

Version 1: Initial setup
├─ PM Agent: Anthropic claude-opus
├─ Architect: OpenRouter mistral
├─ Cost: $50/day

Version 2: (User made this change)
├─ Changed Architect to OpenAI gpt-4
├─ Cost: $120/day
├─ Created: 2024-04-18 10:30
├─ Created by: diego@example.com
└─ Reason: "Better code analysis"

Version 3: (Rollback)
├─ Reverted to Version 1
├─ Cost: $50/day
├─ Created: 2024-04-18 14:00
└─ Reason: "gpt-4 too expensive"

Ability to:
[Rollback to Version 1]
[Compare Version 2 vs 3]
[View History]
```

---

## Conclusion

This plugin system enables:

✅ **Flexibility**: Use any provider, any model
✅ **Customization**: Create custom agents/tools
✅ **Cost Control**: Optimize per agent
✅ **Hot-swap**: Change providers without restart
✅ **Community**: Share plugins via marketplace
✅ **Auditability**: Full history of changes
✅ **Security**: Isolated plugin execution

Users can optimize KAIROS for their needs without touching code!
