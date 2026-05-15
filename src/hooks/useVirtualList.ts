// @ts-nocheck
/**
 * useVirtualList — lightweight windowing hook (zero external dependencies).
 *
 * ISSUE #70: Data list in SignUp lacks windowing/virtualization for large datasets.
 *
 * Problem: ConnectWalletModal (rendered by SignUp) iterates the full
 * `availableWallets` array unconditionally via `.map()`. As EIP-6963 adoption
 * grows, browsers inject many wallet providers, making the list unbounded.
 * Rendering every item causes layout thrash and slow paints.
 *
 * Solution: This hook implements a "spacer" virtual-scroll strategy:
 *  - Only items that fall within the current viewport (plus an overscan
 *    buffer) are rendered as real DOM nodes.
 *  - A top spacer div reserves the height of all items scrolled past.
 *  - A bottom spacer div reserves the height of all items not yet reached.
 *  - Together the spacers keep the scrollbar accurate without rendering
 *    every item.
 *
 * @example
 *   const { scrollRef, virtualItems, topPadding, bottomPadding } = useVirtualList({
 *     items: filteredWallets,
 *     itemHeight: WALLET_ROW_HEIGHT,
 *   });
 *
 *   <div ref={scrollRef} style={{ maxHeight: 320, overflowY: 'auto' }}>
 *     <div style={{ height: topPadding }} aria-hidden="true" />
 *     {virtualItems.map(({ item, index }) => <Row key={index} data={item} />)}
 *     <div style={{ height: bottomPadding }} aria-hidden="true" />
 *   </div>
 *
 * Limitations:
 *  - Assumes all items share an approximately uniform height (`itemHeight`).
 *  - For highly variable item heights prefer @tanstack/react-virtual.
 *
 * Issue #30 (Checkout flow / virtual lists): Pagination/windowing broke when transitioning
 * to an invalid range — e.g. `viewportHeight === 0` before ResizeObserver runs, or a large
 * `scrollTop` after the filtered item count shrinks so `firstIndex` > `lastIndex`. Consumers
 * then rendered zero rows despite `itemCount > 0`. We clamp `firstIndex`/`lastIndex` to a
 * valid inclusive range before computing paddings.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Pure helper — all virtualisation arithmetic lives here so it can be unit-tested
 * without a DOM or React renderer.
 *
 * @param {Object} opts
 * @param {number} opts.scrollTop      Current scroll offset of the container (px).
 * @param {number} opts.viewportHeight Visible height of the container (px).
 * @param {number} opts.itemHeight     Estimated height of one row (px).
 * @param {number} opts.overscan       Extra rows to render above and below viewport.
 * @param {number} opts.itemCount      Total number of items in the list.
 * @returns {{ firstIndex, lastIndex, topPadding, bottomPadding, totalHeight }}
 */
export function calculateVirtualWindow({ scrollTop, viewportHeight, itemHeight, overscan, itemCount }) {
  if (itemCount === 0) {
    return { firstIndex: 0, lastIndex: -1, topPadding: 0, bottomPadding: 0, totalHeight: 0 };
  }

  const maxIndex = itemCount - 1;
  const safeScroll = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  const safeViewport = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;

  let firstIndex = Math.max(0, Math.floor(safeScroll / itemHeight) - overscan);
  let lastIndex = Math.min(
    maxIndex,
    Math.ceil((safeScroll + safeViewport) / itemHeight) + overscan,
  );

  // Issue #30: invalid window (e.g. viewport not measured yet, or list shrank under scroll)
  if (firstIndex > lastIndex) {
    firstIndex = Math.min(firstIndex, maxIndex);
    lastIndex = Math.min(maxIndex, Math.max(firstIndex, lastIndex));
    firstIndex = Math.min(firstIndex, lastIndex);
  }

  return {
    firstIndex,
    lastIndex,
    topPadding: firstIndex * itemHeight,
    bottomPadding: Math.max(0, (itemCount - (lastIndex + 1)) * itemHeight),
    totalHeight: itemCount * itemHeight,
  };
}

/**
 * @typedef {Object} VirtualItem
 * @property {*}      item  - The original item from the `items` array.
 * @property {number} index - Absolute index within the full (unsliced) list.
 */

/**
 * @typedef {Object} VirtualListResult
 * @property {React.RefObject} scrollRef    - Attach to the scroll container element.
 * @property {VirtualItem[]}   virtualItems - Items that should be rendered right now.
 * @property {number}          topPadding   - Height (px) of the top spacer div.
 * @property {number}          bottomPadding - Height (px) of the bottom spacer div.
 * @property {number}          totalHeight  - Total height of all items (px).
 */

/**
 * @param {Object}  opts
 * @param {Array}   opts.items       - Complete list of items to virtualise.
 * @param {number}  opts.itemHeight  - Estimated height of one item row (px).
 * @param {number}  [opts.overscan=3] - Extra items to render above/below viewport.
 * @returns {VirtualListResult}
 */
export function useVirtualList({ items, itemHeight, overscan = 3 }) {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    setViewportHeight(el.clientHeight);
    el.addEventListener('scroll', handleScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      if (scrollRef.current) {
        setViewportHeight(scrollRef.current.clientHeight);
      }
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [handleScroll]);

  const { firstIndex, lastIndex, topPadding, bottomPadding, totalHeight } =
    calculateVirtualWindow({ scrollTop, viewportHeight, itemHeight, overscan, itemCount: items.length });

  const virtualItems = items.slice(firstIndex, lastIndex + 1).map((item, i) => ({
    item,
    index: firstIndex + i,
  }));

  return { scrollRef, virtualItems, topPadding, bottomPadding, totalHeight };
}
