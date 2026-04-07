/home/coder/projects/ 아래의 모든 DocuHelper 레포지토리를 분석하여 개발할 거리를 찾아주세요.

각 레포지토리에서 다음을 확인하세요:
1. README.md - 누락되었거나 불완전한지
2. 코드 품질 - 명확한 버그, 코드 스멜, 누락된 에러 처리가 있는지
3. 테스트 - 테스트 파일이 없거나 커버리지가 낮은지
4. 의존성 - 오래되었거나 취약한 의존성이 있는지
5. 코드 내 TODO/FIXME 주석
6. 누락된 문서나 API 문서
7. 설정 문제 - 환경변수 대신 하드코딩된 값이 있는지

발견한 각 항목에 대해 해당 레포지토리에 GitHub Issue를 생성하세요:
curl -s -X POST "https://api.github.com/repos/DocuHelper/<레포이름>/issues" \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "<명확한 제목>", "body": "<파일 경로와 수정 방안을 포함한 상세 설명>", "labels": ["ai-generated"]}'

우선순위:
- 높음: 버그, 보안 이슈, 기능 장애
- 중간: 누락된 테스트, 불완전한 문서, 코드 품질
- 낮음: 리팩토링, 소소한 개선

최대 3~5개의 집중적이고 실행 가능한 이슈를 생성하세요.
