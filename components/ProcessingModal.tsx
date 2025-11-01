import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';

const tips = [
  '画像を生成中です（通常 30秒–3分 ほどで完了します）。',
  'コツ：シンプルに指示をするとよいです。',
  'Tip：色変更や背景差し替えは具体的な単語が効果的です。'
];

interface ProcessingModalProps {
  open: boolean;
  onCancel?: () => void;
}

export function ProcessingModal({ open, onCancel }: ProcessingModalProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [open]);

  const message = useMemo(() => tips[tipIndex], [tipIndex]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => onCancel?.()}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-2xl">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-12 w-12 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500/60" />
                    <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-6 w-6"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M12 6v6l3 3"
                        />
                      </svg>
                    </span>
                  </span>
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-white">画像を生成中です…</Dialog.Title>
                    <p className="text-sm text-slate-300">通常は 30秒–3分 程度で完了します。</p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl bg-slate-800/70 p-4">
                  <p className="text-sm leading-relaxed text-slate-200">{message}</p>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full border border-slate-500 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    キャンセル
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
