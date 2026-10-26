import { useEffect, useState } from 'react';
export default function FormFeedback() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const invalid = (event) => {
      if (event.target.classList.contains('select-validation')) return;
      event.preventDefault();
      const field = event.target;
      const first = field.form?.querySelector('input:invalid, textarea:invalid, select:invalid');
      if (first && first !== field) return;
      const title =
        field.labels?.[0]?.textContent?.trim() ||
        field.getAttribute('aria-label') ||
        field.name ||
        'This field';
      setMessage(
        field.validity.valueMissing
          ? `${title} is required.`
          : field.validity.typeMismatch
            ? `Please enter a valid ${field.type === 'email' ? 'email address' : title.toLowerCase()}.`
            : field.validationMessage || `Please check ${title.toLowerCase()}.`,
      );
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    };
    const input = (event) => {
      if (event.target.validity?.valid) {
        event.target.removeAttribute('aria-invalid');
        setMessage('');
      }
    };
    document.addEventListener('invalid', invalid, true);
    document.addEventListener('input', input, true);
    return () => {
      document.removeEventListener('invalid', invalid, true);
      document.removeEventListener('input', input, true);
    };
  }, []);
  return message ? (
    <div className="form-feedback" role="alert">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss validation message" onClick={() => setMessage('')}>
        Dismiss
      </button>
    </div>
  ) : null;
}
