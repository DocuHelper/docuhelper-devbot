import { z } from "zod";
import { emitEvent } from "./helpers.js";

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

export const fetchGithubIssue = {
  name: "fetch_github_issue",
  description: "GitHub Issue의 내용을 가져옵니다.",
  schema: z.object({
    repo: z.string().describe("레포지토리 이름"),
    issue_number: z.number().describe("이슈 번호"),
  }),
  async execute(args: { repo: string; issue_number: number }) {
    const data = await githubApi(`/repos/${GIT_ORG}/${args.repo}/issues/${args.issue_number}`);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          number: data.number,
          title: data.title,
          body: data.body,
          labels: data.labels?.map((l: any) => l.name),
          state: data.state,
        }),
      }],
    };
  },
};

export const createGithubIssue = {
  name: "create_github_issue",
  description: "GitHub에 새 Issue를 생성합니다.",
  schema: z.object({
    repo: z.string().describe("레포지토리 이름"),
    title: z.string().describe("이슈 제목"),
    body: z.string().describe("이슈 본문"),
    labels: z.array(z.string()).default(["ai-generated"]).describe("라벨"),
  }),
  async execute(args: { repo: string; title: string; body: string; labels: string[] }) {
    const data = await githubApi(`/repos/${GIT_ORG}/${args.repo}/issues`, "POST", {
      title: args.title,
      body: args.body,
      labels: args.labels,
    });

    emitEvent("issue_created", { repo: args.repo, number: data.number });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ success: true, number: data.number, url: data.html_url }),
      }],
    };
  },
};

export const createGithubPR = {
  name: "create_github_pr",
  description: "GitHub에 Pull Request를 생성합니다.",
  schema: z.object({
    repo: z.string().describe("레포지토리 이름"),
    title: z.string().describe("PR 제목"),
    body: z.string().describe("PR 본문"),
    head: z.string().describe("소스 브랜치"),
    base: z.string().default("main").describe("타겟 브랜치"),
  }),
  async execute(args: { repo: string; title: string; body: string; head: string; base: string }) {
    const data = await githubApi(`/repos/${GIT_ORG}/${args.repo}/pulls`, "POST", {
      title: args.title,
      body: args.body,
      head: args.head,
      base: args.base,
    });

    emitEvent("pr_created", { repo: args.repo, number: data.number });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ success: true, number: data.number, url: data.html_url }),
      }],
    };
  },
};

export const reviewGithubPR = {
  name: "review_github_pr",
  description: "GitHub PR에 리뷰를 남깁니다 (APPROVE 또는 REQUEST_CHANGES).",
  schema: z.object({
    repo: z.string().describe("레포지토리 이름"),
    pr_number: z.number().describe("PR 번호"),
    event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]).describe("리뷰 타입"),
    body: z.string().describe("리뷰 코멘트"),
  }),
  async execute(args: { repo: string; pr_number: number; event: string; body: string }) {
    const data = await githubApi(
      `/repos/${GIT_ORG}/${args.repo}/pulls/${args.pr_number}/reviews`,
      "POST",
      { event: args.event, body: args.body },
    );

    emitEvent("pr_reviewed", { repo: args.repo, pr: args.pr_number, event: args.event });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ success: true, review_id: data.id }),
      }],
    };
  },
};
