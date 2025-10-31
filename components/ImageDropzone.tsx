import { useCallback, useRef } from 'react';
import clsx from 'clsx';

interface ImageDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  fileName?: string;
}

export function ImageDropzone({ onFileSelected, disabled, fileName }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (disabled) return;
      const file = event.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onFileSelected(file);
      }
    },
    [disabled, onFileSelected]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary-400 bg-slate-900/40 p-10 text-center transition hover:border-primary-300 hover:bg-slate-900/60',
        disabled && 'opacity-60'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-primary-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 15a4 4 0 01.88-2.5m0 0a4 4 0 016.59-.9L12 12l1.53-1.4a4 4 0 016.59.9 4 4 0 01.88 2.5M12 12l-3 3m3-3l3 3m-3-3v9"
        />
      </svg>
      <div className="space-y-1">
        <p className="text-lg font-semibold">画像を選択またはここにドロップ</p>
        <p className="text-sm text-slate-300">JPG / PNG / WebP ・長辺 4096px 以内</p>
        {fileName && <p className="text-sm text-primary-200">選択中: {fileName}</p>}
      </div>
      <button
        type="button"
        className="mt-4 rounded-full bg-primary-500 px-6 py-2 font-semibold text-white shadow-md hover:bg-primary-400"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        ファイルを選択
      </button>
    </label>
  );
}
