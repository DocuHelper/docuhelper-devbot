#!/usr/bin/env python3
"""
DocuHelper DevBot - 에이전트 실행 엔트리포인트

사용법:
  python3 run.py analyzer              # 분석 에이전트 실행
  python3 run.py developer             # 개발 에이전트 실행
  python3 run.py reviewer              # 리뷰 에이전트 실행
  python3 run.py auto                  # AGENT_TYPE 환경변수로 자동 선택

환경변수:
  ANTHROPIC_API_KEY   - Anthropic API 키 (필수)
  AGENT_TYPE          - 에이전트 타입 (analyzer/developer/reviewer)
  AGENT_TASK_PROMPT   - 작업 프롬프트 (developer/reviewer에 필수)
  GH_TOKEN            - GitHub 토큰 (Issue/PR 생성에 필요)
"""
import asyncio
import os
import sys
import importlib


def main():
    agent_type = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("AGENT_TYPE", "auto")

    if agent_type == "auto":
        task_prompt = os.environ.get("AGENT_TASK_PROMPT", "")
        if not task_prompt:
            agent_type = "analyzer"
        elif "review" in task_prompt.lower() or "pr #" in task_prompt.lower():
            agent_type = "reviewer"
        else:
            agent_type = "developer"

    print(f"=== DocuHelper DevBot ===")
    print(f"Agent: {agent_type}")
    print(f"========================")

    module = importlib.import_module(f"agents.{agent_type}")
    asyncio.run(module.main())


if __name__ == "__main__":
    main()
