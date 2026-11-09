import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PortraitUpload from './PortraitUpload';
import { uploadPortrait } from '../../utils/portraits';
import { cropToFile } from '../../utils/portraitCrop';

vi.mock('../../utils/portraits', () => ({
  validatePortraitFile: vi.fn(() => ''),
  uploadPortrait: vi.fn(async () => 'https://example.com/uploaded.png'),
}));

// The real crop needs a canvas, which the test browser doesn't have.
const framed = new File(['framed'], 'portrait.jpg', { type: 'image/jpeg' });
vi.mock('../../utils/portraitCrop', async (importOriginal) => ({
  ...(await importOriginal()),
  cropToFile: vi.fn(async () => framed),
}));

// jsdom has no <dialog> pop-up support, and no blob: URLs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
  URL.createObjectURL = vi.fn(() => 'blob:picture');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => vi.clearAllMocks());

// The picture "loads" in the framing pop-up at 800 x 1200.
function loadPicture(container) {
  const img = container.ownerDocument.querySelector('.portrait-cropper__image');
  Object.defineProperty(img, 'naturalWidth', { value: 800 });
  Object.defineProperty(img, 'naturalHeight', { value: 1200 });
  img.dispatchEvent(new Event('load'));
}

describe('portrait upload', () => {
  it('shows the default avatar, then frames a chosen picture before uploading it', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const character = { name: 'Wren', race: 'aarakocra', class: 'artificer', background: 'acolyte' };
    const { container } = render(<PortraitUpload character={character} name="Wren" characterId="wren" userId="owner" onUpload={onUpload} />);
    expect(screen.getByRole('button', { name: 'Upload portrait' })).toBeInTheDocument();
    expect(container.querySelectorAll('.character-avatar img')).toHaveLength(3);

    await user.upload(container.querySelector('input[type="file"]'), new File(['portrait'], 'portrait.png', { type: 'image/png' }));
    expect(screen.getByRole('dialog', { name: "Frame Wren's portrait" })).toBeInTheDocument();
    expect(uploadPortrait).not.toHaveBeenCalled();

    loadPicture(container);
    await user.click(screen.getByRole('button', { name: 'Use this' }));

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('https://example.com/uploaded.png'));
    expect(cropToFile).toHaveBeenCalled();
    expect(uploadPortrait).toHaveBeenCalledWith('owner', 'wren', framed);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Cancel closes the pop-up without uploading anything', async () => {
    const user = userEvent.setup();
    const { container } = render(<PortraitUpload name="Wren" characterId="wren" userId="owner" onUpload={vi.fn()} />);
    await user.upload(container.querySelector('input[type="file"]'), new File(['portrait'], 'portrait.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(uploadPortrait).not.toHaveBeenCalled();
  });

  it('Adjust reopens the saved portrait for reframing', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['saved']) }));
    render(<PortraitUpload name="Wren" characterId="wren" userId="owner" portraitUrl="https://example.com/wren.jpg" onUpload={vi.fn()} size="large" />);

    await user.click(screen.getByRole('button', { name: "Adjust how Wren's portrait is framed" }));

    expect(fetch).toHaveBeenCalledWith('https://example.com/wren.jpg', { cache: 'no-store' });
    expect(await screen.findByRole('dialog', { name: "Frame Wren's portrait" })).toBeInTheDocument();
  });

  it('has no Adjust on the tiny coin, or before there is a portrait', () => {
    const { rerender } = render(<PortraitUpload name="Wren" characterId="wren" userId="owner" portraitUrl="https://example.com/wren.jpg" onUpload={vi.fn()} size="tiny" />);
    expect(screen.queryByRole('button', { name: /Adjust/ })).not.toBeInTheDocument();
    rerender(<PortraitUpload name="Wren" characterId="wren" userId="owner" onUpload={vi.fn()} size="large" />);
    expect(screen.queryByRole('button', { name: /Adjust/ })).not.toBeInTheDocument();
  });
});
