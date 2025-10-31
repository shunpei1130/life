import { promptChips } from '@/lib/prompts';

interface InstructionChipsProps {
  onAppend: (text: string) => void;
}

export function InstructionChips({ onAppend }: InstructionChipsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {promptChips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onAppend(chip.text)}
          className="rounded-full border border-primary-500/60 bg-slate-800 px-4 py-1 text-sm text-primary-100 transition hover:bg-primary-500/10"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
