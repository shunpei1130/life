import Head from 'next/head';
import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head>
        <title>決済完了｜LIFE</title>
      </Head>
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center">
        <div className="rounded-full bg-emerald-100 p-4">
          <span className="text-emerald-600">✓</span>
        </div>
        <h1 className="text-3xl font-bold">決済が完了しました</h1>
        <p className="text-slate-600">
          Stripeでの決済が完了しました。クレジットは数秒以内に付与されます。マイページで残高をご確認ください。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/" className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold hover:bg-slate-100">
            マイページに戻る
          </Link>
          <Link
            href="/generate"
            className="rounded-full bg-primary-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-primary-400"
          >
            画像生成を続ける
          </Link>
        </div>
      </main>
    </div>
  );
}
