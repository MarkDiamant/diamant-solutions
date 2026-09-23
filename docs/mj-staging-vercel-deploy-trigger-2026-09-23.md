# Isolated M&J staging deployment

This branch is the intended deployment source for the isolated `mj-bms-staging` Vercel project. The staging preview is read-only and must use only the isolated Supabase staging project (`sfxeyydkwzlduflpmidd`). This commit triggers Vercel branch tracking after the project production branch was changed from `main` to `architecture/shared-bms-core`. No existing live DS or M&J deployment should be changed by this commit.
