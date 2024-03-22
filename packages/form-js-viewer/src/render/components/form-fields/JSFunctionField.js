import Sandbox from 'websandbox';
import { useEffect, useState } from 'preact/hooks';
import { useExpressionEvaluation, useDeepCompareMemoize, usePrevious } from '../../hooks';
import { isObject } from 'min-dash';
import { v4 as uuidv4 } from 'uuid';

export function JSFunctionField(props) {
  const { field, onChange } = props;
  const { jsFunction, functionParameters } = field;

  const [ sandbox, setSandbox ] = useState(null);
  const [ iframeContainerId ] = useState(`fjs-sandbox-iframe-container_${uuidv4()}`);
  const [ hasLoaded , setHasLoaded ] = useState(false);

  const paramsEval = useExpressionEvaluation(functionParameters);
  const params = useDeepCompareMemoize(isObject(paramsEval) ? paramsEval : {});

  // setup the sandbox
  useEffect(() => {
    const hostAPI = {
      setValue: function(value) {
        if (isValidData(value)) {
          onChange({ field, value });
        }
      }
    };

    const _sandbox = Sandbox.create(hostAPI, {
      frameContainer: `#${iframeContainerId}`,
      frameClassName: 'fjs-sandbox-iframe'
    });

    const wrappedUserCode = `
      const dataCallbacks = [];
      const loadCallbacks = [];

      const api = {
        onData: (callback) => datacallbacks.push(callback),
        offData: (callback) => dataCallbacks.splice(dataCallbacks.indexOf(callback), 1),
        onLoad: (callback) => loadCallbacks.push(callback),
        offLoad: (callback) => loadCallbacks.splice(loadCallbacks.indexOf(callback), 1),
      }

      const onData = (callback) => {
        dataCallbacks.push(callback);
      }

      const offData = (callback) => {
        dataCallbacks.splice(dataCallbacks.indexOf(callback), 1);
      }

      Websandbox.connection.setLocalApi({
        sendData: ({data}) => dataCallbacks.forEach(callback => callback(data)),
        load: ({data}) => loadCallbacks.forEach(callback => callback(data))
      });

      const setValue = (value) => {
        Websandbox.connection.remote.setValue(value);
      }

      // Custom user code
      try {
        ${jsFunction}
      }
      catch (e) {
        setValue(null);
      }
    `;

    _sandbox.promise.then((sandboxInstance) => {
      setSandbox(sandboxInstance);
      sandboxInstance
        .run(wrappedUserCode)
        .then(() => setHasLoaded(false))
        .catch(() => { onChange({ field, value: null }); });
    });

    return () => {
      _sandbox.destroy();
    };

  }, [ iframeContainerId, jsFunction, onChange, field, functionParameters ]);

  const prevParams = usePrevious(params);
  const prevSandbox = usePrevious(sandbox);

  // make calls to the sandbox
  useEffect(() => {
    const hasChanged = prevParams !== params || prevSandbox !== sandbox;
    const hasConnection = sandbox && sandbox.connection && sandbox.connection.remote.onData;

    if (hasChanged && hasConnection) {

      if (!hasLoaded) {
        setHasLoaded(true);
        const loadResult = sandbox.connection.remote.onLoad();

        if (isValidData(loadResult)) {
          onChange({ field, value: loadResult });
        }
      }

      sandbox.connection.remote.onData(params);
      const dataResult = sandbox.connection.remote.onData();

      if (isValidData(dataResult)) {
        onChange({ field, value: dataResult });
      }

    }
  }, [ params, sandbox, hasLoaded, prevParams, prevSandbox, onChange, field ]);

  return (
    <div id={ iframeContainerId } className="fjs-sandbox-iframe-container"></div>
  );
}

JSFunctionField.config = {
  type: 'script',
  label: 'JS Function',
  group: 'basic-input',
  keyed: true,
  escapeGridRender: true,
  create: (options = {}) => ({
    jsFunction: 'onData((data) => setValue(data.value))',
    functionParameters: '={\n  value: 42\n}',
    ...options,
  })
};

const isValidData = (data) => [ 'object', 'boolean', 'number', 'string' ].includes(typeof data);