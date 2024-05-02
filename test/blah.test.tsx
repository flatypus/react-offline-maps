import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { OfflineMap } from '../src';

describe('it', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<OfflineMap />, div);
    ReactDOM.unmountComponentAtNode(div);
  });
});
