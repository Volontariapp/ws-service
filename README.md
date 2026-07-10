# WebSocket Service (ws-service)

## Project Overview & Value Proposition

Le **`ws-service`** est le moteur asynchrone temps réel de Volontariapp. Plus qu'une simple passerelle réseau, il agit comme un consommateur final intelligent dans notre Event-Driven Architecture.

Sa proposition de valeur réside dans sa capacité à faire le pont entre les bus d'événements asynchrones du backend (Redis Streams) et les clients front-end connectés (WebSockets), en court-circuitant l'API Gateway. Lorsqu'un microservice (ex: `ms-event`) publie une action via son Outbox, le `ws-service` consomme ce stream et pousse instantanément la mise à jour à l'utilisateur ciblé, offrant une expérience fluide et réactive.

## Key Features

- **Consommation Directe des Streams** : Intègre des Post-Processors qui écoutent directement les événements de domaine sur Redis pour les relayer aux clients.
- **Pattern Scatter-Gather Événementiel** : Gère l'agrégation de données de manière purement asynchrone (via l'émission de nouveaux événements dans son propre Outbox) plutôt que par des appels synchrones (gRPC).
- **Architecture Multi-Redis** : Utilise deux clusters Redis distincts pour isoler la charge : un pour l'infrastructure événementielle partagée (Streams/BullMQ), et un dédié au Pub/Sub de Socket.io.
- **Délégation Sécuritaire** : S'appuie sur le *Token Interne* pré-généré et signé par l'API Gateway pour authentifier le handshake WebSocket, garantissant une intégration sans friction.

## Tech Stack & Dependencies

| Composant | Technologie | Usage / Rôle |
| :--- | :--- | :--- |
| **Framework Base** | NestJS | Inversion de contrôle et structuration des modules. |
| **Temps Réel** | Socket.io | Gestion bidirectionnelle résiliente avec reconnexions. |
| **Persistance Locale**| PostgreSQL & TypeORM | Stockage limité aux tables de l'Outbox (`jobs/event_outbox`) et du Scatter-Gather. |
| **Broker Principal** | Redis (Shared) | Écoute des Redis Streams (`@volontariapp/post-processors`). |
| **Broker WebSocket** | Redis (Dedicated)| Adapter Pub/Sub exclusif pour la synchronisation des pods Socket.io. |

## Getting Started

### Prérequis

- **Node.js** (>= 24.14.0)
- **Package Manager** : Yarn v4 (`corepack enable`)
- Infrastructure locale incluant **PostgreSQL** et **deux instances Redis** (Shared et PubSub).

### Installation & Exécution

```bash
cd ws-service
yarn install

# Lancement en mode développement avec Hot-Reload
yarn start:dev
```

### Intelligence de Code (GitNexus)

Pour visualiser l'architecture et les interdépendances du code en direct :
```bash
npx gitnexus serve
# Visitez ensuite https://gitnexus.vercel.app/
```

## Testing & CI/CD

Le cycle de vie du service est géré via GitHub Actions (Lint, Typecheck, Build d'image Docker).
Ce service est hautement stateful d'un point de vue réseau (connexions TCP maintenues ouvertes) mais stateless d'un point de vue applicatif, permettant un redéploiement progressif (Rolling Update) sur Kubernetes sans perte d'événements grâce aux accusés de réception (ACK) sur les Streams Redis.
