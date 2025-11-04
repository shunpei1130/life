import { useCallback, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { ImageDropzone } from '@/components/ImageDropzone';
import { InstructionChips } from '@/components/InstructionChips';
import { ProcessingModal } from '@/components/ProcessingModal';
import { ResultActions } from '@/components/ResultActions';
import { validatePrompt } from '@/lib/validation';
import { requestEdit, pollResult, PollResponse } from '@/lib/api';
import { t } from '@/lib/i18n';

interface UploadPreview {
  file: File;
  dataUrl: string;
}

type View = 'upload' | 'instruction' | 'result';
type Status = 'idle' | 'ready' | 'requesting' | 'processing' | 'success' | 'failed';

export default function Home() {
  const [view, setView] = useState<View>('upload');
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cancelRef = useRef({ cancelled: false });

  const tips = useMemo(
    () => [
      '画像を生成中です。通常は 10秒–100秒 ほどで完了します。',
      'コツ：シンプルに指示をするとよいです。',
      'Tip：色変更や背景差し替えは具体的な単語が効果的です。'
    ],
    []
  );

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

  const pollForResult = useCallback(async (id: string) => {
    let attempt = 0;
    cancelRef.current.cancelled = false;
    try {
      while (!cancelRef.current.cancelled) {
        const response: PollResponse = await pollResult(id);
        if (response.status === 'success' && response.result_url) {
          setResultUrl(response.result_url);
          setStatus('success');
          setView('result');
          return;
        }

        if (response.status === 'failed') {
          setErrorMessage(response.error ?? '画像の生成に失敗しました。再度お試しください。');
          setStatus('failed');
          setView('instruction');
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
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!preview) return;
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
      const response = await requestEdit({
        prompt,
        filename: preview.file.name,
        imageBase64: base64
      });

      setStatus('processing');
      setView('instruction');
      pollForResult(response.request_id);
    } catch (error) {
      console.error(error);
      setErrorMessage('編集リクエストの送信に失敗しました。時間をおいて再度お試しください。');
      setStatus('failed');
    }
  }, [pollForResult, preview, prompt]);

  const cancelProcessing = useCallback(() => {
    cancelRef.current.cancelled = true;
    setStatus('ready');
  }, []);

  const hasPreview = Boolean(preview?.dataUrl);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Head>
        <title>{t('app_title')}</title>
      </Head>
      <ProcessingModal open={status === 'processing'} onCancel={cancelProcessing} />
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-bold text-white md:text-4xl">画像編集アプリ LIFE</h1>
          <p className="text-slate-300">
            人物写真を自然言語の指示だけで編集できます。
          </p>
        </header>

        {view === 'upload' && (
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
              className="rounded-full bg-primary-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:bg-primary-400"
            >
              次へ
            </button>
          </section>
        )}

        {view === 'instruction' && preview && (
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
                  disabled={status === 'requesting' || status === 'processing'}
                  className="rounded-full bg-primary-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:bg-primary-400 disabled:opacity-60"
                >
                  送信
                </button>
                <button
                  type="button"
                  onClick={() => setView('upload')}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  戻る
                </button>
              </div>
            </div>
          </section>
        )}

        {view === 'result' && resultUrl && (
          <section className="grid gap-8 md:grid-cols-[1.4fr,1fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-primary-500/30 bg-slate-900/70 shadow-2xl">
                <img src={resultUrl} alt="生成結果" className="w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">結果</h2>
              <p className="text-sm text-slate-300">
                下記のボタンからダウンロードや再編集が可能です。
              </p>
              <ResultActions imageUrl={resultUrl} onReedit={handleReedit} onReset={resetAll} />
              {tips.length > 0 && (
                <div className="mt-8 space-y-2 rounded-2xl bg-slate-800/50 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-slate-100">編集のコツ</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const [, base64] = dataUrl.split(',');
  return base64 ?? '';
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
