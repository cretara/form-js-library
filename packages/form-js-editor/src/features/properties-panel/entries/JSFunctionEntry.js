import { FeelEntry, isFeelEntryEdited, TextAreaEntry, isTextAreaEntryEdited } from '@bpmn-io/properties-panel';
import { get } from 'min-dash';

import { useService, useVariables } from '../hooks';

export function JSFunctionEntry(props) {
  const {
    editField,
    field
  } = props;

  const entries = [
    {
      id: 'variable-mappings',
      component: FunctionParameters,
      editField: editField,
      field: field,
      isEdited: isFeelEntryEdited,
      isDefaultVisible: (field) => field.type === 'script'
    },
    {
      id: 'function',
      component: FunctionDefinition,
      editField: editField,
      field: field,
      isEdited: isTextAreaEntryEdited,
      isDefaultVisible: (field) => field.type === 'script'
    }
  ];

  return entries;
}

function FunctionParameters(props) {
  const {
    editField,
    field,
    id
  } = props;

  const debounce = useService('debounce');

  const variables = useVariables().map(name => ({ name }));

  const path = [ 'functionParameters' ];

  const getValue = () => {
    return get(field, path, '');
  };

  const setValue = (value) => {
    return editField(field, path, value || '');
  };

  const tooltip = <div>
    Functions parameters should be described as an object, e.g.:
    <pre><code>{`{
      name: user.name,
      age: user.age
    }`}</code></pre>
  </div>;

  return FeelEntry({
    debounce,
    feel: 'required',
    element: field,
    getValue,
    id,
    label: 'Function parameters',
    tooltip,
    description: 'Define the parameters to pass to the javascript sandbox.',
    setValue,
    variables
  });
}

function FunctionDefinition(props) {
  const {
    editField,
    field,
    id
  } = props;

  const debounce = useService('debounce');

  const path = [ 'jsFunction' ];

  const getValue = () => {
    return get(field, path, '');
  };

  const setValue = (value) => {
    return editField(field, path, value || '');
  };

  return TextAreaEntry({
    debounce,
    element: field,
    getValue,
    description: 'Define the javascript function to execute. Register lifecycle hooks with onLoad({data}) and onData({data}). Use setValue(value) to return the result.',
    id,
    label: 'Javascript code',
    setValue
  });
}
