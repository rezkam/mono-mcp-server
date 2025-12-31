# @rezkam/mono-mcp-server

MCP server for [Mono](https://monodo.app) task management. Enables LLMs to manage tasks, create daily plans, and act as a personal productivity assistant.

## Features

- **Planning-Oriented Tools**: Smart tools designed for daily planning workflows
- **Full CRUD Operations**: Complete access to lists, items, and recurring templates
- **Actionable Error Messages**: Helpful suggestions for LLMs to self-correct
- **Type-Safe**: Built with TypeScript for reliability

## Installation

```bash
npx @rezkam/mono-mcp-server
```

## Configuration

Add to your MCP client configuration (e.g., Claude Desktop `~/.config/claude/config.json`):

```json
{
  "mcpServers": {
    "mono": {
      "command": "npx",
      "args": ["@rezkam/mono-mcp-server"],
      "env": {
        "MONO_API_KEY": "sk-your-api-key-here"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONO_API_KEY` | **Yes** | - | Your Mono API key (starts with `sk-`) |
| `MONO_API_URL` | No | `https://monodo.app/api` | API base URL (for local development) |

## Available Tools

### Planning Tools (Optimized for LLM Daily Planning)

These tools are designed to make the LLM an effective planning assistant:

#### `get_plannable_tasks`
Get tasks available to work on for daily planning.
- Excludes done/archived/cancelled items
- Sorted by priority (urgent→low), then due time
- Includes estimated durations for time budgeting

#### `get_overdue_tasks`
Get tasks past their due date, sorted by how overdue.
- Critical for responsible task management
- Helps prioritize catch-up work

#### `get_tasks_due_soon`
Get tasks due within a time window (default: 7 days).
- Helps with weekly planning
- Prevents last-minute rushes

#### `get_tasks_by_tag`
Filter tasks by context/tag (e.g., "work", "home", "errands").
- Enables context-based planning
- Useful for location-based task batching

#### `get_workload_summary`
Get aggregated view of pending work.
- Total count and estimated hours
- Breakdown by priority and tag
- Overdue and due-this-week counts
- Answers "how much work do I have?" without listing everything

#### `quick_add_task`
Rapidly capture tasks with smart defaults.
- Status: todo
- Priority: medium (unless specified)
- Simpler than `create_item` for quick capture

### CRUD Tools (Full API Access)

#### Lists
- `list_lists` - Get all todo lists with pagination and filtering
- `create_list` - Create a new todo list
- `get_list` - Get list details with item counts

#### Items
- `list_items` - Get items with filtering by status/priority/tags
- `create_item` - Create a task with full details
- `update_item` - Update task fields via update_mask
- `complete_item` - Mark task as done (convenience wrapper)

#### Recurring Templates
- `list_recurring_templates` - Get recurring templates
- `create_recurring_template` - Create recurring task (daily/weekly/monthly/etc)
- `update_recurring_template` - Modify template settings
- `delete_recurring_template` - Remove template

## Example Prompts

Once configured, you can ask your LLM assistant:

- **Planning**: "What should I work on today?"
- **Overview**: "What's my workload like this week?"
- **Filtering**: "Show me all high-priority work tasks"
- **Quick Capture**: "Add 'buy groceries' to my personal list"
- **Updates**: "Mark the report task as done"
- **Recurring**: "Create a daily reminder to check email at 9am"
- **Overdue**: "What am I behind on?"

## Error Handling

The server provides actionable error messages to help LLMs self-correct:

**Example**: If you try to update an item with an invalid status, you'll get:
```
Error: Invalid status value
Code: VALIDATION_ERROR
Field: status
Suggestion: The status value is not recognized.
Recovery: Use one of the valid status values.
Valid values: todo, in_progress, blocked, done, archived, cancelled
```

## Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/rezkam/mono-mcp-server
cd mono-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Test with MCP Inspector (optional)
npx @modelcontextprotocol/inspector dist/index.js
```

### Client Code Generation

This project uses auto-generated TypeScript client code from the Mono API OpenAPI specification. The client code is generated from the [Mono OpenAPI spec](https://github.com/rezkam/mono/blob/main/api/openapi/mono.yaml) and should not be manually edited.

#### Updating the Generated Client

When the Mono API specification changes, regenerate the client:

```bash
# Generate client code from OpenAPI spec
npm run generate
```

This will:
1. Fetch the latest OpenAPI spec from GitHub
2. Generate TypeScript client code to `src/generated/`
3. Create type definitions, API functions, and client configuration

The generated files are gitignored and regenerated on each build.

#### Client Generation Configuration

Client generation is configured in [openapi-ts.config.ts](openapi-ts.config.ts):

```typescript
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: 'fetch',
  input: 'https://raw.githubusercontent.com/rezkam/mono/main/api/openapi/mono.yaml',
  output: {
    format: 'prettier',
    path: './src/generated',
  },
  types: {
    enums: 'javascript',
  },
});
```

**Key points:**
- Uses `@hey-api/openapi-ts` for generation
- Fetches spec directly from GitHub (always up-to-date)
- Output directory: `src/generated/` (gitignored)
- Client: Native fetch API (no additional dependencies)
- Generated code is formatted with Prettier

#### Architecture: Two-Layer Design

The codebase follows a two-layer architecture:

1. **Generated Client Layer** (`src/generated/`):
   - Auto-generated from OpenAPI spec
   - Provides type-safe API functions
   - Should never be manually edited
   - Regenerated on every build

2. **MCP Tools Layer** (`src/tools/`):
   - Manually crafted MCP tool definitions
   - Uses generated client for API calls
   - Contains business logic, filtering, sorting
   - This is where development and testing happens

**Example:**

```typescript
// src/tools/items.ts - Manual MCP tool implementation
import { listItems } from "../client.js";  // Generated client function

case "list_items": {
  // Use generated client with type-safe parameters
  const { data, error, response } = await listItems({
    path: { list_id: args.list_id as string },
    query: { status: args.status as any }
  });

  if (error) {
    throw createActionableError(response.status, error as any, {...});
  }

  return data;
}
```

### Versioning and Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated releases. See [.changeset/README.md](.changeset/README.md) for detailed instructions on creating releases.

### Using with Local Mono API

Set `MONO_API_URL` to your local development server:

```json
{
  "mcpServers": {
    "mono": {
      "command": "npx",
      "args": ["@rezkam/mono-mcp-server"],
      "env": {
        "MONO_API_KEY": "sk-dev-key",
        "MONO_API_URL": "http://localhost:8081/api"
      }
    }
  }
}
```

## Architecture

```
src/
├── index.ts          # MCP server entry point
├── client.ts         # HTTP client with auth and error handling
├── types.ts          # TypeScript types from OpenAPI spec
├── errors.ts         # Actionable error formatting
└── tools/
    ├── index.ts      # Tool registry
    ├── lists.ts      # List CRUD operations
    ├── items.ts      # Item CRUD operations
    ├── recurring.ts  # Recurring template operations
    └── planning.ts   # Planning-oriented composite tools
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/rezkam/mono-mcp-server).
