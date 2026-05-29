# System Flowchart — The Fiscal Fulcrum Portal

> Generated: 2026-05-20  
> Tool: Mermaid (view in any Markdown renderer that supports Mermaid)

---

## 1. Authentication & Role Routing

```mermaid
flowchart TD
    A[User visits /login] --> B{Authenticated?}
    B -->|No| C[Show login page]
    B -->|Yes| D[Redirect to /]
    D --> E{Role?}
    E -->|admin| F[/admin/dashboard]
    E -->|team| G[/team/dashboard]
    E -->|client| H[/portal/dashboard]
```

---

## 2. Task Lifecycle (Full)

```mermaid
flowchart TD
    subgraph Create["1. Create Task"]
        C1[Admin/Team with tasks.create] --> C2{Select template?}
        C2 -->|Yes| C3[Copy template steps via service-role client]
        C2 -->|No| C4{Select sub-service?}
        C4 -->|Yes| C5[Copy SOP steps via service-role client]
        C4 -->|No| C6[No steps seeded]
        C3 --> C7[Task created: status=pending]
        C5 --> C7
        C6 --> C7
    end

    subgraph Progress["2. Work Task"]
        P1[Status: pending] --> P2[Status: in_progress]
        P2 --> P3[Complete steps in sequence]
        P3 --> P4{All required steps done?}
        P4 -->|No| P5[Cannot complete]
        P4 -->|Yes| P6[Ready to complete]
    end

    subgraph Complete["3. Complete Task"]
        X1[Transition to completed] --> X2{Billable?}
        X2 -->|Yes| X3[Require bill_ref + bill_amount]
        X2 -->|No| X4[Collect ARN / Ref]
        X3 --> X4
        X4 --> X5[Set completed_date, reset verification]
    end

    subgraph Verify["4. Verify (optional)"]
        V1[Task completed] --> V2[Admin/Team with verify_tasks]
        V2 --> V3[Set is_verified=true]
    end

    subgraph Reopen["5. Reopen"]
        R1[Task completed] --> R2[Transition to in_progress]
        R2 --> R3[Clear completed_date, verification]
    end

    C7 --> P1
    P6 --> X1
    X5 --> V1
    V3 --> R1
    R3 --> P2
```

---

## 3. Step Toggle Sequence Enforcement

```mermaid
flowchart TD
    S1[User clicks step checkbox] --> S2{Task closed?}
    S2 -->|Yes| S3[Reject: task is locked]
    S2 -->|No| S4{Checking or unchecking?}
    S4 -->|Checking| S5{All prior steps complete?}
    S5 -->|No| S6[Reject: complete step N-1 first]
    S5 -->|Yes| S7[Allow toggle]
    S4 -->|Unchecking| S8{Any later step complete?}
    S8 -->|Yes| S9[Reject: uncheck step N+1 first]
    S8 -->|No| S10[Allow toggle]
    S7 --> S11{Unchecking within 24h?}
    S10 --> S11
    S11 -->|Same user + <24h| S12[Update: completed_at=null]
    S11 -->|Admin| S12
    S11 -->|Other / >24h| S13[Reject: STEP_LOCKED]
```

---

## 4. Authorization Layers

```mermaid
flowchart LR
    subgraph Layer1["Layer 1: Middleware"]
        M1[Cookie session check]
        M2[Role prefix validation]
        M3[Portal module visibility]
    end

    subgraph Layer2["Layer 2: Server Action"]
        A1[requireRole]
        A2[requireCapability]
        A3[Zod validation]
    end

    subgraph Layer3["Layer 3: Service Logic"]
        S1[canModifyTask]
        S2[canCompleteTask]
        S3[canTransition]
        S4[Step sequence check]
    end

    subgraph Layer4["Layer 4: RLS"]
        R1[tasks_team_view]
        R2[task_steps_team]
        R3[task_activity_visible]
    end

    M1 --> M2 --> M3 --> A1 --> A2 --> A3 --> S1 --> S2 --> S3 --> S4 --> R1 --> R2 --> R3
```

---

## 5. Data Flow — Task Detail Page

```mermaid
flowchart TD
    U[User opens /team/tasks/:id] --> P[Page: team/tasks/[id]/page.tsx]
    P --> R1[repo: getTask]
    P --> R2[repo: getTaskSteps]
    P --> R3[repo: getTaskActivity]
    P --> R4[repo: getTaskNotes]
    P --> R5[repo: getWorkDone]
    P --> R6[repo: getTeamMembers]
    R1 --> N[Normalize FK arrays]
    R2 --> N
    N --> S[TaskDetailShell]
    S --> T1[Tabs: Steps]
    S --> T2[Tabs: Work Done]
    S --> T3[Tabs: Notes]
    S --> T4[Tabs: Overview]
    S --> T5[Tabs: Activity]
    S --> Sidebar[Sidebar: Details + Actions]
    T1 --> TaskStepsPanel
    Sidebar --> TaskActions
```

---

## 6. Attendance Flow

```mermaid
flowchart TD
    A1[Team member opens attendance] --> A2{Check-in or check-out?}
    A2 -->|Check-in| A3[Validate geo-fence]
    A3 --> A4[Record check-in time + location]
    A2 -->|Check-out| A5[Record check-out time]
    A6[Admin opens attendance admin] --> A7{Action?}
    A7 -->|Manual entry| A8[upsertAttendanceAction — admin only]
    A7 -->|Override| A9[overrideAttendanceAction — admin only]
```

---

## 7. Billing / ARN Flow at Completion

```mermaid
flowchart TD
    B1[User selects "completed" transition] --> B2{Task billable?}
    B2 -->|Yes| B3[Show bill_ref + bill_amount inputs]
    B2 -->|No| B4[Hide billing inputs]
    B3 --> B5[User fills billing data]
    B4 --> B6[Show ARN / Ref input]
    B5 --> B6
    B6 --> B7[Show "client visible" checkbox]
    B7 --> B8[Submit transition]
    B8 --> B9{Validation}
    B9 -->|Missing billing| B10[Reject: BILLING_REQUIRED]
    B9 -->|Missing required steps| B11[Reject: STEPS_INCOMPLETE]
    B9 -->|Valid| B12[Save to tasks table]
    B12 --> B13[Display in Notes tab + Details sidebar]
```

---

*End of flowchart document.*
