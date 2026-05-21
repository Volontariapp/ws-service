# AGENT.md — ms-event
> Sub-repo guide. Always read root `@AGENT.md` first for monorepo-wide conventions.

---

## 1. Service Overview

**ms-event** handles all event and tag lifecycle operations over gRPC.

```
Transport : gRPC (@nestjs/microservices)
Database  : PostgreSQL + PostGIS (TypeORM via @volontariapp/domain-event)
Domain lib: @volontariapp/domain-event
Contracts : @volontariapp/contracts-nest
```
---

## 2. Module Structure

```
src/
├── app.module.ts
├── providers/
│   └── database/
│       └── database.module.ts        ← global, registers EventModel / TagModel / RequirementModel
└── modules/
    └── event/
        ├── event.module.ts
        ├── controllers/
        │   ├── event.command.controller.ts
        │   ├── event.query.controller.ts
        │   ├── tag.command.controller.ts
        │   └── tag.query.controller.ts
        ├── dto/
        │   ├── common/
        │   │   ├── event.dto.ts          ← EventDTO implements Event
        │   │   ├── common.dto.ts         ← TagDTO, RequirementDTO
        │   │   └── point.dto.ts          ← PointDTO implements Point
        │   ├── request/
        │   │   ├── command/              ← CreateEventCommandDTO, UpdateEventCommandDTO …
        │   │   └── query/                ← GetEventQueryDTO, SearchEventsQueryDTO …
        │   └── response/
        │       └── event.response.dto.ts ← all response shapes
        └── transformers/
            ├── tag.transformer.ts
            ├── requirement.transformer.ts
            ├── event.transformer.ts
            └── index.ts
```

---

## 3. Transformer Layer

Transformers are the **only** place where DTO ↔ Entity conversion happens. Controllers call
transformers; they never construct entities directly.

### Pattern

```typescript
@Injectable()
export class XxxTransformer {
  toEntity(dto: Partial<XxxDTO>): XxxEntity { ... }
  toDto(entity: XxxEntity): XxxDTO { ... }
}
```

### EventTransformer — method map

| Method | Input | Output | Used by |
|---|---|---|---|
| `fromCreateCommand` | `CreateEventCommandDTO` | `Partial<EventEntity>` | `createEvent` |
| `fromEventDTO` | `Partial<Event>` | `Partial<EventEntity>` | `updateEvent` |
| `toEventDTO` | `EventEntity` | `EventDTO` | all responses |

### Critical field mappings (non-obvious)

| DTO field | Entity field | Notes |
|---|---|---|
| `EventDTO.title` | `EventEntity.name` | Different name — never swap |
| `Point { latitude, longitude }` | `EventLocation(lat, lng)` | Constructor validates ±90/±180; throws `INVALID_LOCATION` |
| `RequirementDTO.neededQuantity` | `RequirementEntity.quantity` | Different name |
| `EventDTO.currentParticipants` | *(absent)* | Zero-valued in `toEventDTO` — computed elsewhere |
| `EventDTO.localisationName` | *(absent)* | Zero-valued — not stored in domain entity |
| `EventDTO.organizerId` | *(absent)* | Zero-valued — owned by auth context |
| `RequirementDTO.description` | *(absent)* | Empty string in `toDto` — not in entity |
| `RequirementDTO.currentQuantity` | *(absent)* | Zero in `toDto` — computed elsewhere |

---

## 4. Domain Services (from @volontariapp/domain-event)

All three services are registered as providers in `EventModule` alongside their repositories.

```
EventService        ← @Inject(PostgresEventRepository)
TagService          ← @Inject(PostgresTagRepository)
RequirementService  ← @Inject(PostgresRequirementRepository)
```

The repositories depend on `@InjectRepository(XxxModel)` which is satisfied by `DatabaseModule`
(global, registered in `AppModule`).

### EventService API

```typescript
findById(id: string): Promise<EventEntity>
findAll(): Promise<EventEntity[]>
create(data: Partial<EventEntity>): Promise<EventEntity>
update(id: string, data: Partial<EventEntity>): Promise<EventEntity>
changeState(id: string, state: EventState): Promise<EventEntity>
delete(id: string): Promise<void>
search(searchTerm: string): Promise<EventEntity[]>
```

> `search` only filters by `searchTerm`. The other `SearchEventsQueryDTO` filters (area, types,
> tagSlugs, onlyAvailable, organizerId) are not yet implemented in the repository layer.

### TagService API

```typescript
findAll(): Promise<TagEntity[]>
findById(id: string): Promise<TagEntity>
findBySlug(slug: string): Promise<TagEntity>
create(tagData: Partial<TagEntity>): Promise<TagEntity>
update(id: string, tagData: Partial<TagEntity>): Promise<TagEntity>
delete(id: string): Promise<void>
```

### RequirementService API

```typescript
findAll(): Promise<RequirementEntity[]>
findById(id: string): Promise<RequirementEntity>
create(data: Partial<RequirementEntity>): Promise<RequirementEntity>
update(id: string, data: Partial<RequirementEntity>): Promise<RequirementEntity>
delete(id: string): Promise<void>
```

---

## 5. EventModule Provider Registration

```typescript
@Module({
  controllers: [EventCommandController, EventQueryController, TagCommandController, TagQueryController],
  providers: [
    // Repositories
    PostgresEventRepository,
    PostgresTagRepository,
    PostgresRequirementRepository,
    // Domain services
    EventService,
    TagService,
    RequirementService,
    // Transformers
    TagTransformer,
    RequirementTransformer,
    EventTransformer,
  ],
  exports: [EventService, TagService, RequirementService],
})
export class EventModule {}
```

---

## 6. Controller → Service Flow

### Event Commands

```
createEvent     : fromCreateCommand(dto) → eventService.create()      → toEventDTO()
updateEvent     : fromEventDTO(dto.event) → eventService.update(id)   → toEventDTO()
changeEventState: eventService.changeState(id, newState)              → toEventDTO()
deleteEvent     : eventService.delete(id)                             → { success: true }

manageRequirements (add):
  eventService.findById(eventId)
  requirementService.create({ name, quantity: neededQuantity, isSystem: false })
  eventService.update(eventId, { requirements: [...existing, newReq] })

manageRequirements (remove):
  eventService.findById(eventId)
  eventService.update(eventId, { requirements: existing.filter(r => r.id !== requirementId) })
```

### Event Queries

```
getEvent        : eventService.findById(id)                           → toEventDTO()
searchEvents    : eventService.search(searchTerm)                     → map toEventDTO()
listRequirements: eventService.findById(eventId) → entity.requirements → toDto()
```

### Tag Commands / Queries

```
createTag : tagTransformer.toEntity(dto) → tagService.create()        → tagTransformer.toDto()
updateTag : tagService.update(id, { name, color })                    → tagTransformer.toDto()
deleteTag : tagService.delete(id)                                     → { success: true }
getTags   : slugs.length > 0
              → Promise.all(slugs.map(findBySlug))
              → tagService.findAll()
            map → tagTransformer.toDto()
```

---

## 7. gRPC Constants (contracts-nest)

```typescript
GRPC_SERVICES.EVENT_COMMAND_SERVICE   // EventCommandService
GRPC_SERVICES.EVENT_QUERY_SERVICE     // EventQueryService
GRPC_SERVICES.TAG_COMMAND_SERVICE     // TagCommandService
GRPC_SERVICES.TAG_QUERY_SERVICE       // TagQueryService

EVENT_COMMAND_METHODS.CREATE_EVENT
EVENT_COMMAND_METHODS.UPDATE_EVENT
EVENT_COMMAND_METHODS.CHANGE_EVENT_STATE
EVENT_COMMAND_METHODS.MANAGE_REQUIREMENTS
EVENT_COMMAND_METHODS.DELETE_EVENT

EVENT_QUERY_METHODS.GET_EVENT
EVENT_QUERY_METHODS.SEARCH_EVENTS
EVENT_QUERY_METHODS.LIST_REQUIREMENTS

TAG_COMMAND_METHODS.CREATE_TAG
TAG_COMMAND_METHODS.UPDATE_TAG
TAG_COMMAND_METHODS.DELETE_TAG

TAG_QUERY_METHODS.GET_TAGS
```

---

## 8. Contract Types Reference

### AddRequirement (from @volontariapp/contracts-nest)

```typescript
interface AddRequirement {
  name: string;
  description: string;
  neededQuantity: number;
}
```

### RemoveRequirement

```typescript
interface RemoveRequirement {
  requirementId: string;
}
```

---

## 9. Known Gaps / TODO

- `SearchEventsQueryDTO` carries `area`, `types`, `tagSlugs`, `onlyAvailable`, `organizerId` — these
  are not yet wired in `PostgresEventRepository.search()`. Only `searchTerm` is used.
- `EventDTO.localisationName`, `currentParticipants`, `organizerId` are zero-valued in `toEventDTO`
  until the domain entity or an enrichment layer stores them.
- `EventEntity` has no `createdAt`/`updatedAt` — `toEventDTO` returns `new Date()` as a placeholder;
  these should come from the ORM model layer once the mapper is added.
