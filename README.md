# 3D箱庭アプリケーション

ThreeJSを使用した、ウェブブラウザで動作する三人称視点の箱庭型3Dアプリケーションです。スマートフォンでも簡単に操作できます。

## デモ

GitHub Pagesで公開されたデモは以下のURLからアクセスできます：
https://redraccoondog.github.io/3Dcreation/

## 機能

- 三人称視点でのキャラクター操作
- カスタマイズ可能なアセット
- スマホでの簡単操作
- カメラコントロール
- 物理演算

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# GitHub Pagesへのデプロイ
npm run deploy
```

## アセットについて

- アセットは`public/assets`ディレクトリに配置します
- glTFまたはGLB形式に対応しています
- NomadSculptやBlenderなどで作成したアセットを使用できます

## GitHub Pagesへのデプロイ方法

プロジェクトは設定済みのGitHub Pagesを使用して簡単に公開できます：

1. リポジトリをクローン: `git clone https://github.com/redraccoondog/3Dcreation.git`
2. 依存関係をインストール: `npm install`
3. GitHub Pagesにデプロイ: `npm run deploy`
4. 数分後に `https://redraccoondog.github.io/3Dcreation/` にアクセス

## ライセンス

ISC 