# OpenCode Claude-Style @ Expansion Plugin

Expands `@file` references in CLAUDE.md/AGENTS.md files into session context, similar to Claude Code's @ reference behavior.

## Installation

### As npm package (recommended):
```bash
npm install opencode-claude-style-at-expansion
```

Then add to your OpenCode config:
```json
{
  "plugins": ["opencode-claude-style-at-expansion"]
}
```

### As local plugin:
```bash
npm install @opencode-ai/plugin
```
Copy `src/index.ts` to `.opencode/plugins/` and reference it in your config.

## Features

- **Automatic file expansion**: Detects `@file` references in CLAUDE.md and AGENTS.md
- **Recursive resolution**: Follows `@` references within expanded files
- **Configurable limits**: Set max file size (default: 100KB)
- **Ignore patterns**: Exclude files (default: node_modules, .git, dist, *.log)
- **No duplicates**: Avoids expanding the same file twice

## Configuration

Edit `src/index.ts` to customize:

```typescript
const DEFAULT_CONFIG: Required<PluginConfig> = {
  maxFileSize: 100 * 1024,        // Max file size in bytes
  ignoredPatterns: ["node_modules", ".git", "dist", "*.log"],
  referenceFiles: ["CLAUDE.md", "AGENTS.md", "CLAUDE.md", ".claude/CLAUDE.md"],
};
```

## Development

```bash
npm install
npm run build
```

## License

MIT