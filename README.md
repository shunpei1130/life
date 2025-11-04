# EternalAI 抽象画像編集アプリ

EternalAI の `uncensored-image` API と連携した抽象画像編集 Web アプリケーションです。人物写真をアップロードし、自然言語の指示で背景や服装の変更などを行えます。フロントエンドは Next.js + Tailwind CSS、バックエンドは FastAPI で構築しています。

## プロジェクト構成

```
life/
├── components/        # フロントエンド UI コンポーネント
├── docs/              # 要件定義書
├── lib/               # クライアント共通ロジック
├── pages/             # Next.js ページ
├── public/            # 公開アセット・i18nリソース
├── server/            # FastAPI バックエンド
└── styles/            # Tailwind スタイル
```

## 前提条件

- Node.js 18 以上
- npm または pnpm
- Python 3.10 以上

## セットアップ

### フロントエンド

```bash
npm install
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` を `.env.local` に設定すると、バックエンドの URL を変更できます（デフォルトは `http://localhost:8000`）。

### バックエンド

```bash
cd server
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API キーを利用する場合は `.env` に `ETERNAL_AI_API_KEY=<your_key>` を設定します。API キーが未設定の場合、サーバーはローカル開発用のシミュレーションレスポンスを返します。

## 本番環境へのデプロイ

### バックエンド（必須の環境変数）

本番環境では、以下の環境変数を設定してください：

```bash
# 必須
ENVIRONMENT=production              # 本番環境であることを示す（"production" または "prod"）
ETERNAL_AI_API_KEY=<your_key>       # 有効なEternalAI APIキー
CORS_ALLOW_ORIGINS=https://your-frontend-domain.com  # フロントエンドのURL（カンマ区切りで複数指定可能）

# オプション
CORS_ALLOW_ORIGIN_REGEX=https://.*\.vercel\.app$    # Vercelプレビュー環境用の正規表現
MAX_BODY_BYTES=15728640                            # リクエストボディサイズ制限（デフォルト: 15MB）
```

**重要な注意点：**

1. **`ENVIRONMENT=production` の設定**
   - 本番環境では必ず設定してください
   - 設定しないと、localhostがCORSに追加され、シミュレーションモードにフォールバックする可能性があります

2. **`ETERNAL_AI_API_KEY` の設定**
   - 本番環境では有効なAPIキーが必須です
   - 未設定または無効な場合、401エラーが発生します（開発環境ではシミュレーションモードにフォールバック）

3. **`CORS_ALLOW_ORIGINS` の設定**
   - フロントエンドのURLを正確に指定してください
   - 複数のドメインを許可する場合はカンマ区切り: `https://example.com,https://www.example.com`

4. **エラーハンドリング**
   - 本番環境では、外部APIのエラー（401、500など）はシミュレーションモードにフォールバックしません
   - エラーは適切にHTTPステータスコードとして返されます
   - サーバーログでエラー内容を確認できます

5. **セキュリティ**
   - `.env` ファイルは絶対にGitにコミットしないでください
   - 環境変数はデプロイプラットフォーム（Render、Heroku、AWS等）の環境変数設定で管理してください

### ヘルスチェック

本番環境では、以下のエンドポイントで動作確認ができます：

- `GET /api/health` - サーバーの状態とAPIキーの有無を確認
- `GET /api/debug/cors` - CORS設定を確認（デバッグ用）

## 主な機能

- 画像アップロード（ドラッグ＆ドロップ対応）
- 編集指示用チャット風 UI と候補チップ
- EternalAI API への編集依頼とポーリング
- 処理中モーダルと Tips カルーセル
- 結果画像のプレビュー、PNG/JPEG ダウンロード、クリップボードコピー、再編集
- 入力バリデーション（文字数・禁止語）
- キーボード操作・ARIA 属性対応の UI コンポーネント

## 状態遷移

```
idle → uploading → ready → requesting → processing → success | failed
```

UI 上ではアップロード・指示・結果の 3 ステップで構成されています。処理中はキャンセルが可能で、API へは指数バックオフ付きのポーリングを行います。

## ライセンス

MIT
