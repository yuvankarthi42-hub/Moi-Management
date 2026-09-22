# Moi Manager — Mobile-First App Development Prompt

## 1. Product Overview

Build a polished **mobile-first Moi Management application** called **Moi Manager**.

The app is intended for families who organize functions such as:

- Weddings
- Ear piercing ceremonies
- House warming
- Birthday parties
- Baby showers
- Engagements
- Anniversaries
- Puberty ceremonies
- Religious/family functions
- Any other custom function

The primary purpose is to manage:

1. Functions
2. Guests
3. Moi contributions received
4. Function expenses
5. People and their contribution history
6. Invitations
7. Family collaboration
8. Reports and summaries
9. Return Moi / future contribution reminders
10. Backup and restore

### Important product rule

**Moi is the primary concept. Expenses are secondary.**

Do NOT create a monthly budgeting, planned-budget, remaining-budget, or personal finance budgeting module.

Every Moi transaction and every expense must belong to a specific **Function**.

---

# 2. Reference UI / Visual Direction

Use the supplied reference UI image as the primary visual reference.

The generated application should feel like the same product family as the reference:

- Mobile-first
- Premium family-event management application
- Clean white content areas
- Deep purple header/navigation
- Rounded cards
- Soft shadows
- Large touch targets
- Compact but readable information
- Minimal clutter
- One-handed friendly interactions
- Modern iOS/Android visual language

### Primary colors

Use the reference purple as the primary brand color.

Suggested starting palette:

```text
Primary Purple:      #2D198F
Dark Purple:         #18095A
Purple Gradient:     #18095A → #3F20B5
Accent Gold:         #F4C542
Success Green:       #159447
Danger Red:          #E53935
Background:          #F8F8FC
Card:                #FFFFFF
Text Primary:        #171717
Text Secondary:      #737373
Border:              #E8E5EF
```

Do not blindly use these values if the reference image provides a closer visual value. The reference UI should remain the source of truth.

### Logo

Use the **same Moi Manager logo concept and visual language from the supplied reference image**.

The logo should remain consistent across:

- Splash screen
- App icon
- Login/onboarding
- Empty states where appropriate
- Profile/about screen

Do not replace the logo with a generic finance icon.

---

# 3. Platform and Architecture

Build the application as a **mobile-first Flutter application**.

Recommended stack:

```text
Flutter
Dart
Material 3
Drift
SQLite
Repository Pattern
Riverpod / equivalent predictable state-management solution
GoRouter / equivalent routing solution
```

The architecture must support:

```text
UI
 ↓
State / Controller
 ↓
Repository Interface
 ↓
Repository Implementation
 ↓
Local Database / Mock Data
```

Do NOT couple UI screens directly to SQLite.

---

# 4. Development Strategy — IMPORTANT

The project must be developed in two clearly separated stages.

## Stage 1 — Mock Data First

The complete UI and navigation must work **without a database connection**.

Create:

```text
MockFunctionRepository
MockMoiRepository
MockExpenseRepository
MockPersonRepository
MockGuestRepository
MockInvitationRepository
MockReportRepository
```

Use realistic mock data.

The application must be fully navigable with:

- Dashboard
- Functions
- Function details
- Add Function
- Edit Function
- Guest list
- Add guest
- Add Moi
- Moi history
- Add expense
- People
- Person profile
- Invitations
- Reports
- Profile
- Settings

The developer must be able to run the app immediately after cloning/installing dependencies.

There should be **no empty screens caused by missing backend/database data**.

---

## Stage 2 — SQLite / Drift

After the UI and workflows are stable, implement the database using:

```text
Drift + SQLite
```

Replace the mock repositories with real repositories **without changing the UI layer**.

Example:

```dart
abstract class FunctionRepository {
  Future<List<FunctionModel>> getFunctions();
  Future<FunctionModel?> getFunction(String id);
  Future<void> createFunction(FunctionModel function);
  Future<void> updateFunction(FunctionModel function);
  Future<void> deleteFunction(String id);
}
```

Then provide:

```text
MockFunctionRepository
DriftFunctionRepository
```

The UI should depend only on:

```text
FunctionRepository
```

and never directly on:

```text
DriftDatabase
```

---

# 5. Bottom Navigation

Use **5 primary bottom navigation destinations**.

```text
┌─────────────────────────────────────────┐
│ Home │ Functions │   +   │ People │ More │
└─────────────────────────────────────────┘
```

### 1. Home

Dashboard / overview.

### 2. Functions

All family functions.

### 3. Center +

Global quick-action button.

Opening it should show:

```text
Add Function
Add Moi
Add Expense
Add Person
Add Guest
Create Invitation
```

The center + is an action button, not a navigation tab.

### 4. People

Global people directory and contribution history.

### 5. More

Contains:

```text
Reports
Invitations
Guest Check-in
Family Members
Backup & Restore
App Settings
Language
Theme
Help & Support
About Moi Manager
```

Do not overcrowd the bottom navigation.

---

# 6. Home Dashboard

The dashboard should immediately answer:

- How many upcoming functions?
- How much Moi has been collected?
- How much has been spent?
- How many guests?
- How much is currently recorded as balance/remaining collection?
- Which functions are coming soon?
- Which people need Return Moi?
- Recent Moi entries
- Recent functions

### Dashboard cards

Example:

```text
12 Functions
₹8,45,500 Moi
486 Guests
₹1,25,000 Expenses
```

Use compact cards similar to the reference design.

### Upcoming Functions

Show:

- Function image/icon
- Function name
- Date
- Location
- Guest count
- Moi collected
- Days remaining

### Recent Moi

Show:

- Person
- Function
- Amount
- Payment method
- Date/time

### Return Moi reminder

Show people who previously gave Moi and may need to receive/return Moi for their function.

---

# 7. Functions Module

Functions are the central entity of the application.

## Function list

Tabs:

```text
All
Upcoming
Completed
```

Each card should show:

```text
Function icon/image
Function name
Date
Location
Guest count
Moi collected
```

Example:

```text
Harthick Ear Piercing
28 Jul 2026 · 10:00 AM
Tenkasi

156 Guests
₹21,500 Moi
```

## Add Function

Fields:

```text
Function Name *
Function Type *
Date *
Time
Location
Village / City
Expected Guests
Description
Cover Photo
Host / Organizer
```

Function types:

```text
Wedding
Ear Piercing
House Warming
Birthday
Baby Shower
Engagement
Anniversary
Religious Function
Puberty Ceremony
Other
```

Allow custom function types.

---

# 8. Function Details

Function details should have a strong visual header.

Header:

```text
Cover Image
Function Name
Date
Time
Location
```

Summary cards:

```text
Guests
Moi Collected
Moi Entries
Expenses
```

Function-level tabs:

```text
Overview
Moi
Guests
People
Invitation
Photos
Expenses
```

### Overview

Show:

- Function information
- Created date
- Notes
- Moi summary
- Expense summary
- Guest summary
- Quick actions

### Quick actions

```text
+ Add Moi
+ Add Guest
+ Add Expense
Share Invitation
```

---

# 9. Moi Module

Moi is the **core business module**.

## Add Moi

Fields:

```text
Person *
Amount *
Payment Type *
Notes
Photo / Receipt
Date & Time
```

Payment types:

```text
Cash
UPI
Other
```

Allow the person to be selected from the existing People directory.

If the person does not exist:

```text
+ New Person
```

## Moi list

Show:

```text
Person
Amount
Payment Method
Date
Function
```

Support:

- Search
- Filter by function
- Filter by payment type
- Date filter
- Amount sorting
- Person filter

## Moi summary

Show:

```text
Total Entries
Total Amount
Cash
UPI
Other
```

---

# 10. People Module

People are global reusable records.

A person can participate in multiple functions.

Example:

```text
Murugan
98765 43210
Tenkasi

Total Given: ₹2,503
Functions: 3
```

## Person Profile

Show:

```text
Profile photo
Name
Phone
Village / City
Relationship
Notes
```

Actions:

```text
Call
Message
Edit
```

Statistics:

```text
Total Moi Given
Total Moi Received
Functions Participated
```

### History

Show every function and transaction:

```text
Karthick Wedding
₹1,001

Baby Shower
₹501

Harthick Ear Piercing
₹1,001
```

This history must be reusable across functions.

Do not create duplicate people when the same person contributes to another function.

---

# 11. Guest Management

Every function can have its own guest list.

## Guest fields

```text
Person
Phone
Relationship
Family / Group
Village
Number of people
RSVP status
Notes
```

RSVP statuses:

```text
Pending
Accepted
Declined
Maybe
```

Guest list features:

- Search
- Filter
- Sort
- Add guest
- Edit guest
- Remove guest
- Mark attendance
- Bulk add
- Import contacts later
- Share guest list where appropriate

### Guest statistics

```text
Total Guests
Accepted
Pending
Declined
Checked In
```

---

# 12. Invitation Module

Create function-specific invitations.

Invitation should support:

```text
Function name
Date
Time
Venue
Host name
Custom message
Function image
```

Actions:

```text
Preview
Share
Download
Save
```

The initial version can support invitation image/PDF generation.

The invitation must use the same:

- Purple branding
- Moi Manager visual language
- Typography
- Logo

---

# 13. QR Check-in

Keep QR check-in modular so it can be enabled without affecting the rest of the application.

Flow:

```text
Function
 ↓
Guest List
 ↓
QR Check-in
 ↓
Scan / Select Guest
 ↓
Mark Checked In
```

Check-in dashboard:

```text
Checked In: 68
Pending: 88
```

Do not make QR functionality a dependency for basic guest management.

---

# 14. Expense Module

Expenses belong to a **Function**.

There is no separate personal budget module.

## Add Expense

Fields:

```text
Function *
Expense Category *
Amount *
Payment Type
Paid By
Date
Notes
Receipt Photo
```

Categories:

```text
Food
Decoration
Hall
Travel
Photography
Invitation
Clothing
Music
Gifts
Transport
Other
```

## Expense list

Show:

```text
Category
Amount
Payment Type
Paid By
Date
```

Function expense summary:

```text
Total Expenses
Cash
UPI
Other
```

---

# 15. Reports Module

Reports should focus on real-world Moi/function management.

Do not create monthly personal-finance dashboards.

Reports:

```text
Function Report
Person Report
Village Report
Family Report
Return Moi Report
Top Contributors
Moi Collection Report
Expense Report
Payment Method Report
Guest Report
```

## Function Report

Show:

```text
Total Functions
Total Guests
Total Moi
Total Expenses
Average Moi
```

Then list functions.

## Person Report

Show:

```text
Person
Functions
Total Moi
Last Contribution
```

## Village Report

Group people/contributions by village.

Example:

```text
Tenkasi
124 People
₹3,45,000

Madurai
86 People
₹2,10,500
```

## Return Moi Report

Show people who may need a return contribution:

```text
Person
Previous Function
Previous Amount
Upcoming Function
Suggested Amount
Days Left
```

Do not automatically decide the return amount as a financial recommendation. Store/display the user's configured or historically derived amount and allow manual editing.

---

# 16. Family Collaboration

The application should support family members working on the same family/function data.

Entities:

```text
Family
Family Member
Role
Permission
Invitation
```

Roles:

```text
Owner
Admin
Editor
Viewer
```

Permissions should be granular where practical:

```text
View Functions
Create/Edit Functions
View Moi
Add/Edit Moi
Delete Moi
View Expenses
Add/Edit Expenses
Manage Guests
Manage Invitations
View Reports
Manage Family
```

All data must be isolated by the active family/user context.

A user must never see another family's private data.

---

# 17. Search

Provide global search.

Search across:

```text
Functions
People
Moi entries
Guests
Invitations
```

Example:

```text
Search "Murugan"
```

should show:

```text
Person
Functions
Moi transactions
Guest records
```

---

# 18. Filters

Use bottom sheets for mobile-friendly filtering.

Filters:

```text
Function
Date
Person
Village
Payment Type
Moi Amount
Guest Status
Expense Category
```

Avoid desktop-style filter panels.

---

# 19. Notifications / Reminders

Keep notification support modular.

Possible reminders:

```text
Upcoming Function
Function Tomorrow
Pending Guest RSVP
Return Moi Reminder
Backup Reminder
```

Do not spam users.

Allow notification preferences in Settings.

---

# 20. Profile and Settings

Profile screen:

```text
Profile photo
Name
Phone
Email
Family
```

Settings:

```text
My Profile
Family Members
Backup & Restore
App Settings
Theme
Language
Notifications
Privacy
Help & Support
About Moi Manager
Logout
```

Theme:

```text
System
Light
Dark
```

Language:

```text
English
Tamil
```

The UI must be designed so Tamil text does not break layouts.

---

# 21. Backup & Restore

For the local-first version:

```text
Export Backup
Import Backup
```

Backup should include:

```text
Functions
People
Moi
Expenses
Guests
Invitations metadata
Family data
Settings
```

Use a versioned backup format.

Example:

```json
{
  "version": 1,
  "createdAt": "...",
  "functions": [],
  "people": [],
  "moiTransactions": [],
  "expenses": [],
  "guests": []
}
```

Never silently overwrite existing data during restore.

Show confirmation before restore.

---

# 22. Database Design

Use Drift/SQLite.

Recommended tables:

```text
users
families
family_members
functions
function_members
people
moi_transactions
expenses
guests
invitations
invitation_guests
attachments
activity_logs
app_settings
```

### Important relationships

```text
Family
 ├── Family Members
 ├── Functions
 │    ├── Guests
 │    ├── Moi Transactions
 │    ├── Expenses
 │    ├── Invitations
 │    └── Photos
 │
 └── People
      └── Moi History
```

### Moi transaction

Minimum fields:

```text
id
familyId
functionId
personId
amount
paymentType
notes
photoPath
createdAt
updatedAt
createdBy
```

### Expense

Minimum fields:

```text
id
familyId
functionId
category
amount
paymentType
paidBy
notes
receiptPath
createdAt
updatedAt
createdBy
```

### Person

Minimum fields:

```text
id
familyId
name
phone
village
relationship
photoPath
notes
createdAt
updatedAt
```

### Guest

Minimum fields:

```text
id
familyId
functionId
personId
guestName
phone
relationship
groupName
guestCount
rsvpStatus
checkedIn
notes
createdAt
updatedAt
```

---

# 23. Data Isolation

This is mandatory.

Every family/user-owned record must be scoped correctly.

Queries must never return another family's records.

Example:

```text
WHERE familyId = activeFamilyId
```

Do not rely only on UI filtering.

The repository/database layer must enforce the active family scope.

---

# 24. Project Structure

Use a clean feature-based structure.

Suggested:

```text
lib/
├── core/
│   ├── constants/
│   ├── theme/
│   ├── routing/
│   ├── utils/
│   ├── widgets/
│   └── errors/
│
├── data/
│   ├── database/
│   ├── mock/
│   ├── repositories/
│   └── models/
│
├── features/
│   ├── home/
│   ├── functions/
│   ├── moi/
│   ├── people/
│   ├── guests/
│   ├── expenses/
│   ├── invitations/
│   ├── reports/
│   ├── family/
│   ├── profile/
│   └── settings/
│
└── main.dart
```

Do not create one huge file containing the whole application.

---

# 25. Reusable UI Components

Create reusable widgets:

```text
AppHeader
AppBottomNavigation
PrimaryButton
SecondaryButton
StatCard
FunctionCard
PersonCard
MoiTransactionCard
ExpenseCard
GuestCard
InvitationCard
SearchBar
FilterChip
EmptyState
LoadingState
ErrorState
ConfirmationDialog
AmountDisplay
Avatar
StatusBadge
SectionHeader
```

Avoid duplicating UI code between screens.

---

# 26. Mobile UX Rules

The application must be genuinely mobile-first.

### Requirements

- Minimum comfortable touch target: approximately 44x44
- Bottom sheets instead of desktop dialogs where possible
- Keyboard-aware forms
- SafeArea support
- Small-screen support
- Large-screen support without looking like a desktop application
- Pull-to-refresh where useful
- Swipe actions where appropriate
- Floating action button for common actions
- Avoid horizontal scrolling unless unavoidable
- Keep primary actions within thumb reach
- Preserve state when navigating between screens

---

# 27. Forms

All forms must have:

- Clear labels
- Required-field indicators
- Inline validation
- Keyboard-appropriate input types
- Numeric keyboard for amounts
- Phone keyboard for phone numbers
- Date/time picker
- Unsaved-change handling

Amount input should support:

```text
₹1,001
₹21,500
₹2,15,000
```

Use Indian number formatting.

---

# 28. Mock Data

Create realistic mock data for development.

Example functions:

```text
Harthick Ear Piercing
Karthick Wedding
House Warming
Baby Shower
Birthday Party
```

Example people:

```text
Murugan
Ravi Kumar
Kumar
Selvam
Suresh
Priya
Anand
```

Example locations:

```text
Tenkasi
Madurai
Sankarankovil
Courtallam
Sivagiri
```

Use realistic Indian:

- Names
- Phone numbers
- Rupee amounts
- Dates
- Tamil Nadu locations
- Cash/UPI payments

Mock data must demonstrate relationships between functions, people, guests, Moi, and expenses.

---

# 29. Loading / Empty / Error States

Every module must support:

```text
Loading
Loaded
Empty
Error
```

Examples:

```text
No functions yet
No Moi entries yet
No guests yet
No expenses yet
No people yet
No reports available
```

Empty states should include a clear action.

Example:

```text
No functions yet

Create your first function to start tracking
guests, Moi and expenses.

+ Add Function
```

---

# 30. Offline-First Behavior

The app should work without internet for core local operations.

Core operations:

```text
Create Function
Edit Function
Add Person
Add Moi
Add Guest
Add Expense
View Reports
Search
```

should work locally.

Do not make the core UI dependent on an external API.

---

# 31. Future Cloud Sync

Design repositories so cloud sync can be added later.

Do not implement cloud synchronization in the first UI milestone unless explicitly requested.

The architecture should allow:

```text
Mock Repository
        ↓
SQLite Repository
        ↓
Future Sync Repository
```

without rewriting screens.

---

# 32. Performance

Avoid unnecessary rebuilds.

Use:

- Lazy lists
- Pagination where required
- Indexed database fields
- Efficient queries
- Cached calculations where useful
- Image compression
- Lazy image loading

Do not load the complete Moi history into memory for large datasets.

---

# 33. Security

Protect:

- Family data
- Phone numbers
- Contribution records
- Expense records
- Invitation data

Never expose another family's data.

Do not log sensitive personal information unnecessarily.

---

# 34. Accessibility

Support:

- Dynamic text where practical
- Sufficient contrast
- Semantic labels
- Screen reader-friendly buttons
- Large touch targets
- Avoid relying only on color to represent status

---

# 35. UI Quality Requirements

The result should NOT look like a generic Flutter starter app.

Avoid:

```text
Default AppBar
Default ListTile everywhere
Default Material buttons everywhere
Plain unstyled forms
Unstructured screens
Excessive gradients
Excessive animations
```

Use the reference UI for:

- Spacing
- Card radius
- Purple header
- Typography hierarchy
- Icon treatment
- Bottom navigation
- Section spacing
- Stat cards
- Function cards

The application should feel like a polished production product.

---

# 36. Navigation Map

```text
Splash
  ↓
Home
  ├── Functions
  │     ├── Function List
  │     ├── Add Function
  │     └── Function Details
  │           ├── Overview
  │           ├── Moi
  │           ├── Guests
  │           ├── People
  │           ├── Invitation
  │           ├── Photos
  │           └── Expenses
  │
  ├── Moi
  │     ├── Moi List
  │     ├── Add Moi
  │     └── Moi Details/Edit
  │
  ├── People
  │     ├── People List
  │     ├── Add Person
  │     └── Person Profile
  │
  └── More
        ├── Reports
        ├── Invitations
        ├── Guest Check-in
        ├── Family Members
        ├── Backup & Restore
        ├── Settings
        ├── Help
        └── About
```

---

# 37. Quick Add Flow

The center + button is important.

When tapped:

```text
          Add
           +
   ┌──────────────────┐
   │ Add Function     │
   │ Add Moi          │
   │ Add Expense      │
   │ Add Person       │
   │ Add Guest        │
   │ Create Invite    │
   └──────────────────┘
```

After selecting an action, pre-fill context whenever possible.

For example, if the user is inside:

```text
Karthick Wedding
```

and taps:

```text
+ Add Moi
```

the function should already be selected.

---

# 38. Function-Centric Data Rule

This is a critical business rule.

The application must always maintain:

```text
Function
   ├── Moi
   ├── Guests
   ├── Expenses
   ├── Invitation
   └── People participation
```

A Moi transaction must not exist without a Function.

An Expense must not exist without a Function.

A Guest must not exist without a Function.

People are global reusable entities and can participate in multiple functions.

---

# 39. Reports Calculation Rules

All totals must be calculated from transaction data.

Examples:

```text
Total Moi =
SUM(moi_transactions.amount)
WHERE functionId = selectedFunction
```

```text
Total Expenses =
SUM(expenses.amount)
WHERE functionId = selectedFunction
```

```text
Total Guests =
SUM(guest.guestCount)
WHERE functionId = selectedFunction
```

Do not hard-code totals into UI.

Mock data may contain expected values, but the UI must calculate them through the repository/service layer.

---

# 40. Testing

Create tests for:

### Unit tests

```text
Function calculations
Moi totals
Expense totals
Guest totals
Person history
Return Moi calculations
Filtering
Search
Repository methods
```

### Widget tests

Test:

```text
Dashboard
Function list
Function details
Add Moi
Add Expense
Guest list
People list
Reports
Bottom navigation
```

### Database tests

After Drift integration:

```text
Create
Read
Update
Delete
Relationships
Family isolation
Migration
Backup/restore
```

---

# 41. Implementation Order

Follow this exact order.

## Phase 1

```text
1. Create Flutter project
2. Configure theme
3. Configure routing
4. Create bottom navigation
5. Create reusable components
6. Create mock models
7. Create mock repositories
8. Create mock data
9. Build Home
10. Build Functions
11. Build Function Details
12. Build Moi
13. Build People
14. Build Guests
15. Build Expenses
16. Build Invitations
17. Build Reports
18. Build More/Profile
```

## Phase 2

```text
19. Create Drift database
20. Create tables
21. Create DAOs/repositories
22. Add migrations
23. Replace mock repositories
24. Verify all calculations
25. Verify family/user isolation
26. Add backup/restore
27. Add image/file handling
```

## Phase 3

```text
28. Unit tests
29. Widget tests
30. Database tests
31. Error handling
32. Performance optimization
33. Accessibility
34. Final UI polish
```

---

# 42. Definition of Done

The project is considered complete only when:

- App launches successfully
- Mock data is available immediately
- Bottom navigation works
- Center + quick actions work
- Functions can be created/edited
- Function details work
- Moi can be added/edited/deleted
- Expenses can be added/edited/deleted
- Guests can be added/edited
- People can be reused across functions
- Person history works
- Invitations can be created and shared
- Reports calculate real totals
- Search works
- Filters work
- Dark mode works
- Tamil/English structure is supported
- Backup/restore is structured
- Drift SQLite integration works
- No UI screen directly accesses database
- No hard-coded business totals
- Family data isolation is enforced
- No budget-planning module exists
- No unnecessary desktop UI patterns exist
- No major screen is left as a placeholder

---

# 43. Coding Rules for the AI Coding Agent

When implementing this project:

1. Do not create fake functionality that looks complete but does nothing.
2. Do not hard-code business calculations into widgets.
3. Do not directly access SQLite from UI screens.
4. Do not duplicate repository logic.
5. Do not create huge files.
6. Keep widgets small and reusable.
7. Use strongly typed models.
8. Use enums for statuses and payment types.
9. Keep database models separate from UI models where appropriate.
10. Add error handling around repository operations.
11. Keep navigation centralized.
12. Keep theme values centralized.
13. Keep strings centralized for localization.
14. Keep mock data centralized.
15. Do not remove functionality just to make implementation easier.
16. Do not replace the requested mobile UI with desktop/table UI.
17. Do not add a personal budgeting module.
18. Do not create transactions that are not associated with a Function.
19. Do not duplicate People records unnecessarily.
20. Build the UI with production-quality spacing and interaction patterns.

---

# 44. Final Instruction to the Coding Agent

Build **Moi Manager** as a production-quality, mobile-first family function and Moi management application.

Use the supplied reference screenshot as the visual source of truth.

Start with:

```text
Mock Data
→
Complete UI
→
Complete Navigation
→
Complete User Flows
→
Repository Interfaces
→
Drift SQLite
→
Replace Mock Repositories
→
Tests
→
Polish
```

Do not jump directly to database implementation before the mock-data UI is complete.

The first milestone must be runnable and usable entirely with mock data.

The second milestone must replace the mock layer with Drift/SQLite while preserving the same UI and repository contracts.

The final application should feel like a real family product that can be used to organize a function from invitation through guest management, Moi collection, expenses, reporting, and future return-Moi tracking.


---

# 45. Sample UI Screen Reference

Use the following supplied screenshot as the **primary UI reference** while implementing the application.

![Moi Manager Sample UI Reference](moi_manager_sample_ui.png)

### Screens visible in the reference

The reference contains examples of:

1. Splash / Welcome screen
2. Home Dashboard
3. Functions list
4. Function Details
5. Add Moi
6. Moi List
7. People List
8. Person Profile
9. Reports
10. Function Report
11. Return Moi Report
12. Village Report
13. Invitation
14. Guest List
15. QR Check-in
16. Profile & Settings

### UI implementation instruction

Do not simply copy the screenshot as a static design.

Recreate the same **design language and interaction patterns** as real, functional screens:

- Deep purple branded header
- Same logo style
- White rounded cards
- Purple primary actions
- Green success/share actions
- Gold/orange function icons
- Compact statistic cards
- Rounded search and filter controls
- Mobile-friendly bottom navigation
- Consistent card spacing
- Clear typography hierarchy
- Function-specific tabs
- Large touch-friendly actions

The screenshot is a **visual reference**, not a requirement to duplicate every piece of content.

All displayed data must come from the application's mock repositories in Stage 1 and from Drift/SQLite repositories in Stage 2.

### Screen-to-module mapping

| Reference Screen | Moi Manager Module |
|---|---|
| Home | Dashboard |
| Functions | Function Management |
| Function Details | Function Overview |
| Add Moi | Moi Management |
| Moi List | Moi Transactions |
| People | People Directory |
| Person Profile | Person History |
| Reports | Reports |
| Function Report | Function Analytics |
| Return Moi Report | Return Moi |
| Village Report | Village Analytics |
| Invitation | Invitation Management |
| Guest List | Guest Management |
| QR Check-in | Guest Check-in |
| Profile & Settings | Profile / Settings |

### Important

Maintain the same overall visual identity across every new screen, even when a screen is not present in the reference.

New screens such as:

```text
Add Function
Edit Function
Add Expense
Expense Details
Add Person
Add Guest
Invitation Editor
Family Members
Backup & Restore
Search Results
Filter Sheets
```

must use the same design system rather than introducing a different UI style.
