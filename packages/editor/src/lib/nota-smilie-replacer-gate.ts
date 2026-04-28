/** Module gate so TipTap input rules can read the preference without extension churn. */
let notaSmilieReplacerEnabledFlag = true;

export function setNotaSmilieReplacerEnabled(value: boolean): void {
  notaSmilieReplacerEnabledFlag = value;
}

export function notaSmilieReplacerEnabled(): boolean {
  return notaSmilieReplacerEnabledFlag;
}
