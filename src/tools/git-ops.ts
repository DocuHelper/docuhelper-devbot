import { z } from "zod";
import { exec, emitEvent } from "./helpers.js";

export const gitPrepare = {
  name: "git_prepare",
  description: "작업 브랜치를 생성합니다. baseBranch에서 새 브랜치를 체크아웃합니다.",
  schema: z.object({
    branch_name: z.string().describe("생성할 브랜치 이름 (예: feat/add-readme)"),
    base_branch: z.string().default("main").describe("베이스 브랜치"),
    repo_dir: z.string().describe("레포지토리 디렉토리 경로"),
  }),
  async execute(args: { branch_name: string; base_branch: string; repo_dir: string }) {
    const { branch_name, base_branch, repo_dir } = args;

    exec(`git fetch origin`, repo_dir);
    exec(`git checkout ${base_branch}`, repo_dir);
    exec(`git pull origin ${base_branch}`, repo_dir);
    exec(`git checkout -b ${branch_name}`, repo_dir);

    emitEvent("branch_created", { branch: branch_name, base: base_branch });

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, branch: branch_name }) }],
    };
  },
};

export const gitPush = {
  name: "git_push",
  description: "현재 브랜치의 변경사항을 커밋하고 push합니다.",
  schema: z.object({
    commit_message: z.string().describe("커밋 메시지"),
    repo_dir: z.string().describe("레포지토리 디렉토리 경로"),
  }),
  async execute(args: { commit_message: string; repo_dir: string }) {
    const { commit_message, repo_dir } = args;

    exec(`git add -A`, repo_dir);
    exec(`git commit -m "${commit_message}"`, repo_dir);

    const branch = exec(`git branch --show-current`, repo_dir);
    exec(`git push -u origin ${branch}`, repo_dir);

    emitEvent("pushed", { branch, message: commit_message });

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, branch }) }],
    };
  },
};
