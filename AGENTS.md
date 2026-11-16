# Project delivery preferences

- Whenever delivering a built addon, publish the versioned `.mcaddon` under `downloads/` on GitHub and include a direct GitHub download link in the final response. A local workspace file link alone is insufficient.
- Use a new version for addon updates and keep behavior/resource manifests and their pack dependencies synchronized.
- Verify that the GitHub download contains the delivered build before presenting its link. If publishing is blocked, explain the blocker rather than linking an older build as the update.
- Use the existing checkout; cloud tasks already run in an isolated environment. Do not create a worktree unless requested.
