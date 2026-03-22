#!/bin/bash

# 1. 스테이징 확인
if git diff --cached --quiet; then
    echo "❌ [Error] 스테이징된 변경사항이 없습니다. 'git add'를 먼저 하세요."
    exit 1
fi

# 2. 변경 파일 요약 및 개수 파악
CHANGE_SUMMARY=$(git diff --cached --stat | head -n -1 | awk '{print $1}' | tr '\n' ', ' | sed 's/, $//')
CHANGED_FILES_COUNT=$(git diff --cached --name-only | wc -l)
CURRENT_TIME=$(date "+%H:%M")

# 3. 변경 내용에 따른 프리셋 메시지 (Conventional Commits 스타일)
# 파일명이나 내용에 특정 키워드가 있으면 태그를 변경합니다.
if git diff --cached | grep -qi "fix"; then
    TYPE="fix"
elif git diff --cached | grep -qi "feat"; then
    TYPE="feat"
elif git diff --cached | grep -qi "refactor"; then
    TYPE="refactor"
else
    TYPE="chore"
fi

COMMIT_MSG="$TYPE: update $CHANGED_FILES_COUNT files ($CHANGE_SUMMARY) at $CURRENT_TIME"

# 4. 커밋 실행
echo "📝 생성된 메시지로 커밋합니다: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# 5. 푸시 여부 확인 (선택 사항)
echo "---------------------------------------"
read -p "🚀 바로 Push 하시겠습니까? (y/N): " CONFIRM

if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
    git push origin "$BRANCH_NAME"
    echo "✅ Push 완료!"
else
    echo "💾 로컬에 커밋되었습니다. 나중에 'git push' 하세요."
fi