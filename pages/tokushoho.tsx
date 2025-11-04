// pages/tokushoho.tsx
import Head from "next/head";

export default function Tokushoho() {
  return (
    <>
      <Head>
        <title>特定商取引法に基づく表記 | Life</title>
        <meta name="description" content="AI画像編集Webアプリ Life の特定商取引法に基づく表記ページです。" />
      </Head>

      <main className="max-w-3xl mx-auto p-6 text-gray-800">
        <h1 className="text-2xl font-bold mb-6 border-b pb-2">
          特定商取引法に基づく表記
        </h1>

        <table className="w-full border border-gray-300 text-sm">
          <tbody>
            <tr>
              <th className="border p-3 bg-gray-100 text-left w-1/3">販売業者</th>
              <td className="border p-3">請求があった場合には遅滞なく開示いたします。</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">運営統括責任者</th>
              <td className="border p-3">長谷川</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">所在地</th>
              <td className="border p-3">請求があった場合には遅滞なく開示いたします。</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">電話番号</th>
              <td className="border p-3">請求があった場合には遅滞なく開示いたします。</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">メールアドレス</th>
              <td className="border p-3">
                <a href="mailto:s.hasegawa@gmail.com" className="text-blue-600 underline">
                  s.hasegawa@gmail.com
                </a>
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">販売URL</th>
              <td className="border p-3">
                <a
                  href="https://life-six-mu.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  https://life-six-mu.vercel.app/
                </a>
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">販売価格</th>
              <td className="border p-3">各商品・サービスページに記載（すべて税込価格）</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">商品代金以外の必要料金</th>
              <td className="border p-3">
                クレジットカード決済手数料、通信環境によるデータ通信料等
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">支払い方法</th>
              <td className="border p-3">クレジットカード決済（Stripeによる事前決済方式）</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">支払い時期</th>
              <td className="border p-3">ご注文時に即時決済（前払い方式）</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">サービス提供時期</th>
              <td className="border p-3">支払い完了後、即時に画像編集機能を利用可能</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">返品・返金・交換について</th>
              <td className="border p-3">
                デジタルコンテンツの性質上、サービス提供後のキャンセル・返金は受け付けておりません。
                ただし、システム障害など当社起因による不具合が認められた場合は、問い合わせフォームを通じて返金対応を行います。
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">不良品の取扱い</th>
              <td className="border p-3">
                サーバー障害などによりサービスが利用できない場合、確認後に該当分のクレジット返還または再提供を行います。
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">動作環境</th>
              <td className="border p-3">
                最新のGoogle Chrome, Safari, Edge ブラウザに対応。通信環境が安定している必要があります。
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">販売数量の制限</th>
              <td className="border p-3">特になし。利用回数に応じて料金が発生します。</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">表現及び商品に関する注意書き</th>
              <td className="border p-3">
                本サービスはAI技術を利用した画像生成・編集ツールです。
                生成結果の品質・内容については保証いたしかねます。
                倫理・法令に反する利用は禁止されています。
              </td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">年齢制限</th>
              <td className="border p-3">18歳未満の方の利用を禁止します。</td>
            </tr>
            <tr>
              <th className="border p-3 bg-gray-100 text-left">事業者責任範囲</th>
              <td className="border p-3">
                当サービスはEternalAI APIを利用して画像処理を行っており、API提供元の仕様変更・障害により一部機能が利用できない場合があります。
                その場合、当社は責任を負いません。
              </td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs text-gray-500 mt-6">
          ※本ページは特定商取引法および割賦販売法の要件に基づいて作成されています。
        </p>
      </main>
    </>
  );
}
