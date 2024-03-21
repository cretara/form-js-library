import Sandbox from 'websandbox';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { useExpressionEvaluation, useDeepCompareMemoize } from '../../hooks';
import { isObject } from 'min-dash';


export function JSFunctionField(props) {
  const { field, onChange } = props;
  const { jsFunction, functionParameters } = field;

  const [ sandbox, setSandbox ] = useState(null);

  const paramsEval = useExpressionEvaluation(functionParameters);
  const params = useDeepCompareMemoize(isObject(paramsEval) ? paramsEval : {});

  const rebuildSandbox = useCallback(() => {
    const localApi = {
      setValue: function(value) {
        onChange({ field, value });
      }
    };

    const newSandbox = Sandbox.create(localApi, {
      frameContainer: '.iframe__container',
      frameClassName: 'simple__iframe'
    });

    newSandbox.promise.then((sandboxInstance) => {
      setSandbox(sandboxInstance);
      sandboxInstance.run(`
        Websandbox.connection.setLocalApi({
          onInit: () => Websandbox.connection.remote.onInit(),
          onData: (data) => Websandbox.connection.remote.onData(data),
        });

        // Custom user code
        ${jsFunction}
      `);

      sandboxInstance.connection.remote.onInit();
    });
  }, [ jsFunction, onChange, field ]);

  useEffect(() => {
    rebuildSandbox();
  }, [ rebuildSandbox ]);

  useEffect(() => {
    if (sandbox && sandbox.connection && sandbox.connection.remote.onData) {
      sandbox.connection.remote.onData(params);
    }
  }, [ params, sandbox ]);

  return null;
}

JSFunctionField.config = {
  type: 'script',
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
