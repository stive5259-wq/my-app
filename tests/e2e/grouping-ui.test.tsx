import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

class DataTransferPolyfill {
  private data: Record<string, string> = {};
  setData(type: string, val: string) { this.data[type] = val; }
  getData(type: string) { return this.data[type] || ''; }
}

function anyTiedBadges() {
  return screen.queryAllByText(/^TIED$/i).length > 0;
}

describe('FEAT-008A: UI grouping (no audio)', () => {
  it('Group→Next shows TIED on source and target chord', async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateBtn = await screen.findByRole('button', { name: /generate/i });
    await user.click(generateBtn);
    const groupNextBtn = await screen.findByTestId('group-next-0');
    await user.click(groupNextBtn);
    expect(await screen.findByTestId('tied-0')).toBeTruthy();
    expect(await screen.findByTestId('tied-1')).toBeTruthy();
  });

  it('Group All toggle shows TIED on all chords', async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateBtn = await screen.findByRole('button', { name: /generate/i });
    await user.click(generateBtn);
    const toggle = await screen.findByTestId('group-all-toggle');
    await user.click(toggle);
    const chords = await screen.findAllByTestId('chord');
    for (let i = 0; i < chords.length; i++) {
      expect(await screen.findByTestId(`tied-${i}`)).toBeTruthy();
    }
  });

  it('Reorder resets groupNext[] and clears TIED badges', async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateBtn = await screen.findByRole('button', { name: /generate/i });
    await user.click(generateBtn);
    const groupNextBtn = await screen.findByTestId('group-next-0');
    await user.click(groupNextBtn);
    expect(await screen.findByTestId('tied-0')).toBeTruthy();
    expect(await screen.findByTestId('tied-1')).toBeTruthy();

    const chords = await screen.findAllByTestId('chord');
    const dt = new DataTransferPolyfill();
    fireEvent.dragStart(chords[0], { dataTransfer: dt as unknown as DataTransfer });
    fireEvent.dragOver(chords[2], { dataTransfer: dt as unknown as DataTransfer });
    fireEvent.drop(chords[2], { dataTransfer: dt as unknown as DataTransfer });

    expect(anyTiedBadges()).toBe(false);
  });
});
