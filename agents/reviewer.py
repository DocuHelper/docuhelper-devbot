"""리뷰 에이전트 - PR을 검토하고 승인/변경요청"""
import asyncio
import os
from .base import run_agent, load_prompt


async def main():
    system_prompt = load_prompt("reviewer_system")
    task_prompt = os.environ.get("AGENT_TASK_PROMPT", "")

    if not task_prompt:
        print("AGENT_TASK_PROMPT 환경변수가 필요합니다.")
        return

    await run_agent(
        prompt=task_prompt,
        system_prompt=system_prompt,
        model="claude-opus-4-6",
    )


if __name__ == "__main__":
    asyncio.run(main())
