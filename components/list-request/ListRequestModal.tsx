'use client';

import { useState, type ReactNode } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ListRequestForm } from '@/components/list-request/ListRequestForm';

export interface ListRequestContent {
  title: string;
  text: string;
  successTitle: string;
  successText: string;
}

/** A button that opens the "List Your Car" request form in a modal. */
export function ListYourCarButton({
  label,
  content,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  onOpen,
}: {
  label: string;
  content: ListRequestContent;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  icon?: ReactNode;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Remount the form every time the modal opens so the success screen is fresh.
  const [session, setSession] = useState(0);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          setSession((n) => n + 1);
          setOpen(true);
          onOpen?.();
        }}
      >
        {icon}
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={content.title} description={content.text} size="md">
        <ListRequestForm
          key={session}
          successTitle={content.successTitle}
          successText={content.successText}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
