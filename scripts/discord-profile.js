const text = value => typeof value === 'string' ? value.trim() : '';
const color = value => Number.isInteger(value) && value >= 0 && value <= 0xffffff ? `#${value.toString(16).padStart(6,'0')}` : '';
export function discordSnapshot(profile = {}, lanyard = {}, fallback = {}, bioOverride = '') {
  const user = profile.data || lanyard.data?.discord_user || {};
  const id = text(user.id);
  const cdn = 'https://cdn.discordapp.com';
  const media = (kind, hash, size) => id && /^[a-zA-Z0-9_]+$/.test(hash || '') ? `${cdn}/${kind}/${id}/${hash}.${hash.startsWith('a_')?'gif':'webp'}?size=${size}` : '';
  const plate = text(user.collectibles?.nameplate?.asset).replace(/\/+$/,'');
  const plateBase = /^nameplates\/[a-zA-Z0-9_/-]+$/.test(plate) && !plate.includes('..') ? `${cdn}/assets/collectibles/${plate}` : '';
  const live = lanyard.success && lanyard.data ? {status:lanyard.data.discord_status,activities:lanyard.data.activities} : profile.presence;
  const presence = ['online','idle','dnd','offline'].includes(live?.status) ? live.status : 'unknown';
  const custom = Array.isArray(live?.activities) ? live.activities.find(a=>a.type===4) : null;
  const flags = Array.isArray(user.public_flags_array) ? user.public_flags_array.filter(flag=>typeof flag==='string') : [];
  const result = {
    username: text(user.username) || text(fallback.username) || 'ankuz0',
    displayName: text(user.global_name) || text(user.username) || text(fallback.displayName),
    bio: text(bioOverride) || text(user.bio),
    presence, customStatus: presence==='unknown' ? '' : text(custom?.state),
    avatarUrl: media('avatars',user.avatar,256) || text(user.defaultAvatarURL),
    bannerUrl: media('banners',user.banner,1024),
    decorationUrl: /^[a-zA-Z0-9_]+$/.test(user.avatar_decoration_data?.asset || '') ? `${cdn}/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=512&passthrough=true` : '',
    accentColor: color(user.accent_color),
    nameplate: plateBase ? {imageUrl:`${plateBase}/static.png`,videoUrl:`${plateBase}/asset.webm`} : null,
    nameStyle: {colors:(Array.isArray(user.display_name_styles?.colors)?user.display_name_styles.colors:[]).map(color).filter(Boolean).slice(0,2),fontId:user.display_name_styles?.font_id || 0,effectId:user.display_name_styles?.effect_id || 0},
    createdAt: text(user.createdAt),
    badges:[...new Set(flags)],
  };
  // Presence-only responses do not carry profile cosmetics. Preserve the last known set.
  if (!profile.data) for (const key of ['bannerUrl','decorationUrl','nameplate','nameStyle','createdAt','badges','bio','accentColor']) {
    if (fallback[key] !== undefined) result[key] = fallback[key];
  }
  if (text(bioOverride)) result.bio = text(bioOverride);
  return result;
}
