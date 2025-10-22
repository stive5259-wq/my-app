import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('FEAT-006: default startup key/mode = C minor', () => {
  it('shows C minor when Generate is clicked without changing selectors', async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateButton = await screen.findByRole('button', { name: /generate/i });
    await user.click(generateButton);
    const label = await screen.findByText(/c\s*minor/i, { exact: false });
    expect(label).toBeTruthy();
  });
});
