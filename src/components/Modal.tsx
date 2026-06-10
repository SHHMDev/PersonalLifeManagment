import { PropsWithChildren, useEffect, ReactNode } from 'react';
import { Button } from '@/components/Button';

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
  footer?: ReactNode;
}>;

export function Modal({ open, title, onClose, footer = null, children }: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div aria-modal="true" className="modal-sheet" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <Button aria-label="بستن" onClick={onClose} type="button" variant="secondary">
            بستن
          </Button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
