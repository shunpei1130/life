import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { ImageDropzone } from '@/components/ImageDropzone';
import { InstructionChips } from '@/components/InstructionChips';
import { ProcessingModal } from '@/components/ProcessingModal';
import { ResultActions } from '@/components/ResultActions';
import { validatePrompt } from '@/lib/validation';
import { generateImage, pollResult, ApiError, fetchMe } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

interface UploadPreview {
  file: File;
  dataUrl: string;
}

type View = 'upload' | 'instruction' | 'result';
type Status = 'idle' | 'ready' | 'requesting' | 'processing' | 'success' | 'failed';

export default function GeneratePage() {
  const { user, idToken, loading } = useAuth();
  const [view, setView] = useState<View>('upload');
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const cancelRef = useRef({ cancelled: false });

  const tips = useMemo(
    () => [
      '画像を生成中です。通常は 10秒–100秒 ほどで完了します。',
      'コツ：シンプルに指示をするとよいです。',
      'Tip：色変更や背景差し替えは具体的な単語が効果的です。'
    ],
    []
  );

  const refreshCredits = useCallback(async () => {
    if (!idToken) {
      setCredits(null);
      return;
    }
    try {
      setCreditsLoading(true);
      const response = await fetchMe(idToken);
      setCredits(response.credits);
    } catch (error) {
      console.error(error);
    } finally {
      setCreditsLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (idToken) {
      void refreshCredits();
    } else {
      setCredits(null);
    }
  }, [idToken, refreshCredits]);

  const handleFileSelected = useCallback(async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    setPreview({ file, dataUrl });
    setStatus('ready');
  }, []);

  const handleNext = useCallback(() => {
    if (!preview) return;
    setView('instruction');
    setErrorMessage(null);
  }, [preview]);

  const appendPrompt = useCallback((text: string) => {
    setPrompt((prev) => (prev ? `${prev}\n${text}` : text));
  }, []);

  const resetAll = useCallback(() => {
    setView('upload');
    setStatus('idle');
    setPreview(null);
    setPrompt('');
    setPromptError(null);
    setResultUrl(null);
    setErrorMessage(null);
  }, []);

  const handleReedit = useCallback(() => {
    setView('instruction');
    setStatus('ready');
    setResultUrl(null);
    setErrorMessage(null);
  }, []);

  const pollForResult = useCallback(
    async (requestId: string) => {
      let attempt = 0;
      cancelRef.current.cancelled = false;
      try {
        while (!cancelRef.current.cancelled) {
          const response = await pollResult(requestId);
          if (response.status === 'success' && response.result_url) {
            setResultUrl(response.result_url);
            setStatus('success');
            setView('result');
            void refreshCredits();
            return;
          }

          if (response.status === 'failed') {
            setErrorMessage(response.error ?? '画像の生成に失敗しました。再度お試しください。');
            setStatus('failed');
            setView('instruction');
            void refreshCredits();
            return;
          }

          const delay = Math.min(2000, 1000 * Math.pow(1.5, attempt));
          attempt += 1;
          await wait(delay);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage('結果の取得に失敗しました。通信環境を確認して再度お試しください。');
        setStatus('failed');
        setView('instruction');
        void refreshCredits();
      }
    },
    [refreshCredits]
  );

  const handleSubmit = useCallback(async () => {
    if (!preview) return;
    if (!idToken) {
      setErrorMessage('ログインしてからご利用ください。');
      return;
    }

    const validationError = validatePrompt(prompt);
    if (validationError) {
      setPromptError(validationError);
      return;
    }

    setPromptError(null);
    setStatus('requesting');
    setErrorMessage(null);

    try {
      const base64 = await fileToBase64(preview.file);
      const response = await generateImage(
        {
          prompt,
          filename: preview.file.name,
          imageBase64: base64
        },
        idToken
      );

      setCredits((prev) => (typeof prev === 'number' ? Math.max(prev - 1, 0) : prev));
      setStatus('processing');
      setView('instruction');
      pollForResult(response.request_id);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && error.status === 402) {
        setErrorMessage('クレジットが不足しています。購入ページからチャージしてください。');
      } else {
        setErrorMessage('編集リクエストの送信に失敗しました。時間をおいて再度お試しください。');
      }
      setStatus('failed');
      void refreshCredits();
    }
  }, [idToken, pollForResult, preview, prompt, refreshCredits]);

  const cancelProcessing = useCallback(() => {
    cancelRef.current.cancelled = true;
    setStatus('ready');
  }, []);

  const hasPreview = Boolean(preview?.dataUrl);
  const isInsufficientCredits = credits !== null && credits <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Head>
        <title>{t('app_title')}｜画像生成</title>
      </Head>
      <ProcessingModal open={status === 'processing'} onCancel={cancelProcessing} />
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12 text-white">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">画像生成</h1>
          <p className="text-slate-300">ログインするとクレジットを消費して画像生成が行えます。</p>
          <div className="mt-2 text-sm text-slate-200">
            {loading ? (
              <span>ログイン状態を確認しています...</span>
            ) : user ? (
              <span>
                現在のクレジット: {creditsLoading ? '更新中…' : `${credits ?? 0} クレジット`}{' '}
                {isInsufficientCredits && (
                  <Link href="/purchase" className="underline">
                    チャージはこちら
                  </Link>
                )}
              </span>
            ) : (
              <span>
                利用にはログインが必要です。<Link href="/" className="underline">トップページ</Link>からログインしてください。
              </span>
            )}
          </div>
        </header>

        {!user && !loading && (
          <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-8 text-center text-slate-200">
            <p>ログインすると画像生成が可能になります。</p>
          </div>
        )}

        {user && view === 'upload' && (
          <section className="flex flex-col items-center gap-6">
            <ImageDropzone
              onFileSelected={handleFileSelected}
              fileName={preview?.file.name}
              disabled={status === 'requesting' || status === 'processing'}
            />
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasPreview}
              className="rounded-full bg-primary-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:bg-primary-400 disabled:opacity-60"
            >
              次へ
            </button>
          </section>
        )}

        {user && view === 'instruction' && preview && (
          <section className="grid gap-8 md:grid-cols-[1.3fr,1fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/60 shadow-xl">
                <img src={preview.dataUrl} alt="アップロード画像" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">編集指示</h2>
              <p className="text-sm text-slate-300">
                テキストで編集内容を指定してください。候補チップをクリックすると追記されます。
              </p>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('prompt_placeholder')}
                rows={6}
                className="rounded-2xl border border-slate-700 bg-white/95 p-4 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
              />
              {promptError && <p className="text-sm text-rose-300">{promptError}</p>}
              {errorMessage && <p className="text-sm text-rose-400">{errorMessage}</p>}
              <InstructionChips onAppend={appendPrompt} />
              <div className="mt-auto flex flex-col gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === 'requesting' || status === 'processing' || isInsufficientCredits}
                  className="rounded-full bg-primary-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:bg-primary-400 disabled:opacity-60"
                >
                  生成を実行
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-sm text-slate-300 underline"
                >
                  画像を選び直す
                </button>
                {isInsufficientCredits && (
                  <p className="text-sm text-amber-200">
                    クレジットが不足しています。<Link href="/purchase" className="underline">購入ページ</Link>からチャージしてください。
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {user && view === 'result' && resultUrl && (
          <section className="grid gap-8 md:grid-cols-[1.3fr,1fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/60 shadow-xl">
                <img src={resultUrl} alt="生成結果" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">生成結果</h2>
              <ResultActions imageUrl={resultUrl} onReedit={handleReedit} onReset={resetAll} />
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 text-slate-200">
          <h2 className="text-lg font-semibold text-white">ヒント</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const [, base64] = dataUrl.split(',', 2);
  return base64;
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

