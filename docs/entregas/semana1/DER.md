# DER MachTrueke (mínimo)

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : owns
    USERS {
      int id PK
      string email UK
      string name
      string hashed_password
      datetime created_at
    }
    PRODUCTS {
      int id PK
      string title
      string description
      int owner_id FK
      datetime created_at
    }
