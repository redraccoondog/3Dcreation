#!/bin/bash
# デプロイ、コミット、プッシュを一度に行うスクリプト
# 使用方法: ./deploy-commit.sh "コミットメッセージ"

# デフォルトのコミットメッセージ
MESSAGE=${1:-"デプロイ更新"}

# 確認メッセージを表示
echo "デプロイを開始します..."
echo "コミットメッセージ: $MESSAGE"

# デプロイ実行
npm run deploy

# Gitコマンド実行
git add .
git commit -m "$MESSAGE"
git push

echo "デプロイ、コミット、プッシュが完了しました"
