import { useState } from 'react';
import { getInitials } from '../../utils/characterSheet';
import { getAvatarLayers } from '../../utils/avatars';
import './CharacterAvatar.css';

// Display only: never uploads or writes a derived portrait into character data.
// This fills its existing portrait frame, retaining each screen's sizing.
function CharacterAvatar({ character, name = character?.name ?? '', portraitUrl = character?.portraitUrl, decorative = true }) {
  const [failed, setFailed] = useState([]);
  const layers = getAvatarLayers(character);
  const uploaded = typeof portraitUrl === 'string' ? portraitUrl.trim() : '';
  const photo = uploaded && !failed.includes(uploaded) ? uploaded : '';
  const race = failed.includes(layers.race) ? null : layers.race;
  const onError = (src) => setFailed((previous) => previous.includes(src) ? previous : [...previous, src]);

  return (
    <span
      className={`character-avatar character-avatar--${photo ? 'uploaded' : 'generated'}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `${name || 'Character'}'s portrait`}
      aria-hidden={decorative || undefined}
    >
      {photo ? <img className="character-avatar__upload" src={photo} alt="" onError={() => onError(photo)} /> : <>
        <span className="character-avatar__disc" />
        {race ? <img className="character-avatar__race" src={race} alt="" onError={() => onError(race)} />
          : <span className="character-avatar__initials">{getInitials(name) || '?'}</span>}
        {['class', 'background'].map((kind) => layers[kind] && !failed.includes(layers[kind]) && (
          <span key={kind} className={`character-avatar__badge character-avatar__badge--${kind}`}>
            <img src={layers[kind]} alt="" onError={() => onError(layers[kind])} />
          </span>
        ))}
      </>}
    </span>
  );
}

export default CharacterAvatar;
