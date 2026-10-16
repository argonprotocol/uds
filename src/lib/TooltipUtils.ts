import emitter from '../emitters/basic';

export function showTooltip(event: MouseEvent | FocusEvent, label: string, options: { wrap?: boolean } = {}) {
  event.stopPropagation();
  event.preventDefault();
  const targetElem = event.currentTarget as HTMLElement;
  if (!targetElem) return;

  const targetRect = targetElem.getBoundingClientRect();
  
  let x = 0;
  let y = 0;
  let width: number | null = null;

  let arrowX = 0;
  let arrowY = 0;

  x = targetRect.left + targetRect.width;
  y = targetRect.top + targetRect.height;
  arrowX = targetRect.width / 2;
    
  emitter.emit('showTooltip', { x, y, width, arrowX, arrowY, label, wrap: options.wrap ?? false});
}

export function hideTooltip() {
  emitter.emit('hideTooltip');
}
