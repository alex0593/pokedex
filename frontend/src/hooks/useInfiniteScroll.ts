import { useEffect, RefObject } from 'react';

interface UseInfiniteScrollOptions {
  /** Bloquea el observer durante la carga inicial de la página. */
  loading: boolean;
  /** Bloquea el observer cuando ya hay una carga de "ver más" en curso. */
  loadingMore: boolean;
  /** Callback que se dispara cuando el trigger entra en el viewport. */
  onLoadMore: () => void;
  /** Fracción del elemento visible para disparar el callback. Default: 0.1 */
  threshold?: number;
}

/**
 * Observa un elemento trigger con IntersectionObserver y dispara `onLoadMore`
 * cuando entra en el viewport. Reemplaza el patrón duplicado en las 5 páginas
 * de catálogo (pokemon, items, berries, abilities, moves).
 *
 * Uso:
 *   const triggerRef = useRef<HTMLDivElement>(null);
 *   useInfiniteScroll(triggerRef, { loading, loadingMore, onLoadMore: loadMore });
 *   <div ref={triggerRef} />
 */
export function useInfiniteScroll(
  triggerRef: RefObject<HTMLDivElement | null>,
  options: UseInfiniteScrollOptions,
): void {
  const { loading, loadingMore, onLoadMore, threshold = 0.1 } = options;

  useEffect(() => {
    // No observar durante la carga inicial o cuando ya hay una carga en curso
    if (loading) return;

    const target = triggerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold },
    );

    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, onLoadMore]);
}
