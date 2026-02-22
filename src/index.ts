import type { Plugin } from "@opencode-ai/plugin";
import { readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname, extname } from "path";

interface PluginConfig {
  maxFileSize?: number;
  ignoredPatterns?: string[];
  referenceFiles?: string[];
}

const DEFAULT_CONFIG: Required<PluginConfig> = {
  maxFileSize: 100 * 1024,
  ignoredPatterns: ["node_modules", ".git", "dist", "*.log"],
  referenceFiles: ["CLAUDE.md", "AGENTS.md", "MEMORY.md", ".claude/CLAUDE.md"],
};

function resolvePath(baseDir: string, ref: string): string {
  let filePath = ref.slice(1);
  if (!filePath.startsWith("/")) {
    filePath = resolve(baseDir, filePath);
  }
  return filePath;
}

function findAtReferences(content: string): string[] {
  const matches = content.match(/@(?:\.\.?\/)?[\w\-\./]+/g);
  return matches ? [...new Set(matches)] : [];
}

function extractTextFromParts(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}

function shouldIgnore(filePath: string, ignoredPatterns: string[]): boolean {
  const fileName = filePath.split("/").pop() || "";
  for (const pattern of ignoredPatterns) {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      if (fileName.endsWith(ext)) return true;
    }
    if (filePath.includes(pattern)) return true;
  }
  return false;
}

export const AtExpansion: Plugin = async ({ directory, client }) => {
  let expanded = false;
  return {
    event: async ({ event }) => {
      if (expanded) return;
      if (event.type !== "session.created") return;
      if (!event.sessionID) return;
      expanded = true;

      const config = DEFAULT_CONFIG;
      const processedPaths = new Set<string>();
      const expansions: Map<string, string> = new Map();

      try {
        const messagesResult = await client.session.messages({
          path: { id: event.sessionID },
        });

        const allContent = messagesResult.data
          .map((m) => extractTextFromParts(m.parts))
          .join("\n");

        const initialRefs = findAtReferences(allContent);

        const processFile = (filePath: string, baseDir: string): void => {
          if (processedPaths.has(filePath)) return;
          if (!existsSync(filePath)) return;

          try {
            const stats = statSync(filePath);
            if (stats.size > config.maxFileSize) return;
          } catch {
            return;
          }

          if (shouldIgnore(filePath, config.ignoredPatterns)) return;
          processedPaths.add(filePath);

          try {
            const content = readFileSync(filePath, "utf8");
            if (!content) return;

            const refs = findAtReferences(content);
            for (const ref of refs) {
              const resolvedPath = resolvePath(dirname(filePath), ref);
              processFile(resolvedPath, dirname(resolvedPath));
            }

            const key = filePath.split("/").pop() || filePath;
            if (!expansions.has(key)) {
              expansions.set(key, content);
            }
          } catch {
          }
        };

        for (const ref of initialRefs) {
          const resolvedPath = resolvePath(directory, ref);
          processFile(resolvedPath, directory);
        }

        if (expansions.size > 0) {
          const injectedContent =
            `## @ File References\n` +
            `The following files were referenced and are included for context:\n` +
            Array.from(expansions.entries())
              .map(([name, content]) => `\n\n## ${name}\n\n${content}`)
              .join("\n");

          await client.session.prompt({
            sessionId: event.sessionID,
            body: {
              noReply: true,
              parts: [{ type: "text" as const, text: injectedContent }],
            },
          });
        }
      } catch (e) {
        console.error("Failed to expand @ references:", e);
      }
    },
  };
};

export default AtExpansion;