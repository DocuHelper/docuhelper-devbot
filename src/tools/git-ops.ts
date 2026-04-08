import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { exec, toolResult, emitEvent } from "./helpers.js";
import { PROTECTED_BRANCHES } from "../constants.js";

export const gitPrepare = tool(
  "git_prepare",
  "작업 브랜치를 생성한다. 베이스 브랜치에서 새 브랜치를 체크아웃한다.",
  {
    branch_name: z.string().describe("생성할 브랜치 이름 (예: feat/add-readme)"),
    base_branch: z.string().default("main").describe("베이스 브랜치"),
    repo_dir: z.string().describe("레포지토리 디렉토리 경로"),
  },
  async ({ branch_name, base_branch, repo_dir }) => {
    const results: string[] = [];
    results.push(exec("git fetch origin", repo_dir));
    results.push(exec(`git checkout ${base_branch}`, repo_dir));
    results.push(exec(`git pull origin ${base_branch}`, repo_dir));
    results.push(exec(`git checkout -b ${branch_name}`, repo_dir));

    const current = exec("git branch --show-current", repo_dir);
    emitEvent("branch_created", { branch: branch_name, base: base_branch });

    return toolResult({ success: current === branch_name, branch: branch_name, log: results.join("\n") });
  },
);

export const gitPush = tool(
  "git_push",
  "변경사항을 커밋하고 push한다. 빌드 성공 후에만 호출해야 한다.",
  {
    commit_message: z.string().describe("커밋 메시지"),
    repo_dir: z.string().describe("레포지토리 디렉토리 경로"),
  },
  async ({ commit_message, repo_dir }) => {
    const branch = exec("git branch --show-current", repo_dir);
    if (PROTECTED_BRANCHES.includes(branch)) {
      return toolResult({ success: false, error: `보호된 브랜치(${branch})에 직접 push할 수 없습니다.` });
    }

    const results: string[] = [];
    results.push(exec("git add -A", repo_dir));
    results.push(exec(`git commit -m "${commit_message}"`, repo_dir));
    results.push(exec(`git push -u origin ${branch}`, repo_dir));

    emitEvent("pushed", { branch, message: commit_message });
    return toolResult({ success: !results.some(r => r.includes("ERROR")), branch, log: results.join("\n") });
  },
);
