#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as readline from "node:readline";

const SKILL_README = `# Codemagic MCP Skill

Use this skill when working with Codemagic CI/CD.

See full docs: https://github.com/Zfinix/codemagic_mcp
`;

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function setup(): Promise<void> {
  console.log("\ncodemagic_mcp setup\n");

  const apiKey = await prompt("Codemagic API key (Teams → Personal Account → Integrations → Codemagic API): ");
  if (!apiKey) {
    console.error("API key is required. Aborting.");
    process.exit(1);
  }

  console.log("\nRegistering MCP server with Claude Code...");
  try {
    execSync(
      `claude mcp add codemagic --scope user -e CODEMAGIC_API_KEY="${apiKey}" -- npx -y codemagic_mcp`,
      { stdio: "inherit" },
    );
    console.log("MCP server registered.");
  } catch {
    console.error("Could not register via 'claude mcp add'. Add manually:");
    console.error(`  claude mcp add codemagic --scope user -e CODEMAGIC_API_KEY=<key> -- npx -y codemagic_mcp`);
  }

  console.log("\nInstalling Claude Code skill...");
  const skillDir = join(homedir(), ".claude", "skills", "codemagic");
  mkdirSync(skillDir, { recursive: true });
  const skillPath = join(skillDir, "README.md");
  if (!existsSync(skillPath)) {
    writeFileSync(skillPath, SKILL_README, "utf8");
    console.log(`Skill written to ${skillPath}`);
  } else {
    console.log(`Skill already exists at ${skillPath} — skipping.`);
  }

  console.log("\nDone. Restart Claude Code to activate the codemagic tools.");
}

const cmd = process.argv[2];

if (cmd === "setup") {
  setup().catch((err) => { console.error(err); process.exit(1); });
} else {
  // Default: run as MCP server (stdio)
  import("./index.ts").catch((err) => { console.error(err); process.exit(1); });
}
