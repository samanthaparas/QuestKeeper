import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PortraitUpload from './PortraitUpload';
import { uploadPortrait } from '../../utils/portraits';

vi.mock('../../utils/portraits', () => ({
  shrinkImage: vi.fn(async (file) => file),
  validatePortraitFile: vi.fn(() => ''),
  uploadPortrait: vi.fn(async () => 'https://example.com/uploaded.png'),
}));

describe('portrait upload with a default avatar', () => {
  it('displays the three default layers while retaining the existing upload flow', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const character = { name: 'Wren', race: 'aarakocra', class: 'artificer', background: 'acolyte' };
    const { container } = render(<PortraitUpload character={character} name="Wren" characterId="wren" userId="owner" onUpload={onUpload} />);
    expect(screen.getByRole('button', { name: 'Upload portrait' })).toBeInTheDocument();
    expect(container.querySelectorAll('.character-avatar img')).toHaveLength(3);
    const file = new File(['portrait'], 'portrait.png', { type: 'image/png' });
    await user.upload(container.querySelector('input[type="file"]'), file);
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('https://example.com/uploaded.png'));
    expect(uploadPortrait).toHaveBeenCalledWith('owner', 'wren', file);
  });
});
