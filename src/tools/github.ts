import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { toolResult, emitEvent } from "./helpers.js";

const GH_TOKEN = process.env.GH_TOKEN || "";
const GIT_ORG = process.env.GIT_ORG || "DocuHelper";

async function githubApi(path: string, method = "GET", body?: any): Promise<any> {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `token ${GH_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export const fetchGithubIssue = tool(
  "fetch_github_issue",
  "GitHub Issue의 내용을 가져온다.",
  {
    repo: z.string().describe("레포지토리 이름"),
    issue_number: z.number().describe("이슈 번호"),
  },
  async ({ repo, issue_number }) => {
    const data = await githubApi(`/repos/${GIT_ORG}/${repo}/issues/${issue_number}`);
    return toolResult({ number: data.number, title: data.title, body: data.body, labels: data.labels?.map((l: any) => l.name), state: data.state });
  },
);

export const createGithubIssue = tool(
  "create_github_issue",
  "GitHub에 새 Issue를 생성한다.",
  {
    repo: z.string().describe("레포지토리 이름"),
    title: z.string().describe("이슈 제목"),
    body: z.string().describe("이슈 본문"),
    labels: z.array(z.string()).default(["ai-generated"]).describe("라벨"),
  },
  async ({ repo, title, body, labels }) => {
    const data = await githubApi(`/repos/${GIT_ORG}/${repo}/issues`, "POST", { title, body, labels });
    emitEvent("issue_created", { repo, number: data.number });
    return toolResult({ success: true, number: data.number, url: data.html_url });
  },
);

export const createGithubPR = tool(
  "create_github_pr",
  "GitHub에 Pull Request를 생성한다.",
  {
    repo: z.string().describe("레포지토리 이름"),
    title: z.string().describe("PR 제목"),
    body: z.string().describe("PR 본문"),
    head: z.string().describe("소스 브랜치"),
    base: z.string().default("main").describe("타겟 브랜치"),
  },
  async ({ repo, title, body, head, base }) => {
    const data = await githubApi(`/repos/${GIT_ORG}/${repo}/pulls`, "POST", { title, body, head, base });
    emitEvent("pr_created", { repo, number: data.number });
    return toolResult({ success: true, number: data.number, url: data.html_url });
  },
);

export const reviewGithubPR = tool(
  "review_github_pr",
  "GitHub PR에 리뷰를 남긴다 (APPROVE 또는 REQUEST_CHANGES).",
  {
    repo: z.string().describe("레포지토리 이름"),
    pr_number: z.number().describe("PR 번호"),
    event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]).describe("리뷰 타입"),
    body: z.string().describe("리뷰 코멘트"),
  },
  async ({ repo, pr_number, event, body }) => {
    const data = await githubApi(`/repos/${GIT_ORG}/${repo}/pulls/${pr_number}/reviews`, "POST", { event, body });
    emitEvent("pr_reviewed", { repo, pr: pr_number, event });
    return toolResult({ success: true, review_id: data.id });
  },
);
