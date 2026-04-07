import asyncio
import os
import sys
import json
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage


def load_prompt(prompt_name: str) -> str:
    """prompts/ 디렉토리에서 프롬프트 파일 로드"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    prompt_path = os.path.join(base_dir, "prompts", f"{prompt_name}.md")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r") as f:
            return f.read()
    return ""


async def run_agent(
    prompt: str,
    system_prompt: str = "",
    cwd: str = "/home/coder/projects",
    model: str = "claude-opus-4-6",
    allowed_tools: list[str] | None = None,
    mcp_servers: dict | None = None,
    max_turns: int | None = None,
):
    if allowed_tools is None:
        allowed_tools = [
            "Read", "Write", "Edit", "Bash",
            "Glob", "Grep", "WebSearch", "WebFetch", "Agent",
        ]

    options = ClaudeAgentOptions(
        cwd=cwd,
        allowed_tools=allowed_tools,
        permission_mode="bypassPermissions",
        system_prompt=system_prompt or None,
        model=model,
    )

    if mcp_servers:
        options.mcp_servers = mcp_servers

    if max_turns:
        options.max_turns = max_turns

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)
                elif hasattr(block, "name"):
                    print(f"[Tool: {block.name}]")
        elif isinstance(message, ResultMessage):
            print(f"\n=== Task Complete ===")
            print(f"Result: {message.result}")
            return message.result

    return None
