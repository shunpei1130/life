import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>抽象画像編集アプリ | EternalAI</title>
        <meta
          name="description"
          content="EternalAIと連携した抽象画像編集アプリ。人物写真をアップロードし、自然言語の指示で編集できます。"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
