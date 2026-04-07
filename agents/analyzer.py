"""분석 에이전트 - 프로젝트를 분석하고 GitHub Issue 생성"""
import asyncio
import os
from .base import run_agent, load_prompt


async def main():
    system_prompt = load_prompt("analyzer_system")
    task_prompt = os.environ.get("AGENT_TASK_PROMPT", "") or load_prompt("analyzer_task")

    await run_agent(
        prompt=task_prompt,
        system_prompt=system_prompt,
        model="claude-opus-4-6",
    )


if __name__ == "__main__":
    asyncio.run(main())
