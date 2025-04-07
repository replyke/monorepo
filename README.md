# Replyke UI Monorepo

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![npm](https://img.shields.io/badge/types-included-blue?style=flat-square)
[![runs with expo](https://img.shields.io/badge/Runs%20with%20Expo-4630EB.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.io/)

## Stay Updated
Join the 
<a  href="https://discord.gg/REKxnCJzPz" target="_blank">
Discord server
</a>
and follow on
<a  href="https://x.com/replykejs" target="_blank">
X/Twitter
</a>
and
<a  href="https://replyke.bsky.social" target="_blank">
BlueSky
</a>
to be notified about important changes 

## Overview

Replyke UI is a monorepo containing UI-related functionality for the Replyke ecosystem. It includes reusable UI utilities, shared components, and the **social comment section** for both React and React Native applications.

While this repository provides UI-related tools, it requires one of the core Replyke libraries to function:

- [@replyke/react-js](https://www.npmjs.com/package/@replyke/react-js) (for React web apps)
- [@replyke/react-native](https://www.npmjs.com/package/@replyke/react-native) (for React Native apps)
- [@replyke/expo](https://www.npmjs.com/package/@replyke/expo) (for Expo-managed React Native apps)

![Demo](./assets/comment_section.gif)

## Replyke UI Components

The primary focus of this monorepo is the **social comment section**, which provides modern discussion capabilities similar to popular social networks. Replyke’s comment section is fully featured and includes:

- **Mentions (@username)** – Notify mentioned users and provide profile links.
- **Replies & Likes** – Nested replies, likes, and user notifications.
- **Highlighted Comments** – Highlight a specific comment or reply (useful for deep links from notifications).
- **GIF Support** – Enable GIFs by adding an API key via the Replyke dashboard.
- **Built-in Authorization** – Prevent unauthorized actions such as duplicate likes or deleting others' comments.
- **Reporting & Moderation** – Comes with a reporting system and a back-office for project managers to manage reports, remove comments, and ban users.
- **Custom Styling** – Developers can customize styling via props.

## Monorepo Structure

This monorepo consists of multiple packages, categorized into **UI core utilities** and **comment section implementations**:

### **UI Core**

- `packages/ui-core/base` – Shared UI utilities such as generic styles and types.
- `packages/ui-core/react-js` – Reusable functionality and components for React web applications.
- `packages/ui-core/react-native` – Reusable functionality and components for React Native applications.

### **Social Comment Section**

- `packages/comments/social/core` – Core types, hooks, and utilities shared between React and React Native versions (no UI).
- `packages/comments/social/react-js` – Full implementation of the social comment section for React web apps. ([npm package](https://www.npmjs.com/package/@replyke/comments-social-react-js))
- `packages/comments/social/react-native` – Full implementation of the social comment section for React Native (CLI & Expo). ([npm package](https://www.npmjs.com/package/@replyke/comments-social-react-native))

## License

This repository is open-source under the **MIT License**.

## Contributions

Contributions are welcome! If you'd like to improve the comment section or add new UI components, feel free to submit a pull request. Join the Replyke community and help build better social UI components!

---

For questions or support, visit the [Replyke documentation](https://docs.replyke.com), open an issue or reach out via the [Discord server](https://discord.com/invite/REKxnCJzPz).
