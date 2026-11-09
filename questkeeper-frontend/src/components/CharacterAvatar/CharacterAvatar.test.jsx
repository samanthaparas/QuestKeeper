import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import CharacterAvatar from './CharacterAvatar';
import { getAvatarLayers } from '../../utils/avatars';

const character = { name: 'Wren', race: { index: 'aarakocra' }, class: { index: 'artificer' }, background: { index: 'acolyte' } };

// jsdom has no <dialog> pop-up support; open and close just flip the flag.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

describe('CharacterAvatar', () => {
  it('uses an upload alone and falls back to layers if that URL fails', () => {
    const sheet = { ...character, portraitUrl: 'https://example.com/portrait.jpg' };
    const { container, rerender } = render(<CharacterAvatar character={sheet} decorative={false} />);
    expect(screen.getByRole('img', { name: "Wren's portrait" })).toBeInTheDocument();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('.character-avatar__race')).toHaveAttribute('src', getAvatarLayers(character).race);
    expect(container.querySelectorAll('.character-avatar__badge')).toHaveLength(2);
    expect(sheet.portraitUrl).toBe('https://example.com/portrait.jpg');
    rerender(<CharacterAvatar character={{ ...sheet, portraitUrl: 'https://example.com/new.jpg' }} />);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/new.jpg');
  });

  it('updates layers when the character choices change without changing uploads or saved data', () => {
    const before = JSON.stringify(character);
    const { container, rerender } = render(<CharacterAvatar character={character} />);
    const next = { ...character, race: 'dwarf', class: 'wizard', background: 'northern-minstrel' };
    rerender(<CharacterAvatar character={next} />);
    const layers = getAvatarLayers(next);
    expect(container.querySelector('.character-avatar__race')).toHaveAttribute('src', layers.race);
    expect(container.querySelector('.character-avatar__badge--class img')).toHaveAttribute('src', layers.class);
    expect(container.querySelector('.character-avatar__badge--background img')).toHaveAttribute('src', layers.background);
    expect(JSON.stringify(character)).toBe(before);
  });

  it('keeps initials for incomplete characters and recovers from built-in art failures', () => {
    const { container, rerender } = render(<CharacterAvatar name="New Hero" />);
    expect(container).toHaveTextContent('NH');
    expect(container.querySelectorAll('img')).toHaveLength(0);
    rerender(<CharacterAvatar character={character} />);
    fireEvent.error(container.querySelector('.character-avatar__race'));
    expect(container.querySelector('.character-avatar__initials')).toHaveTextContent('W');
    expect(container.querySelectorAll('.character-avatar__badge')).toHaveLength(2);
  });

  it('an enlargeable portrait opens big when tapped', async () => {
    const sheet = { ...character, portraitUrl: 'https://example.com/portrait.jpg' };
    render(<CharacterAvatar character={sheet} enlargeable />);
    await userEvent.click(screen.getByRole('button', { name: "Show Wren's portrait bigger" }));
    expect(screen.getByRole('dialog', { name: 'Wren' })).toBeInTheDocument();
  });

  it('without an uploaded picture there is nothing to enlarge', () => {
    render(<CharacterAvatar character={character} enlargeable />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
