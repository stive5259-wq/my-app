import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

describe('FEAT-007: Export MIDI button', () => {
  it('triggers a MIDI download when clicked', async () => {
    const user = userEvent.setup();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const createMock = vi.fn().mockReturnValue('blob://test');
    const revokeMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeMock,
    });

    render(<App />);

    const generateButton = await screen.findByRole('button', { name: /generate/i });
    await user.click(generateButton);

    const exportButton = await screen.findByTestId('export-midi');
    expect((exportButton as HTMLButtonElement).disabled).toBe(false);
    await user.click(exportButton);

    expect(createMock).toHaveBeenCalledTimes(1);
    const blobArg = createMock.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect((blobArg as Blob).type).toBe('audio/midi');

    expect(revokeMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreate,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevoke,
    });
  });
});
