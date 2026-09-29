# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-29

### Added

- `withFacturX(definition, { xml, profile?, description? })` returns a Factur-X invoice definition: PDF/A-3 (`PDF/A-3b` unless another PDF/A-3 level is set), PDF 1.7 unless a later version is set, the CII XML embedded as `factur-x.xml` with the relationship its profile requires, and the Factur-X XMP metadata. Existing files and XMP descriptions are kept.
- `detectFacturXProfile(xml)` reads the profile declared by the XML, and `facturXMetadata(profile)` returns the XMP descriptions.

[Unreleased]: https://github.com/kljws/pdfcraft/compare/v0.10.0...HEAD
[0.1.0]: https://github.com/kljws/pdfcraft/releases/tag/v0.10.0
