import { z } from "zod";
import { exec, emitEvent } from "./helpers.js";

export const buildProject = {
  name: "build_project",
  description: "프로젝트를 빌드하여 검증합니다. 빌드 스크립트를 자동 감지합니다.",
  schema: z.object({
    repo_dir: z.string().describe("레포지토리 디렉토리 경로"),
    command: z.string().optional().describe("빌드 명령어 (미지정 시 자동 감지)"),
  }),
  async execute(args: { repo_dir: string; command?: string }) {
    const { repo_dir } = args;
    let cmd = args.command;

    if (!cmd) {
      // 빌드 명령어 자동 감지
      try {
        const pkg = exec(`cat package.json`, repo_dir);
        const scripts = JSON.parse(pkg).scripts || {};
        if (scripts.build) cmd = "npm run build";
        else if (scripts.compile) cmd = "npm run compile";
      } catch { /* not a node project */ }

      if (!cmd) {
        try {
          exec(`ls gradlew`, repo_dir);
          cmd = "./gradlew build";
        } catch { /* not gradle */ }
      }

      if (!cmd) {
        try {
          exec(`ls pom.xml`, repo_dir);
          cmd = "mvn compile";
        } catch { /* not maven */ }
      }

      if (!cmd) cmd = "echo 'No build system detected'";
    }

    try {
      const output = exec(cmd, repo_dir);
      emitEvent("build_success", { command: cmd });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ success: true, command: cmd, output: output.slice(-2000) }),
        }],
      };
    } catch (err: any) {
      emitEvent("build_failed", { command: cmd, error: err.message });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ success: false, command: cmd, error: err.message.slice(-2000) }),
        }],
      };
    }
  },
};
