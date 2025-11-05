import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { fetchHistory, fetchMe, MeResponse, HistoryResponse } from '@/lib/api';

export default function HomePage() {
  const { user, idToken, loading, signInWithGoogle } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [fetching, setFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!idToken) {
      setMe(null);
      setHistory(null);
      return;
    }
    try {
      setFetching(true);
      const [meResponse, historyResponse] = await Promise.all([fetchMe(idToken), fetchHistory(idToken)]);
      setMe(meResponse);
      setHistory(historyResponse);
      setErrorMessage(null);
    } catch (error) {
      console.error(error);
      setErrorMessage('データの取得に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setFetching(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (idToken) {
      void loadData();
    } else {
      setMe(null);
      setHistory(null);
    }
  }, [idToken, loadData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head>
        <title>LIFE｜プリペイド画像生成</title>
      </Head>
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="grid gap-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white shadow-xl md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <h1 className="text-3xl font-bold md:text-4xl">LIFE 画像生成プリペイド</h1>
            <p className="text-slate-200">
              Firebase Auth でログインし、Stripe決済でクレジットを購入。EternalAIの画像生成を安心してご利用いただけます。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/generate"
                className="rounded-full bg-primary-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-400"
              >
                画像生成をはじめる
              </Link>
              <Link
                href="/purchase"
                className="rounded-full border border-white/40 px-6 py-3 font-semibold text-white/90 transition hover:bg-white/10"
              >
                クレジットを購入
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-sm text-slate-100">
            <h2 className="text-lg font-semibold text-white">現在のステータス</h2>
            <ul className="mt-4 space-y-3">
              <li>
                ログイン状態：{' '}
                {loading ? '確認中...' : user ? `${user.email ?? 'アカウント'}` : '未ログイン'}
              </li>
              <li>
                クレジット残高：{' '}
                {me ? `${me.credits} クレジット` : idToken ? '取得中...' : 'ログインすると表示されます'}
              </li>
              <li>決済方法：Stripe Checkout（クレジットカード先払い）</li>
              <li>画像生成：EternalAI（1生成あたり1クレジット消費）</li>
            </ul>
            {!user && !loading && (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="mt-6 w-full rounded-full bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-100"
              >
                Googleでログイン
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">購入履歴</h2>
              <button
                type="button"
                onClick={loadData}
                disabled={!idToken || fetching}
                className="text-sm text-primary-500 hover:underline disabled:opacity-50"
              >
                更新
              </button>
            </div>
            {errorMessage && <p className="mt-3 text-sm text-rose-500">{errorMessage}</p>}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2">日時</th>
                    <th className="py-2">Price ID</th>
                    <th className="py-2">クレジット</th>
                    <th className="py-2">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.charges?.length ? (
                    history.charges.map((charge) => (
                      <tr key={charge.id} className="border-b last:border-b-0">
                        <td className="py-2">{formatDate(charge.created_at)}</td>
                        <td className="py-2">{charge.price_id ?? '-'}</td>
                        <td className="py-2">+{charge.credits_added}</td>
                        <td className="py-2">¥{charge.amount_total_jpy.toLocaleString()} {charge.currency.toUpperCase()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-center text-slate-400" colSpan={4}>
                        {idToken ? '購入履歴がありません。' : 'ログインすると購入履歴が表示されます。'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
            <h2 className="text-lg font-semibold">消費履歴</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2">日時</th>
                    <th className="py-2">区分</th>
                    <th className="py-2">クレジット</th>
                    <th className="py-2">リクエストID</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.consumptions?.length ? (
                    history.consumptions.map((consumption) => (
                      <tr key={consumption.id} className="border-b last:border-b-0">
                        <td className="py-2">{formatDate(consumption.created_at)}</td>
                        <td className="py-2">{consumption.refunded ? '返却' : consumption.reason ?? '-'}</td>
                        <td className="py-2">{consumption.credits_used}</td>
                        <td className="py-2 text-xs">{consumption.request_id ?? '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-4 text-center text-slate-400" colSpan={4}>
                        {idToken ? '消費履歴がありません。' : 'ログインすると消費履歴が表示されます。'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">ご利用の流れ</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Googleでログイン（Firebase Auth）</li>
            <li>クレジットを購入（Stripe Checkout）</li>
            <li>画像生成ページで1リクエストにつき1クレジットを消費</li>
            <li>結果をダウンロード。失敗時は自動的にクレジットが返却されます</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ja-JP', { hour12: false });
}
