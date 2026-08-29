import { useEffect, useRef } from "react";
import {
  clearKeyboardInset,
  measureKeyboardInset,
  restoreDocumentViewport,
  subscribeVisualViewport,
  syncKeyboardInset
} from "../lib/viewport";

/** 把软键盘占用写成 CSS 变量，并在键盘收起后把被顶走的页面拉回。 */
export function useKeyboardInset() {
  const previousInsetRef = useRef(0);

  useEffect(() => {
    const sync = () => {
      const inset = measureKeyboardInset();
      const previous = previousInsetRef.current;
      previousInsetRef.current = inset;
      syncKeyboardInset(inset);
      if (previous > 40 && inset < 8) restoreDocumentViewport();
    };
    sync();
    const unsubscribe = subscribeVisualViewport(sync);
    return () => {
      unsubscribe();
      clearKeyboardInset();
      restoreDocumentViewport();
    };
  }, []);
}
