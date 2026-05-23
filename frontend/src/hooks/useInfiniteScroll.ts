import { useEffect, useRef, RefObject } from 'react';

interface UseInfiniteScrollOptions {
  /** Bloquea el observer durante la carga inicial de la página. */
  loading: boolean;
  /** Indica si ya hay una carga de "ver más" en curso. */
  loadingMore: boolean;
  /** Callback que se dispara cuando el trigger entra en el viewport. */
  onLoadMore: () => void;
  /** Fracción del elemento visible para disparar el callback. Default: 0.1 */
  threshold?: number;
}

/**
 * Observa un elemento trigger con IntersectionObserver y dispara `onLoadMore`
 * cuando entra en el viewport.
 *
 * Los valores de `loadingMore` y `onLoadMore` se sincronizan mediante refs
 * para evitar closures obsoletos: el observer siempre lee el valor actual sin
 * necesitar recrearse en cada cambio de estado. Esto elimina la race condition
 * que causaba llamadas dobles en móvil (el observer puede dispararse varias veces
 * antes de que React procese el setState del render previo).
 */
export function useInfiniteScroll(
  triggerRef: RefObject<HTMLDivElement | null>,
  options: UseInfiniteScrollOptions,
): void {
  const { loading, loadingMore, onLoadMore, threshold = 0.1 } = options;

  // Refs sincronizadas en cada render — siempre actuales dentro del observer
  const loadingMoreRef = useRef(loadingMore);
  const onLoadMoreRef  = useRef(onLoadMore);
  loadingMoreRef.current = loadingMore;
  onLoadMoreRef.current  = onLoadMore;

  useEffect(() => {
    // No observar durante la carga inicial
    if (loading) return;

    const target = triggerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Leer el ref — nunca un closure obsoleto
        if (entries[0].isIntersecting && !loadingMoreRef.current) {
          onLoadMoreRef.current();
        }
      },
      { threshold },
    );

    observer.observe(target);
    return () => observer.disconnect();

    // loadingMore y onLoadMore se acceden vía refs, no hacen falta en deps.
    // El observer se recrea solo cuando cambia `loading` (inicio/fin de carga inicial).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, threshold]);
}
