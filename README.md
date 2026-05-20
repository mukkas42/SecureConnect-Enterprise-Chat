# SecureConnect Enterprise Chat

SecureConnect Enterprise Chat is a modern, end-to-end encrypted messaging platform designed for secure enterprise communication. It provides a robust, reliable, and user-friendly experience for teams and individuals who prioritize privacy.

## Features

- **Secure Authentication**: PIN-based login and secure account creation with Supabase.
- **End-to-End Encryption**: All messages are encrypted on the sender's device and can only be decrypted by the recipient.
- **Real-Time Messaging**: Instant message delivery using Server-Sent Events (SSE).
- **Responsive UI**: Optimized for both desktop and mobile devices.
- **Progressive Web App (PWA)**: Installable on mobile and desktop for a native-like experience.
- **Conversation Management**: Easily create, archive, and manage direct and group chats.

## Technology Stack

- **Frontend**: SvelteKit 5, Svelte
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: Vanilla CSS with modern design tokens
- **Real-Time**: Server-Sent Events (SSE)
- **Encryption**: Modern cryptographic standards (AES-GCM, ChaCha20)

## Getting Started

### Prerequisites

- Node.js (>= 20.0.0)
- pnpm (recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd secureconnect-enterprise-chat
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

## Development

- `pnpm dev`: Start development server
- `pnpm build`: Build for production
- `pnpm preview`: Preview production build
- `pnpm lint`: Run linting checks
- `pnpm format`: Format codebase with Prettier

## License

This project is licensed under the MIT License.
