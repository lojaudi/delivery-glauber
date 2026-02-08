/**
 * Legacy hook - demo mode has been removed.
 * This file exists only for backwards compatibility.
 */
export function useDemoGuard() {
  return {
    isDemoUser: false,
    canWrite: true,
    guardAction: <T extends (...args: any[]) => any>(fn: T): T => fn,
    checkDemoMode: () => false,
  };
}