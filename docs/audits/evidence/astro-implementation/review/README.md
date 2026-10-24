# Local review change sets

These patches separate dependency refreshes from adopted features. Apply them
in numbered order to the starting checkout; they are review artifacts, not a
second source tree. The dependency-only package/lockfile pair is also saved in
`../upgrade-only/`; its lockfile dry-run was validated. Font packages are the
only manifest difference between that pair and the final application pair.

Application changes remain in the working tree. No Git remote was modified.
The evidence/report files themselves are not duplicated inside the patches.
