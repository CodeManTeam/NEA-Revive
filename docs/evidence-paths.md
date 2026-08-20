# Evidence Path Mapping

Historical evidence stays outside the repository. Documentation and tools use
environment-style placeholders instead of machine-specific absolute paths.

Set these variables in a local shell when following evidence references:

```powershell
$env:NEA_EVIDENCE_ROOT = "D:/Projects/Gaming/NEA-Project/Evidence"
$env:NEA_PROJECT_ROOT = "D:/Projects/Gaming/NEA-Project"
```

The repository-local `evidence/manifest.json` remains the authoritative mapping
for captured files. Runtime code must not depend on either variable; only
inspection tools and documentation may use them.
