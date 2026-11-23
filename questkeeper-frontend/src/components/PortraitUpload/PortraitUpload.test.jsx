import { render, screen, waitFor, within } from '@testing-library/react';
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

// The character sheet's big portrait: an Edit menu instead of a separate
// Adjust link.
describe('PortraitUpload with its Edit menu', () => {
  const props = { userId: 'u1', characterId: 'c1', name: 'Pippa', onUpload: vi.fn(), size: 'large', withMenu: true };

  it('is closed at first, and opening it never opens the file chooser', async () => {
    const user = userEvent.setup();
    const { container } = render(<PortraitUpload {...props} portraitUrl="https://example.com/pippa.png" />);
    const fileInput = container.querySelector('input[type="file"]');
    const chooser = vi.spyOn(fileInput, 'click');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('button', { name: /Adjust how/ })).toBeNull();
    const edit = screen.getByRole('button', { name: "Edit Pippa's portrait" });
    expect(edit).toHaveAttribute('aria-expanded', 'false');

    await user.click(edit);
    expect(edit).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
      'View larger',
      'Adjust framing',
      'Upload new image',
    ]);
    // Focus goes into the menu; the arrow keys move through it.
    expect(screen.getByRole('menuitem', { name: 'View larger' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Adjust framing' })).toHaveFocus();
    expect(chooser).not.toHaveBeenCalled();

    // Escape closes it and gives focus back to Edit.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(edit).toHaveFocus();
    expect(chooser).not.toHaveBeenCalled();

    // Only "Upload new image" opens the chooser.
    await user.click(edit);
    await user.click(screen.getByRole('menuitem', { name: 'Upload new image' }));
    expect(chooser).toHaveBeenCalledTimes(1);
    expect(props.onUpload).not.toHaveBeenCalled();
  });

  it('shows the picture larger without changing anything, and closes back to Edit', async () => {
    const user = userEvent.setup();
    render(<PortraitUpload {...props} portraitUrl="https://example.com/pippa.png" />);
    await user.click(screen.getByRole('button', { name: "Edit Pippa's portrait" }));
    await user.click(screen.getByRole('menuitem', { name: 'View larger' }));

    const viewer = screen.getByRole('dialog', { name: "Pippa's portrait" });
    expect(within(viewer).getByRole('img', { name: "Pippa's portrait" })).toHaveAttribute('src', 'https://example.com/pippa.png');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: "Edit Pippa's portrait" })).toHaveFocus();
    expect(props.onUpload).not.toHaveBeenCalled();
  });

  it('with no picture yet, just offers an upload (nothing to view or reframe)', () => {
    render(<PortraitUpload {...props} portraitUrl="" />);
    expect(screen.getByRole('button', { name: 'Upload portrait' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit .*portrait/ })).toBeNull();
  });
});

// Phones: the tiny coin beside the name opens the same menu.
describe('PortraitUpload: the tiny coin with its Edit menu', () => {
  const props = { userId: 'u1', characterId: 'c1', name: 'Pippa', size: 'tiny', withMenu: true };

  it('opens the menu from the coin, never the file chooser by itself, and Adjust reframes', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    globalThis.fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['saved']) }));
    const { container } = render(<PortraitUpload {...props} onUpload={onUpload} portraitUrl="https://example.com/pippa.png" />);
    const chooser = vi.spyOn(container.querySelector('input[type="file"]'), 'click');

    const coin = screen.getByRole('button', { name: "Edit Pippa's portrait" });
    expect(coin).toHaveAttribute('aria-haspopup', 'menu');
    // No separate Adjust link on the coin; the pencil badge is decoration.
    expect(screen.queryByRole('button', { name: /Adjust how/ })).toBeNull();
    expect(coin.querySelector('.portrait-upload__coin-badge')).toHaveAttribute('aria-hidden', 'true');

    await user.click(coin);
    expect(chooser).not.toHaveBeenCalled();
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
      'View larger',
      'Adjust framing',
      'Upload new image',
    ]);
    expect(screen.getByRole('menu')).toHaveClass('portrait-upload__menu--coin');

    // View larger, then back to the coin.
    await user.click(screen.getByRole('menuitem', { name: 'View larger' }));
    expect(screen.getByRole('dialog', { name: "Pippa's portrait" })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(coin).toHaveFocus();

    // Adjust framing, then Cancel: nothing saved, focus back on the coin.
    await user.click(coin);
    await user.click(screen.getByRole('menuitem', { name: 'Adjust framing' }));
    expect(await screen.findByRole('dialog', { name: "Frame Pippa's portrait" })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(coin).toHaveFocus());
    expect(onUpload).not.toHaveBeenCalled();
    expect(uploadPortrait).not.toHaveBeenCalled();
    expect(chooser).not.toHaveBeenCalled();
  });

  it('with no picture yet, the coin just uploads, as before', () => {
    render(<PortraitUpload {...props} onUpload={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Upload portrait' })).not.toHaveAttribute('aria-haspopup');
  });
});
