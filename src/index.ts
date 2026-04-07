import { Command } from "commander";
import { runAgent, type AgentMode } from "./agent.js";

const program = new Command();

program
  .name("devbot")
  .description("DocuHelper DevBot - AI 개발 자동화 에이전트")
  .version("0.1.0")
  .requiredOption("--mode <mode>", "에이전트 모드 (develop/review/analyze)")
  .option("--prompt <prompt>", "작업 프롬프트")
  .option("--repo <repo>", "대상 레포지토리 이름")
  .option("--base-branch <branch>", "베이스 브랜치", "main")
  .option("--max-turns <number>", "최대 Agent 턴 수", "80")
  .option("--max-budget <usd>", "최대 비용 (USD)", "10")
  .option("--model <model>", "Claude 모델", "claude-sonnet-4-6")
  .option("--workdir <dir>", "작업 디렉토리", "/home/coder/projects")
  .option("--dry-run", "계획만 수립 (코드 수정/push 안 함)", false)
  .parse();

const opts = program.opts();

// 환경변수에서 프롬프트 가져오기 (CLI 인자 우선)
const prompt = opts.prompt || process.env.AGENT_TASK_PROMPT || "";

if (!prompt && opts.mode !== "analyze") {
  console.error("--prompt 또는 AGENT_TASK_PROMPT 환경변수가 필요합니다.");
  process.exit(1);
}

console.log(JSON.stringify({
  event: "startup",
  timestamp: new Date().toISOString(),
  mode: opts.mode,
  repo: opts.repo,
  dryRun: opts.dryRun,
}));

runAgent({
  mode: opts.mode as AgentMode,
  prompt: prompt || "프로젝트를 분석하고 개선할 점을 찾아 Issue를 생성해라.",
  repo: opts.repo,
  baseBranch: opts.baseBranch,
  maxTurns: parseInt(opts.maxTurns, 10),
  maxBudgetUsd: parseFloat(opts.maxBudget),
  model: opts.model,
  dryRun: opts.dryRun,
  workdir: opts.repo ? `${opts.workdir}/${opts.repo}` : opts.workdir,
}).catch((err) => {
  console.error(JSON.stringify({
    event: "fatal_error",
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
  }));
  process.exit(1);
});
