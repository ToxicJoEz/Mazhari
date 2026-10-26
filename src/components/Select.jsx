import { Children, isValidElement, useId, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
export default function Select({
  children,
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  className = '',
  id,
  ...props
}) {
  const generated = useId(),
    trigger = useRef(null),
    menu = useRef(null),
    search = useRef({ text: '', at: 0 });
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => ({
      value: String(child.props.value ?? child.props.children),
      label: child.props.children,
      disabled: Boolean(child.props.disabled),
    }));
  const current = String(value ?? defaultValue ?? options[0]?.value ?? '');
  const selected = options.findIndex((option) => option.value === current);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [position, setPosition] = useState({}),
    [invalid, setInvalid] = useState(false);
  const listId = generated + '-list';
  function place() {
    const rect = trigger.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = below < 180 && rect.top > below;
    setPosition({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      maxHeight: Math.max(100, Math.min(280, above ? rect.top - 16 : below)),
      ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }
  function show() {
    if (disabled) return;
    place();
    setActive(Math.max(0, selected));
    setOpen(true);
  }
  function choose(index) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange?.({
      target: { name, value: option.value, type: 'select-one' },
      currentTarget: { name, value: option.value },
    });
    setInvalid(false);
    setOpen(false);
    trigger.current.focus();
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target))
        setOpen(false);
    };
    const reposition = () => place();
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      menu.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  function keyboard(event) {
    const enabled = options
      .map((option, index) => (option.disabled ? -1 : index))
      .filter((index) => index >= 0);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        show();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        choose(active);
        return;
      }
      const at = enabled.indexOf(active);
      setActive(
        event.key === 'Home'
          ? enabled[0]
          : event.key === 'End'
            ? enabled.at(-1)
            : (enabled[
                (at + (event.key === 'ArrowUp' ? -1 : 1) + enabled.length) % enabled.length
              ] ?? active),
      );
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'Tab') setOpen(false);
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const now = Date.now();
      search.current = {
        text: (now - search.current.at < 800 ? search.current.text : '') + event.key.toLowerCase(),
        at: now,
      };
      const index = options.findIndex(
        (option) =>
          !option.disabled && String(option.label).toLowerCase().startsWith(search.current.text),
      );
      if (index >= 0) {
        if (!open) show();
        setActive(index);
      }
    }
  }
  return (
    <div className={'custom-select ' + className}>
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      {required && (
        <input
          className="select-validation"
          aria-hidden="true"
          tabIndex={-1}
          onFocus={() => trigger.current?.focus()}
          required
          disabled={disabled}
          value={current}
          onChange={() => {}}
          onInvalid={(event) => {
            event.preventDefault();
            const first = event.target.form?.querySelector(
              'input:invalid, textarea:invalid, select:invalid',
            );
            if (first && first !== event.target) return;
            setInvalid(true);
            show();
            trigger.current.focus();
          }}
        />
      )}
      <button
        {...props}
        id={id || generated}
        ref={trigger}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-activedescendant={open ? listId + '-' + active : undefined}
        aria-label={props['aria-label'] || name?.replace(/([A-Z])/g, ' $1')}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className="select-trigger"
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={keyboard}
      >
        <span>{options[selected]?.label ?? (current || 'Choose an option')}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {invalid && (
        <span className="error small" role="alert">
          Please choose an option.
        </span>
      )}
      {open &&
        createPortal(
          <div
            ref={menu}
            className="select-menu"
            style={position}
            role="listbox"
            id={listId}
            aria-labelledby={id || generated}
          >
            {options.map((option, index) => (
              <button
                type="button"
                tabIndex={-1}
                id={listId + '-' + index}
                key={option.value}
                role="option"
                aria-selected={current === option.value}
                aria-disabled={option.disabled}
                data-active={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
                disabled={option.disabled}
              >
                <span>{option.label}</span>
                {current === option.value && <Check size={15} aria-hidden="true" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
