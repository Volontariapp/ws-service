# 🗓️ Volontariapp - WebSocket Service (`ws-service`)

[![NestJS](https://img.shields.io/badge/framework-NestJS-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Socket.io](https://img.shields.io/badge/websocket-Socket.io-black.svg)](https://socket.io/)

The **WebSocket Service** handles real-time bidirectional communication and Pub/Sub broadcasting for the Volontariapp platform.

---

## 🧠 Code Intelligence with GitNexus

This project uses **GitNexus** to maintain a live knowledge graph of the codebase.

### 🚀 Visualization
To see the codebase graph:
1. Run `npx gitnexus serve`
2. Visit [https://gitnexus.vercel.app/](https://gitnexus.vercel.app/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Yarn

### Installation
```bash
yarn install
```

### Running the App
```bash
# Development mode
yarn run start:dev

# Production mode
yarn run start:prod
```

### Running Tests
```bash
# Unit tests
yarn run test

# Integration tests
yarn run test:int
```

---

## 🏗️ Architecture
- **Socket.io Gateways**: Handle real-time client connections and messaging.
- **Redis Adapter**: Synchronizes messages across horizontally scaled WebSocket nodes.
- **Pub/Sub**: Enables cross-service broadcasting.

---

## 📜 License
This project is [MIT licensed](LICENSE).
.

# Le Redis Adapter : Scalabilité Horizontale

Pour supporter des milliers d'utilisateurs, nous déployons plusieurs instances du WS-Service. Le **Redis Adapter** est le composant qui unifie ces instances.

### Pourquoi est-ce indispensable ?

Si l'utilisateur A est sur le Pod 1 et l'utilisateur B sur le Pod 2, ils ne peuvent pas communiquer nativement. Le Redis Adapter utilise le mécanisme **Pub/Sub** de Redis :

- Chaque instance écoute un canal Redis.
- Lorsqu'on demande d'émettre un message vers une "Room", l'ordre est publié dans Redis.
- Toutes les instances reçoivent l'ordre et l'envoient aux clients connectés localement sur leur Pod.
