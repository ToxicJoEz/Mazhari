import FormFeedback from '../components/FormFeedback';
import { useState, useMemo } from 'react';
import { DialogContext } from './dialog';
import { Modal } from '../components/UI';
function DialogBody({ request, finish }) {
  const [value, setValue] = useState(request.defaultValue || '');
  return (
    <Modal
      title={request.title || (request.kind === 'prompt' ? 'Add a reason' : 'Confirm change')}
      onClose={() => finish(request.kind === 'prompt' ? null : false)}
      className="confirm-modal"
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          finish(request.kind === 'prompt' ? value.trim() : true);
        }}
      >
        <p>{request.message}</p>
        {request.kind === 'prompt' && (
          <label>
            {request.inputLabel || 'Reason'}
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
              maxLength={300}
              rows={3}
            />
          </label>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => finish(request.kind === 'prompt' ? null : false)}
          >
            {request.cancelLabel || 'Keep unchanged'}
          </button>
          <button
            className={'btn ' + (request.tone === 'danger' ? 'danger-button' : '')}
            disabled={request.kind === 'prompt' && !value.trim()}
          >
            {request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function DialogProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const api = useMemo(() => {
    const ask = (kind) => (options) =>
      new Promise((resolve) =>
        setQueue((previous) => [
          ...previous,
          {
            ...(typeof options === 'string' ? { message: options } : options),
            kind,
            resolve,
            id: crypto.randomUUID(),
          },
        ]),
      );
    return { confirm: ask('confirm'), prompt: ask('prompt') };
  }, []);
  function finish(value) {
    queue[0].resolve(value);
    setQueue((previous) => previous.slice(1));
  }
  return (
    <DialogContext.Provider value={api}>
      {children}
      <FormFeedback />
      {queue[0] && <DialogBody key={queue[0].id} request={queue[0]} finish={finish} />}
    </DialogContext.Provider>
  );
}
