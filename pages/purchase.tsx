import { useCallback, useState } from 'react';
import Head from 'next/head';

import { useAuth } from '@/contexts/AuthContext';
import { createCheckoutSession, ApiError } from '@/lib/api';

const CREDIT_PACKS = [
  { priceId: 'price_2', credits: 2, amount: 1000 },
  { priceId: 'price_10', credits: 10, amount: 4000 },
  { priceId: 'price_50', credits: 50, amount: 15000 }
];

export default function PurchasePage() {
  const { user, idToken, loading, signInWithGoogle } = useAuth();
  const [selected, setSelected] = useState(CREDIT_PACKS[0].priceId);
  const [purchasing, setPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = useCallback(async () => {
    if (!idToken) {
      setErrorMessage('ログインしてからご利用ください。');
      return;
    }
    try {
      setPurchasing(true);
      setErrorMessage(null);
      const response = await createCheckoutSession(selected, 1, idToken);
      window.location.href = response.url;
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && error.status === 400) {
        setErrorMessage('価格情報の取得に失敗しました。管理者へお問い合わせください。');
      } else {
        setErrorMessage('決済ページの作成に失敗しました。時間をおいて再度お試しください。');
      }
    } finally {
      setPurchasing(false);
    }
  }, [idToken, selected]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Head>
        <title>クレジット購入｜LIFE</title>
      </Head>
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-bold">クレジット購入</h1>
          <p className="text-slate-600">Stripe Checkoutで安全にお支払い。購入後は自動でクレジットが付与されます。</p>
          {!user && !loading && (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-400"
            >
              Googleでログイン
            </button>
          )}
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => {
            const isSelected = pack.priceId === selected;
            return (
              <button
                key={pack.priceId}
                type="button"
                onClick={() => setSelected(pack.priceId)}
                className={`rounded-3xl border p-6 text-left shadow transition ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-900'
                    : 'border-slate-200 bg-white hover:border-primary-200 hover:shadow-lg'
                }`}
              >
                <p className="text-sm text-slate-500">{pack.priceId}</p>
                <p className="mt-2 text-3xl font-bold">{pack.credits} クレジット</p>
                <p className="mt-4 text-lg font-semibold">¥{pack.amount.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">1クレジットあたり ¥{Math.round(pack.amount / pack.credits).toLocaleString()}</p>
              </button>
            );
          })}
        </section>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow">
          <h2 className="text-lg font-semibold">注意事項</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>決済完了後、数秒以内にクレジットが自動付与されます。</li>
            <li>同じイベントの重複課金は防止されており、Stripeダッシュボードから返金が可能です。</li>
            <li>決済に失敗した場合はクレジットは増えません。</li>
          </ul>
          {errorMessage && <p className="mt-4 text-sm text-rose-500">{errorMessage}</p>}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!idToken || purchasing}
            className="mt-6 w-full rounded-full bg-primary-500 px-6 py-3 font-semibold text-white shadow hover:bg-primary-400 disabled:opacity-60"
          >
            Stripe Checkoutへ進む
          </button>
        </div>
      </main>
    </div>
  );
}
