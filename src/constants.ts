export const PROTECTED_BRANCHES = ["main", "master", "release", "production"];

export const DOCUHELPER_REPOS = [
  "docuhelper-api",
  "docuhelper-auth",
  "docuhelper-file",
  "docuhelper-document-parser",
  "docuhelper-embed",
  "docuhelper-nextjs",
  "docuhelper-flutter",
  "docuhelper-n8n",
  "pdf-parser-poc",
  "spring-ai-test",
];

export const PROJECT_CONTEXT = `DocuHelper는 마이크로서비스 기반 문서 관리 플랫폼입니다.

Backend (Kotlin/Spring Boot):
- docuhelper-api: 메인 API 게이트웨이
- docuhelper-auth: 인증 서비스
- docuhelper-file: 파일 관리 서비스
- docuhelper-document-parser: 문서 파싱 서비스
- docuhelper-embed: 임베딩 서비스

Frontend:
- docuhelper-nextjs: 웹 프론트엔드 (Next.js/TypeScript, branch: dev)
- docuhelper-flutter: 모바일 앱 (Dart/Flutter)

Others:
- docuhelper-n8n: 워크플로우 자동화 (n8n)
- pdf-parser-poc: PDF 파싱 PoC (Python)
- spring-ai-test: Spring AI 실험 (Kotlin)`;
