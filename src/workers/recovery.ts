import { runRecovery, type RecoveryRequest } from '../lib/RecoveryRunner';

self.onmessage = (event: MessageEvent<RecoveryRequest>) => {
  try {
    const result = runRecovery(event.data, frames => self.postMessage({ type: 'frames', frames }));
    self.postMessage({ type: 'complete', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Recovery failed.' });
  }
};
