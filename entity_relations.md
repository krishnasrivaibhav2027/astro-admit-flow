# Entity Relationship Diagram

This document illustrates the relationships between Platform Admins, Institutional Admins, and Students.

## Access Control Hierarchy

```mermaid
flowchart TD
    subgraph Platform["Platform Level"]
        SA["Super Admin (Platform Owner)"]
    end
    
    subgraph Institution["Institution Level"]
        INST["Institution"]
        IA["Institution Admin"]
    end
    
    subgraph Student["Student Level"]
        STU["Student"]
        AR["Access Request"]
    end
    
    SA -->|Onboards and Approves| INST
    INST -->|Employs| IA
    
    STU -->|Submits| AR
    AR -->|Sent to| INST
    IA -->|Reviews and Approves| AR
    AR -->|Grants Access| STU
    
    IA -->|Manages| STU
```

## Database Entity Relationships

```mermaid
erDiagram
    super_admins ||--o{ institutions : approves
    institutions ||--|{ institution_admins : has
    institutions ||--o{ students : enrolls
    institutions ||--o{ student_access_requests : receives
    institution_admins ||--o{ student_access_requests : reviews
    students ||--o| student_access_requests : linked_via

    super_admins {
        uuid id PK
        text email UK
        text first_name
        text last_name
        text role
    }

    institutions {
        uuid id PK
        text name
        text type
        text status
        uuid approved_by FK
    }

    institution_admins {
        uuid id PK
        uuid institution_id FK
        text email UK
        text name
        text status
    }

    student_access_requests {
        uuid id PK
        uuid institution_id FK
        text email
        text status
        uuid reviewed_by FK
    }

    students {
        uuid id PK
        uuid institution_id FK
        uuid access_request_id FK
    }
```

## Key Relationships Summary

| From | To | Relationship |
|------|-----|--------------|
| Super Admin | Institution | Approves and onboards institutions |
| Institution | Institution Admin | Has one or more admins |
| Institution | Student | Enrolls students |
| Student | Access Request | Submits request for access |
| Institution Admin | Access Request | Reviews and approves/rejects |
| Access Request | Student | Links student to institution |
