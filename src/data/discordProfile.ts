export type DiscordProfile = {
  username: string; displayName: string; bio: string; avatarUrl: string;
  bannerUrl: string; decorationUrl: string; badges: string[];
  presence: 'unknown' | 'online' | 'idle' | 'dnd' | 'offline'; customStatus: string;
  nameplate: { imageUrl: string; videoUrl: string } | null;
  nameStyle: { colors: string[]; fontId: number; effectId: number };
  createdAt: string; updatedAt?: string;
};
export function toDiscordProfile(source?: Partial<DiscordProfile> | null): DiscordProfile {
  const age = Date.now() - Date.parse(source?.updatedAt || '');
  const fresh = Number.isFinite(age) && age >= 0 && age <= 5 * 60 * 1000;
  const presence = fresh && ['online','idle','dnd','offline'].includes(source?.presence || '') ? source!.presence! : 'unknown';
  return {
    username: source?.username || 'ankuz0',
    displayName: source?.displayName || source?.username || 'Discord',
    bio: source?.bio === 'Discord — основной канал связи.' ? '' : source?.bio || '',
    avatarUrl: source?.avatarUrl || '', bannerUrl: source?.bannerUrl || '', decorationUrl: source?.decorationUrl || '',
    badges: Array.isArray(source?.badges) ? source.badges.filter(badge => typeof badge === 'string' && badge !== 'Discord Nameplate') : [],
    presence, customStatus: presence === 'unknown' ? '' : source?.customStatus || '',
    nameplate: source?.nameplate || null,
    nameStyle: {colors: (Array.isArray(source?.nameStyle?.colors) ? source.nameStyle.colors : []).filter(color => /^#[0-9a-f]{6}$/i.test(color)).slice(0,2), fontId:source?.nameStyle?.fontId || 0,effectId:source?.nameStyle?.effectId || 0},
    createdAt: source?.createdAt || '', updatedAt: source?.updatedAt,
  };
}
