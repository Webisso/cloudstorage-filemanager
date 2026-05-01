# CloudStorage File Manager

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-16a34a?style=flat)](https://webisso.github.io/cloudstorage-filemanager/)
[![License](https://img.shields.io/github/license/Webisso/cloudstorage-filemanager?style=flat)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/Webisso/cloudstorage-filemanager?style=flat)](https://github.com/Webisso/cloudstorage-filemanager/commits/main)
[![Stars](https://img.shields.io/github/stars/Webisso/cloudstorage-filemanager?style=flat)](https://github.com/Webisso/cloudstorage-filemanager/stargazers)
[![Issues](https://img.shields.io/github/issues/Webisso/cloudstorage-filemanager?style=flat)](https://github.com/Webisso/cloudstorage-filemanager/issues)

Modern web-based file manager for DigitalOcean Spaces (S3-compatible), built with React + TypeScript + Vite.

Turkish documentation: [README.tr.md](README.tr.md)

## Live Demo

- Production URL: https://webisso.github.io/cloudstorage-filemanager/

## What This Project Is

CloudStorage File Manager is an admin-style browser application designed to manage object storage quickly from a single interface.

It provides:

- Secure login with API credentials and bucket URL
- File/folder browsing with breadcrumb navigation
- Multi-file upload with advanced Upload Center
- Per-file and batch visibility control (public/private)
- Text file editing with save visibility selection
- Rename, delete, and public-link copy actions
- Session persistence and bilingual UI (EN/TR)

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4 + shadcn/base-ui components
- AWS SDK v3 (S3 client + presigner)
- Sonner for notifications

## Key Features

### Authentication and Session

- Login with:
  - Bucket URL
  - Access key ID
  - Secret access key
- Optional keep-signed-in behavior via local storage
- Session restore after refresh (F5)

### File Management

- List folders and files
- Navigate directories with enhanced breadcrumb
- Create folders
- Rename files/folders
- Delete selected items

### Upload Center

- Full-screen-like modal panel with margin overlay
- Multi-file queue
- Batch upload mode and per-file upload mode
- ACL/visibility selection:
  - Public (public-read)
  - Private
- Row-level upload status (queued/uploading/uploaded/failed)
- Live upload progress with:
  - Percentage
  - Transfer speed (MB/s, 1-second moving average)

### Visibility and Sharing

- Visibility column in file table
- Real ACL check per object (public/private)
- Public link copy action

### Text Editor

- Open and edit .txt files in modal editor
- Save with explicit visibility selection

### Localization

- English and Turkish UI texts

## Project Structure

- App shell and UI logic: src/App.tsx
- Spaces operations and upload logic: src/lib/spaces.ts
- Dev proxy and Vite config: vite.config.ts
- Static assets: public/

## Run Locally

### Requirements

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## Deployment

This project is configured for GitHub Pages using gh-pages.

```bash
npm run deploy
```

## CORS Note (DigitalOcean Spaces)

For browser-based access, your bucket must have proper CORS configuration.

Example policy requirements:

- Allowed origin: https://webisso.github.io (or your domain)
- Allowed methods: GET, PUT, POST, DELETE, HEAD
- Allowed headers: *

Utility script is included to set CORS from Node:

```bash
npm run spaces:cors
```

## Planned Features

- Drag and drop upload support in Upload Center
- Pause/resume/cancel upload queue controls
- Upload conflict strategy (overwrite, rename, skip)
- Search and filter for large directories
- Sort options (name, size, date, visibility)
- Bulk ACL update action for selected files
- Better mobile table layout (collapsible details)
- Optional role-based presets for visibility defaults
- Optional dark theme toggle

## License

MIT
