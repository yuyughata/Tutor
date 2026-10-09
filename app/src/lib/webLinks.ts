// Links from the app to the Genova website (account creation / management). Payments only ever happen on the website.
// Store rules differ: set EXPO_PUBLIC_WEB_LINKS=off in a build to hide every link-out (see docs/LAUNCH_GUIDE.md).
const base = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/$/, '');
const off = process.env.EXPO_PUBLIC_WEB_LINKS === 'off';

/** Website address for link-outs, or undefined when this build must not link to the website. */
export const WEB_URL: string | undefined = !off && base ? base : undefined;
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@custar.com';
