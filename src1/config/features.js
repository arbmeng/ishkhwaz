// Switches for parts of the app that are built but turned off for now.
export const FEATURES = {
  // The full-screen jobs map (tab "map", header item "نەخشە"). Off until it's ready.
  map: false,
  // "Continue with Google" on the login and register pages. Off for now.
  googleLogin: false,
};

// Company (employer) accounts don't use plans for now — no Plans page, nav item or upgrade prompts.
// Admin/owner keep access so they can still manage/test them.
export const canSeePlans = (user) => user?.role !== 'employer';
