# Trellis Specs

This directory contains the coding guidelines and architectural contracts for the File Manager project. All agents and human contributors should read the relevant spec files before making modifications to ensure consistency with our established patterns.

## Spec Documents

- **[Frontend Architecture](frontend-architecture.md)**: Rules for React, Zustand state management, TailwindCSS styling, and preventing "AI-generated" aesthetics.
- **[Backend Architecture](backend-architecture.md)**: Guidelines for the Go backend, the high-performance MFT/USN search engine, and SQLite database tagging.
- **[IPC and Data Flow](ipc-and-data-flow.md)**: Boundary contracts between the React frontend and Go backend, distinguishing between Wails standard IPC and our custom HTTP RPC for high-throughput search.
