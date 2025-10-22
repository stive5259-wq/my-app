import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

class DataTransferPolyfill implements DataTransfer {
  dropEffect: DataTransfer['dropEffect'] = 'move';
  effectAllowed: DataTransfer['effectAllowed'] = 'all';
  private store: Record<string, string> = {};
  private typesInternal: string[] = [];

  get items(): DataTransferItemList {
    return [] as unknown as DataTransferItemList;
  }

  get files(): FileList {
    return [] as unknown as FileList;
  }

  get types(): ReadonlyArray<string> {
    return this.typesInternal;
  }

  clearData(format?: string | undefined): void {
    if (typeof format === 'string') {
      delete this.store[format];
    } else {
      this.store = {};
    }
    this.typesInternal = Object.keys(this.store);
  }

  getData(format: string): string {
    return this.store[format] ?? '';
  }

  setData(format: string, data: string): void {
    this.store[format] = data;
    this.typesInternal = Object.keys(this.store);
  }

  setDragImage(): void {
    // no-op
  }
}

function getChordLabels(): string[] {
  const chordNodes = screen.getAllByTestId('chord');
  return chordNodes.map((node, index) => {
    const labelEl = within(node).getByTestId(`chord-label-${index}`);
    return labelEl.textContent ?? '';
  });
}

async function generateDefaultProgression() {
  const user = userEvent.setup();
  render(<App />);
  const generateButton = await screen.findByRole('button', { name: /generate/i });
  await user.click(generateButton);
  await screen.findAllByTestId('chord');
  return user;
}

describe('FEAT-005: chord arrangement', () => {
  it('dragging first chord onto third reorders visually', async () => {
    await generateDefaultProgression();
    const chordNodes = await screen.findAllByTestId('chord');
    expect(chordNodes.length).toBeGreaterThanOrEqual(3);
    const before = getChordLabels();

    const dataTransfer = new DataTransferPolyfill();
    fireEvent.dragStart(chordNodes[0], { dataTransfer });
    fireEvent.dragOver(chordNodes[2], { dataTransfer });
    fireEvent.drop(chordNodes[2], { dataTransfer });

    const after = getChordLabels();
    expect(after.length).toBe(before.length);
    expect(after[2]).toBe(before[0]);
  });

  it('copying chord 0 and pasting onto chord 1 copies the label', async () => {
    const user = await generateDefaultProgression();
    const before = getChordLabels();
    await user.click(screen.getByTestId('copy-0'));
    await user.click(screen.getByTestId('paste-1'));
    const after = getChordLabels();
    expect(after[1]).toBe(before[0]);
  });

  it('add-after inserts a new chord after the selected index', async () => {
    const user = await generateDefaultProgression();
    const before = await screen.findAllByTestId('chord');
    await user.click(screen.getByTestId('add-after-1'));
    const after = await screen.findAllByTestId('chord');
    expect(after.length).toBe(before.length + 1);
  });
});
