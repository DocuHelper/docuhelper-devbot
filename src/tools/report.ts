import { z } from "zod";
import { emitEvent } from "./helpers.js";

export const reportPlan = {
  name: "report_plan",
  description: "개발 계획을 보고합니다.",
  schema: z.object({
    summary: z.string().describe("계획 요약"),
    steps: z.array(z.string()).describe("실행 단계 목록"),
    files_to_modify: z.array(z.string()).default([]).describe("수정할 파일 목록"),
  }),
  async execute(args: { summary: string; steps: string[]; files_to_modify: string[] }) {
    emitEvent("plan_reported", {
      summary: args.summary,
      steps: args.steps,
      files: args.files_to_modify,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: "계획이 보고되었습니다." }) }],
    };
  },
};

export const reportSummary = {
  name: "report_summary",
  description: "작업 완료 요약을 보고합니다.",
  schema: z.object({
    summary: z.string().describe("작업 요약"),
    files_changed: z.array(z.string()).default([]).describe("변경된 파일 목록"),
    tests_added: z.boolean().default(false).describe("테스트 추가 여부"),
  }),
  async execute(args: { summary: string; files_changed: string[]; tests_added: boolean }) {
    emitEvent("summary_reported", {
      summary: args.summary,
      files: args.files_changed,
      tests: args.tests_added,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: "요약이 보고되었습니다." }) }],
    };
  },
};
