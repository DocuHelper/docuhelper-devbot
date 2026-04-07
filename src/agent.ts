import { query, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import {
  gitPrepare, gitPush, buildProject,
  reportPlan, reportSummary,
  fetchGithubIssue, createGithubIssue, createGithubPR, reviewGithubPR,
  emitEvent,
} from "./tools/index.js";
import { PROTECTED_BRANCHES, PROJECT_CONTEXT } from "./constants.js";

export type AgentMode = "develop" | "review" | "analyze";

export interface AgentConfig {
  mode: AgentMode;
  prompt: string;
  repo?: string;
  baseBranch: string;
  maxTurns: number;
  maxBudgetUsd: number;
  model: string;
  dryRun: boolean;
  workdir: string;
}

function buildSystemPrompt(config: AgentConfig): string {
  const base = `너는 DocuHelper DevBot, AI 개발 자동화 에이전트다.\n\n## 프로젝트 정보\n${PROJECT_CONTEXT}\n`;

  switch (config.mode) {
    case "develop":
      return `${base}
## 작업 모드: 개발
- 대상 레포: ${config.repo || "프롬프트에서 확인"}
- 베이스 브랜치: ${config.baseBranch}
- 작업 디렉토리: ${config.workdir}

## 작업 순서
1. 요구사항을 분석하고 코드베이스를 탐색하여 개발 계획을 세워라
2. mcp__devbot__report_plan으로 계획을 보고해라
3. mcp__devbot__git_prepare로 브랜치를 생성해라
4. 코드를 수정해라
5. mcp__devbot__build_project로 빌드를 검증해라
6. 빌드 실패 시 → 에러 분석 → 수정 → 다시 빌드 (최대 5회)
7. mcp__devbot__report_summary로 변경사항을 보고해라
8. mcp__devbot__git_push로 push해라
9. mcp__devbot__create_github_pr로 PR을 생성해라

## 규칙
- 기존 코드 스타일을 따라라
- main/master 브랜치에 직접 push하지 마라
- .env, credentials 등 시크릿 파일을 수정하지 마라
${config.dryRun ? "\n## DRY RUN 모드\n계획 수립까지만 진행하고 코드 수정/push는 하지 마라." : ""}`;

    case "review":
      return `${base}
## 작업 모드: 코드 리뷰
- 작업 디렉토리: ${config.workdir}

## 작업 순서
1. PR의 변경사항을 확인해라
2. 코드 품질, 버그, 보안 이슈, 테스트 커버리지를 검토해라
3. mcp__devbot__review_github_pr로 리뷰를 남겨라
  - 문제 없으면: APPROVE
  - 수정 필요하면: REQUEST_CHANGES (구체적 피드백 포함)

## 리뷰 기준
- 버그나 논리 오류가 있는가?
- 보안 취약점이 있는가?
- 기존 코드 스타일을 따르는가?
- 테스트가 충분한가?`;

    case "analyze":
      return `${base}
## 작업 모드: 프로젝트 분석
- 작업 디렉토리: ${config.workdir}

## 작업 순서
1. ${config.workdir} 아래의 모든 레포지토리를 분석해라
2. 개선할 점을 찾아라:
   - 누락된 README, 불완전한 문서
   - 코드 품질 이슈, 버그
   - 누락된 테스트
   - TODO/FIXME 주석
   - 보안 이슈, 하드코딩된 설정값
3. 발견한 항목마다 mcp__devbot__create_github_issue로 Issue를 생성해라
4. 최대 3~5개의 실행 가능한 이슈를 생성해라`;
  }
}

function extractGitPushTarget(cmd: string): string | null {
  const pushMatch = cmd.match(/git\s+push\s+(?:-[^\s]+\s+)*(\S+)\s+(\S+)/);
  if (!pushMatch) return null;
  const refspec = pushMatch[2];
  const colonIdx = refspec.indexOf(":");
  if (colonIdx !== -1) return refspec.slice(colonIdx + 1);
  return refspec;
}

export async function runAgent(config: AgentConfig): Promise<void> {
  const devToolsServer = createSdkMcpServer({
    name: "devbot",
    version: "0.1.0",
    tools: [
      gitPrepare, gitPush, buildProject,
      reportPlan, reportSummary,
      fetchGithubIssue, createGithubIssue, createGithubPR, reviewGithubPR,
    ],
  });

  let buildVerified = false;

  emitEvent("agent_started", {
    mode: config.mode,
    repo: config.repo,
    dryRun: config.dryRun,
  });

  const dryRunBlockedTools = [
    "mcp__devbot__git_push",
    "mcp__devbot__git_prepare",
    "mcp__devbot__build_project",
    "mcp__devbot__create_github_pr",
  ];

  const result = query({
    prompt: config.prompt,
    options: {
      cwd: config.workdir,
      systemPrompt: buildSystemPrompt(config),
      tools: { type: "preset", preset: "claude_code" },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      model: config.model,
      maxTurns: config.maxTurns,
      maxBudgetUsd: config.maxBudgetUsd,
      mcpServers: {
        devbot: {
          type: "sdk",
          name: "devbot",
          instance: devToolsServer.instance,
        },
      },
      hooks: {
        PreToolUse: [
          // dry-run 차단
          ...(config.dryRun ? [{
            matcher: "*",
            hooks: [async (input: any) => {
              const toolName = input.tool_name || "";
              if (dryRunBlockedTools.includes(toolName) || ["Edit", "Write"].includes(toolName)) {
                return {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse" as const,
                    permissionDecision: "deny" as const,
                    permissionDecisionReason: "DRY RUN 모드입니다.",
                  },
                };
              }
              return {};
            }],
          }] : []),
          // push 전 빌드 검증
          {
            matcher: "mcp__devbot__git_push",
            hooks: [async () => {
              if (!buildVerified) {
                return {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse" as const,
                    permissionDecision: "deny" as const,
                    permissionDecisionReason: "빌드가 검증되지 않았습니다. build_project를 먼저 실행하세요.",
                  },
                };
              }
              return {};
            }],
          },
          // protected branch push 차단
          {
            matcher: "Bash",
            hooks: [async (input: any) => {
              const cmd: string = input.tool_input?.command || "";
              if (!cmd.match(/\bgit\s+push\b/)) return {};
              const target = extractGitPushTarget(cmd);
              if (target && PROTECTED_BRANCHES.includes(target)) {
                return {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse" as const,
                    permissionDecision: "deny" as const,
                    permissionDecisionReason: `보호된 브랜치(${target})에 직접 push할 수 없습니다.`,
                  },
                };
              }
              return {};
            }],
          },
        ],
        PostToolUse: [{
          matcher: "mcp__devbot__build_project",
          hooks: [async (input: any) => {
            try {
              const text = typeof input.tool_response === "string"
                ? input.tool_response : JSON.stringify(input.tool_response);
              if (text.includes('"success":true') || text.includes('"success": true')) {
                buildVerified = true;
                emitEvent("build_verified");
              }
            } catch { /* ignore */ }
            return {};
          }],
        }],
      },
    },
  });

  for await (const message of result) {
    handleMessage(message);
  }
}

function handleMessage(message: SDKMessage): void {
  switch (message.type) {
    case "assistant": {
      const content = message.message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if ("text" in block && block.text) {
            console.log(JSON.stringify({ event: "assistant", text: block.text.slice(0, 500) }));
          }
          if ("type" in block && block.type === "tool_use") {
            console.log(JSON.stringify({ event: "tool_call", tool: (block as any).name }));
          }
        }
      }
      break;
    }
    case "result": {
      const isSuccess = message.subtype === "success";
      console.log(JSON.stringify({
        event: "agent_completed",
        success: isSuccess,
        subtype: message.subtype,
        turns: message.num_turns,
        cost_usd: message.total_cost_usd,
        duration_ms: message.duration_ms,
        ...(isSuccess ? { result: (message as any).result?.slice(0, 1000) } : {}),
        ...(!isSuccess ? { errors: (message as any).errors } : {}),
      }));
      break;
    }
  }
}
