import { useCallback, useEffect, useState } from 'preact/hooks';
import { useExpressionEvaluation, useDeepCompareMemoize, usePrevious } from '../../hooks';
import { isObject } from 'min-dash';

const type = 'script';

export function JSFunctionField(props) {
  const { field, onChange } = props;
  const { jsFunction, functionParameters, onLoadOnly } = field;

  const [ loadLatch, setLoadLatch ] = useState(false);

  const paramsEval = useExpressionEvaluation(functionParameters);
  const params = useDeepCompareMemoize(isObject(paramsEval) ? paramsEval : {});

  const functionMemo = useCallback((params) => {

    const cleanupCallbacks = [];

    try {

      setLoadLatch(true);
      const func = new Function('data', 'setValue', 'onCleanup', jsFunction);
      func(params, value => onChange({ field, value }), callback => cleanupCallbacks.push(callback));

    } catch (error) {

      // invalid expression definition, may happen during editing
      if (error instanceof SyntaxError) {
        return;
      }

      console.error('Error evaluating expression:', error);
      onChange({ field, value: null });
    }

    return () => {
      cleanupCallbacks.forEach(fn => fn());
    };

  }, [ jsFunction, field, onChange ]);

  const previousFunctionMemo = usePrevious(functionMemo);
  const previousParams = usePrevious(params);

  useEffect(() => {

    // reset load latch
    if (!onLoadOnly && loadLatch) {
      setLoadLatch(false);
    }

    const functionChanged = previousFunctionMemo !== functionMemo;
    const paramsChanged = previousParams !== params;
    const alreadyLoaded = onLoadOnly && loadLatch;

    const shouldExecute = functionChanged || paramsChanged && !alreadyLoaded;

    if (shouldExecute) {
      return functionMemo(params);
    }

  }, [ previousFunctionMemo, functionMemo, previousParams, params, loadLatch, onLoadOnly ]);

  return null;
}

JSFunctionField.config = {
  type,
  label: 'JS Function',
  group: 'basic-input',
  keyed: true,
  escapeGridRender: true,
  create: (options = {}) => ({
    jsFunction: 'setValue(data.value)',
    functionParameters: '={\n  value: 42\n}',
    ...options,
  })
};
