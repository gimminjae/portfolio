# 김민재 포트폴리오

[포트폴리오 보기](https://gimminjae.github.io/portfolio/)

흰 종이와 문서형 타이포그래피를 중심으로 소개, 경력 및 프로젝트별 개요·역할·기여·결과, 기술, 학력 및 자격증, 연락처를 보여주는 정적 사이트입니다. 개인 콘텐츠는 UI 코드와 분리되어 있습니다.

## 콘텐츠 수정

| 파일 | 관리하는 내용 |
| --- | --- |
| `content/profile.json` | 이름, 소개, 사진, 연락처, 경력, 기술, 교육·자격, 검색/공유 메타데이터 |
| `content/projects.json` | 이력서 기준 서비스 프로젝트 5개와 기존 작업 8개의 상세 기여 |
| `content/notes.json` | 보존된 마크다운 학습 문서의 제목, 순서, 경로 (홈페이지 미노출) |
| `content/site.json` | 메뉴, 섹션 제목, 필터 이름, 버튼 및 안내 문구 |

1. 위 JSON 파일을 수정합니다.
2. `npm test`와 `npm run build`를 실행합니다. 패키지 설치는 필요하지 않습니다(Node.js 22 이상).
3. JSON과 빌드로 갱신된 `index.html`을 함께 커밋합니다.

`index.html`은 자동 생성 파일입니다. 여기를 직접 수정하면 다음 빌드에서 덮어씁니다. JavaScript를 끈 브라우저도 본문과 기본 상세 펼치기를 읽을 수 있도록 정적 HTML을 생성합니다.

프로젝트 추가 시 고유한 `id`, `title`, `summary`, `organization`, `categories`, `role`, `stack`, `kind`, `period`, `context`, `contributions`, `outcome`, `caseStudies`, `links`, `expanded`를 입력합니다. 분류 값은 `site.json`의 `categories`에 등록된 ID를 사용합니다. 필터 개수는 자동 계산됩니다. 관련 링크가 없다면 `links: []`로 두며, 존재하지 않는 URL을 만들지 않습니다. `expanded: true`이면 처음부터 펼칩니다.

프로젝트 안의 `caseStudies`는 상세 기여 목록입니다. 각 항목은 고유한 `id`, `title`, `summary`, `context`, `contributions`, `outcome`을 가집니다. 회사 경력은 `profile.experience`, 기타 경험은 `profile.otherExperience`, 교육·자격은 `profile.background`에서 관리합니다. 경력의 `highlights[].projectId`는 실제 프로젝트의 ID와 일치해야 합니다. `resumeAsOf`는 이력서 기준 시점입니다.

경력과 기타 활동의 요약, 프로젝트 필터와 상세는 하나의 **경력 및 프로젝트** 섹션으로 표시됩니다. 기존 `#experience`, `#work`, 프로젝트별 주소는 유지합니다. NOTES 섹션은 제거했지만 학습 문서 원본과 뷰어는 보존합니다.

## 실행과 검증

```sh
npm test          # 원본 프로젝트 보존, 데이터 검증, 렌더링 및 링크 테스트
npm run build     # 루트 index.html + dist/ 생성
npm run preview   # http://127.0.0.1:4173/portfolio/
```

`npm run dev`는 빌드 후 미리보기를 시작합니다. 자동 파일 감시는 없으므로 수정 후 `npm run build`를 다시 실행하고 브라우저를 새로고침합니다. `npm run check`는 테스트와 빌드 후 커밋된 HTML이 콘텐츠와 일치하는지 검사하며, 수정 중에는 생성 파일 차이 때문에 실패할 수 있습니다.

프로젝트는 별도 실행 의존성이 없습니다. 기존 `viewer.html`만 원래처럼 마크다운/코드 강조 라이브러리를 CDN에서 읽습니다.

## 파일 구조

```text
content/                 # 편집할 콘텐츠의 원본 JSON
src/render.js            # 콘텐츠를 HTML로 변환하는 화면 템플릿
src/main.js              # 필터, 목차, 이메일 복사, 인쇄 상호작용
css/style.css            # 반응형 화면 및 A4 인쇄 스타일
scripts/content.mjs      # JSON 로딩과 오류 검증
scripts/build.mjs        # 정적 사이트 생성
scripts/serve.mjs        # 로컬 미리보기 서버
index.html               # GitHub Pages용 생성 결과 (커밋)
viewer.html              # 기존 마크다운 뷰어
articles/                # 기존 학습 문서 (보존)
images/                  # 기존 프로필과 자료 이미지 (보존)
tests/                   # 데이터 보존 및 생성 테스트
.github/workflows/       # 테스트·빌드·생성 결과 일치 여부 검사
docs/content-provenance.md # 콘텐츠 출처와 편집 기준
dist/                    # 별도 정적 호스팅용 출력 (Git 제외)
```

## GitHub Pages와 인쇄

기존 `master` 루트의 `index.html`을 유지하므로 브랜치 기반 GitHub Pages 설정을 변경할 필요가 없습니다. 다른 정적 호스팅에서는 `dist/`를 배포하면 됩니다. 모든 내부 자산은 상대 경로로 연결되어 `/portfolio/` 하위 경로에서도 동작합니다.

화면의 **인쇄 / PDF**를 누르면 전체 프로젝트를 펼쳐 인쇄합니다. 인쇄 종료/취소 후에는 기존 필터 및 펼침 상태로 돌아옵니다. PDF 저장은 브라우저의 인쇄 창에서 선택합니다. 출력 결과는 브라우저·폰트·인쇄 설정에 따라 달라질 수 있습니다.

## 참고자료 사용 범위

개인 콘텐츠는 사용자가 제공한 2026.09 이력서 PDF를 우선하여 반영했습니다. 원티드 16페이지 PDF는 디자인과 정보 배치만 참고했습니다. 예시 인물의 이력, 수치, 서비스, 아키텍처 이미지, 수상·발표 이력은 복사하지 않았습니다. 자세한 출처와 보존 범위는 [콘텐츠 편집 기준](docs/content-provenance.md)을 참고하세요.
