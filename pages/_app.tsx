import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>LIFE〈人物を自由に修正しよう〉</title>
        <meta
          name="description"
          content="画像編集アプリ。人物写真をアップロードし、自然言語の指示で編集できます。"
        />
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* ページの中身 */}
        <main className="flex-grow">
          <Component {...pageProps} />
        </main>

        {/* 共通フッター */}
        <footer className="text-center text-sm text-gray-500 py-6 border-t">
          © 2025 Life ｜{' '}
          <a href="/tokushoho" className="underline hover:text-gray-700">
            特定商取引法に基づく表記
          </a>{' '}
          ｜{' '}
          <a href="/terms" className="underline hover:text-gray-700">
            利用規約
          </a>{' '}
          ｜{' '}
          <a href="/privacy" className="underline hover:text-gray-700">
            プライバシーポリシー
          </a>
        </footer>
      </div>
    </>
  );
}
