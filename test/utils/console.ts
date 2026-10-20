// console.error escape hatch (plan P13). test/setup.ts fails any test that calls console.error
// unless the test called allowConsoleError() first. Use only for deliberately triggered React errors
// (for example an asChild throw rendered inside an error boundary) and comment each use.

let allowed = false;

export function allowConsoleError(): void {
  allowed = true;
}

export function isConsoleErrorAllowed(): boolean {
  return allowed;
}

export function resetConsoleErrorAllowance(): void {
  allowed = false;
}
