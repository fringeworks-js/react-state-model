import { useEffect } from 'react';
import _warn from './_warn';

/**
 * 派生モデルの上流が、最初の描画のものから変わったら開発時に警告する hook\
 * 派生モデルは最初の描画の上流につないだまま作り直さない
 *
 * @param source 今回の描画で渡された上流
 * @param initialSource 派生モデルを作ったときの上流
 */
export default function useWarnIfSourceChanged(
  source: object,
  initialSource: object,
): void {
  useEffect(() => {
    if (source !== initialSource) {
      _warn(
        'The source of a derived model changed after the first render. The derived model stays connected to the first source. Change the key to create it again.',
      );
    }
  }, [source, initialSource]);
}
