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
