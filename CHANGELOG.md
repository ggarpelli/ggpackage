# Change Log

All notable changes to the "ggpackage" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.0.2] - 2025-10-08
### Added
- **Interactive selection via Quick Pick:** You can now review and manually choose which metadata components to include in your `package.xml` using a searchable and multi-select Quick Pick UI.
- **Automatic pre-selection:** When generating from the File Explorer or Source Control, the selected files are automatically pre-selected in the Quick Pick window.
- **Progress notification:** Added progress indicator while scanning the workspace for components.
- **Additional metadata detection:** Improved support for metadata types identified by file extensions (e.g. `.cls`, `.trigger`, `.page`, etc.).
- **Category definition:** Extension now appears under the **"SFDX"** category in the VS Code Marketplace.
- **Custom command label:** Command name updated to appear as `ggpackage: Generate Package.xml...` in the command palette.

### Changed
- Refactored core logic for file scanning and metadata extraction for better performance and accuracy.
- Context menu availability simplified (no longer limited to `/force-app/` path).
- Improved handling of nested objects, child metadata (fields, record types, etc.), and Lightning bundles (LWC, Aura, Experience).
- XML generation refactored to produce more stable and sorted results.

### Removed
- Deprecated test command `ggpackage.testMenu`.
- Old directory-expansion logic replaced by workspace-wide search for consistency.

---

## [0.0.1] - 2025-10-06
### Added
- Initial release of ggpackage.
- Generate `package.xml` directly from selected files or folders in VS Code.
- Context menu integration for both **File Explorer** and **Source Control**.
- Automatic XML formatting and alphabetical sorting by type and member.
