interface ResultActionsProps {
  imageUrl: string;
  onReedit: () => void;
  onReset: () => void;
}

function downloadImage(imageUrl: string, format: 'png' | 'jpeg') {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `eternalai-edit.${format}`;
  link.click();
}

async function copyToClipboard(imageUrl: string) {
  if (!navigator.clipboard || !window.fetch || typeof ClipboardItem === 'undefined') {
    alert('お使いのブラウザではクリップボードコピーに対応していません。');
    return;
  }

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
  } catch (error) {
    console.error(error);
    alert('コピーに失敗しました。ダウンロードをご利用ください。');
  }
}

export function ResultActions({ imageUrl, onReedit, onReset }: ResultActionsProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => downloadImage(imageUrl, 'png')}
        className="rounded-full bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-400"
      >
        PNGでダウンロード
      </button>
      <button
        type="button"
        onClick={() => downloadImage(imageUrl, 'jpeg')}
        className="rounded-full border border-primary-400 px-5 py-2 text-sm font-semibold text-primary-100 hover:bg-primary-500/10"
      >
        JPEGでダウンロード
      </button>
      <button
        type="button"
        onClick={() => copyToClipboard(imageUrl)}
        className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
      >
        クリップボードにコピー
      </button>
      <button
        type="button"
        onClick={onReedit}
        className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
      >
        再編集
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
      >
        やり直す
      </button>
    </div>
  );
}
