const bannedWords = ['禁止語'];

export function validatePrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (trimmed.length < 8) {
    return '指示は8文字以上で入力してください。';
  }

  if (trimmed.length > 2000) {
    return '指示は2,000文字以内で入力してください。';
  }

  const found = bannedWords.find((word) => trimmed.includes(word));
  if (found) {
    return `"${found}"は使用できません。言い換えてください。`;
  }

  return null;
}
