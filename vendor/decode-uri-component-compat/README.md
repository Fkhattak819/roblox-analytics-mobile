# URI decoder compatibility adapter

This private adapter supplies the callable CommonJS API expected by query-string 7 while delegating decoding to the unmodified upstream `decode-uri-component@0.5.0` package, installed under an npm alias. The upstream package remains in the lockfile and dependency advisory scan. No vulnerable algorithm is copied or suppressed.

The adapter preserves the old plus-to-space behavior. Node 22.18 loads the synchronous ESM default; Metro transforms the upstream ESM for the native bundle. Tests cover actual query-string behavior and bound a long malformed percent run in a child process. Native runtime validation remains required.

Remove the adapter and its direct dependency/override together when navigation/query-string supports the patched decoder's ESM interface directly. Do not change the alias to an affected version.

Upstream fix: https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.0
