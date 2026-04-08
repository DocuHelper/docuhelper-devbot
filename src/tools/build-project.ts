import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { exec, toolResult, emitEvent } from "./helpers.js";

export const buildProject = tool(
  "build_project",
  "프로젝트를 빌드하여 검증한다. 빌드 스크립트를 자동 감지한다.",
  {
    repo_dir: z.string().describe("레포지토리 디렉토리 경로"),
    command: z.string().optional().describe("빌드 명령어 (미지정 시 자동 감지)"),
  },
  async ({ repo_dir, command }) => {
    let cmd = command;

    if (!cmd) {
      try {
        const pkg = exec("cat package.json", repo_dir);
        if (!pkg.includes("ERROR")) {
          const scripts = JSON.parse(pkg).scripts || {};
          if (scripts.build) cmd = "npm run build";
          else if (scripts.compile) cmd = "npm run compile";
        }
      } catch { /* not node */ }

      if (!cmd) {
        const gradlew = exec("ls gradlew", repo_dir);
        if (!gradlew.includes("ERROR")) cmd = "./gradlew build";
      }

      if (!cmd) {
        const pom = exec("ls pom.xml", repo_dir);
        if (!pom.includes("ERROR")) cmd = "mvn compile";
      }

      if (!cmd) cmd = "echo 'No build system detected'";
    }

    const output = exec(cmd, repo_dir);
    const success = !output.includes("ERROR");

    emitEvent(success ? "build_success" : "build_failed", { command: cmd });
    return toolResult({ success, command: cmd, output: output.slice(-2000) });
  },
);
