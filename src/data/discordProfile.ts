export type DiscordProfile = {
  username: string; displayName: string; bio: string; avatarUrl: string;
  bannerUrl: string; decorationUrl: string; badges: string[];
};
export function toDiscordProfile(source?: Partial<DiscordProfile> | null): DiscordProfile {
  return {
    username: source?.username || 'ankuz0',
    displayName: source?.displayName || source?.username || 'Discord',
    bio: source?.bio || '', avatarUrl: source?.avatarUrl || '',
    bannerUrl: source?.bannerUrl || '', decorationUrl: source?.decorationUrl || '',
    badges: source?.badges || [],
  };
}
