# 🗓️ Volontariapp - Event Microservice (`ms-event`)

[![NestJS](https://img.shields.io/badge/framework-NestJS-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![GitNexus](https://img.shields.io/badge/intelligence-GitNexus-orange.svg)](https://gitnexus.vercel.app/)

The **Event Microservice** manages everything related to volunteering opportunities, schedules, and event organization.

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
- **Event Services**: Handle the creation and management of events.
- **Participation logic**: Manages user enrollments.
- **Sequelize Models**: Persistent storage for events and participants.

---

## 📜 License
This project is [MIT licensed](LICENSE).
.
