erDiagram
    USERS ||--o{ BUDGETS : "creates"
    USERS ||--o{ INCOME : "records"
    USERS ||--o{ EXPENSES : "records"
    CATEGORIES ||--o{ EXPENSES : "classifies"

    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password_hash
        timestamp created_at
        timestamp updated_at
    }

    BUDGETS {
        int id PK
        int user_id FK
        decimal monthly_limit
        tinyint month
        smallint year
        timestamp created_at
        timestamp updated_at
    }

    INCOME {
        int id PK
        int user_id FK
        decimal amount
        varchar source
        date date
        timestamp created_at
        timestamp updated_at
    }

    EXPENSES {
        int id PK
        int user_id FK
        int category_id FK
        decimal amount
        varchar description
        date date
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        int id PK
        varchar name UK
        boolean is_default
    }
