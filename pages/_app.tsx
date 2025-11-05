/* eslint-disable @next/next/no-html-link-for-pages */ // ← このファイル内だけ一時的に無効化
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import '@/styles/globals.css';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function HeaderNavigation() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <nav className="flex items-center gap-6 text-sm font-medium text-gray-700">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            LIFE
          </Link>
          <Link href="/purchase" className="hover:text-gray-900">
            クレジット購入
          </Link>
          <Link href="/generate" className="hover:text-gray-900">
            画像生成
          </Link>
          <Link href="/success" className="hover:text-gray-900">
            決済完了案内
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          {user ? (
            <>
              <span className="hidden sm:inline">{user.email}</span>
              <button
                type="button"
                onClick={signOutUser}
                className="rounded-full border border-gray-300 px-4 py-1 text-sm hover:bg-gray-100"
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={signInWithGoogle}
              className="rounded-full bg-primary-500 px-4 py-1 text-sm font-semibold text-white shadow hover:bg-primary-400 disabled:opacity-60"
            >
              Googleでログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>LIFE〈人物を自由に修正しよう〉</title>
        <meta
          name="description"
          content="画像編集アプリ。人物写真をアップロードし、自然言語の指示で編集できます。"
        />
      </Head>

      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <HeaderNavigation />
        <main className="flex-grow">
          <Component {...pageProps} />
        </main>
        <footer className="border-t bg-white/70 py-6 text-center text-sm text-gray-500">
          © 2025 LIFE ｜{' '}
          <Link href="/tokushoho" className="underline hover:text-gray-700">
            特定商取引法に基づく表記
          </Link>{' '}
          ｜{' '}
          <Link href="/terms" className="underline hover:text-gray-700">
            利用規約
          </Link>{' '}
          ｜{' '}
          <Link href="/privacy" className="underline hover:text-gray-700">
            プライバシーポリシー
          </Link>
        </footer>
      </div>
    </AuthProvider>
  );
}
