import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('FEAT-009: Loop UI', () => {
  it('enables loop and sets range', async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateBtn = await screen.findByRole('button', { name: /generate/i });
    await user.click(generateBtn);
    const loopToggle = await screen.findByTestId('loop-toggle');
    await user.click(loopToggle);
    const from = (await screen.findByTestId('loop-from')) as HTMLInputElement;
    const to = (await screen.findByTestId('loop-to')) as HTMLInputElement;
    await user.clear(from);
    await user.type(from, '1');
    await user.clear(to);
    await user.type(to, '3');
    const range = await screen.findByTestId('loop-range');
    expect(range.textContent).toMatch(/1→3/);
  });
});
