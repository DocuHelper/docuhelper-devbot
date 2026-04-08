import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { toolResult, emitEvent } from "./helpers.js";

export const reportPlan = tool(
  "report_plan",
  "개발 계획을 보고한다. 코드 수정 전에 반드시 이 도구로 계획을 보고해야 한다.",
  {
    summary: z.string().describe("계획 요약"),
    steps: z.array(z.string()).describe("실행 단계 목록"),
    files_to_modify: z.array(z.string()).default([]).describe("수정할 파일 목록"),
  },
  async ({ summary, steps, files_to_modify }) => {
    emitEvent("plan_reported", { summary, steps, files: files_to_modify });
    return toolResult({ acknowledged: true, message: "계획이 기록되었습니다. git_prepare로 브랜치를 생성하세요." });
  },
);

export const reportSummary = tool(
  "report_summary",
  "작업 완료 후 변경사항을 보고한다. push 전에 반드시 이 도구로 보고해야 한다.",
  {
    summary: z.string().describe("작업 요약"),
    files_changed: z.array(z.string()).default([]).describe("변경된 파일 목록"),
    build_success: z.boolean().default(false).describe("빌드 성공 여부"),
  },
  async ({ summary, files_changed, build_success }) => {
    emitEvent("summary_reported", { summary, files: files_changed, build: build_success });
    if (!build_success) {
      return toolResult({ acknowledged: true, warning: "빌드가 성공하지 않았습니다. push 전에 빌드를 성공시키세요." });
    }
    return toolResult({ acknowledged: true, message: "변경사항이 기록되었습니다. git_push로 push하세요." });
  },
);
