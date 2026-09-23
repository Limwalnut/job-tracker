import type { PointerEvent as ReactPointerEvent } from 'react';

export function isDialogBackdropPointer(
  event: ReactPointerEvent<HTMLDialogElement>,
) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientX < bounds.left
    || event.clientX > bounds.right
    || event.clientY < bounds.top
    || event.clientY > bounds.bottom;
}
