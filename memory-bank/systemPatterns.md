# System Patterns

## Architecture Overview
MentorAi³ uses Next.js 16 App Router with a client-side focused architecture. The app is structured as a multi-page application with shared navigation and consistent styling.

## Project Structure
```
mentorai3/
├── src/
│   └── app/
│       ├── page.tsx              # Homepage
│       ├── layout.tsx            # Root layout
│       ├── globals.css           # Global styles
│       ├── dashboard/
│       │   └── page.tsx          # Dashboard page
│       ├── ai-chat/
│       │   └── page.tsx          # AI Chat page
│       ├── kalori/
│       │   └── page.tsx          # Calorie tracking page
│       ├── meditasyon/
│       │   └── page.tsx          # Meditation page
│       ├── mantra/
│       │   └── page.tsx          # Mantra page
│       ├── admin/
│       │   └── page.tsx          # Admin panel
│       └── api/
│           └── analyze-food/
│               └── route.ts      # OpenAI Vision API endpoint
├── memory-bank/                  # Project documentation
├── .env.local                    # Environment variables
└── package.json
```

## Key Technical Decisions

### 1. Client-Side State Management
- **Pattern**: React hooks (useState, useEffect, useCallback)
- **Rationale**: Simple state needs, no complex global state required
- **Implementation**: Each page manages its own state independently

### 2. Data Persistence
- **Pattern**: LocalStorage for client-side persistence
- **Rationale**: No backend yet, quick prototyping, offline-first
- **Usage**: 
  - User preferences (userName)
  - Mantra counts and history
  - Meal logs (future)
  - Meditation sessions (future)

### 3. API Routes
- **Pattern**: Next.js API Routes in `/app/api/`
- **Rationale**: Server-side API calls to protect API keys
- **Current Routes**:
  - `/api/analyze-food` - OpenAI Vision API for food analysis

### 4. Component Structure
- **Pattern**: Page-level components with inline sub-components
- **Rationale**: Simple app, no need for complex component hierarchy yet
- **Convention**: Each page is self-contained with its own logic

## Design Patterns in Use

### Navigation Pattern
- Consistent header across all pages
- Active page highlighted with gradient background
- Responsive navigation with icon + text on desktop, icon-only on mobile
- Sticky header for always-accessible navigation

### Card Pattern
- White cards with `rounded-2xl` and `shadow-lg`
- Hover effects with `hover:shadow-xl` and `hover:scale-105`
- Consistent padding: `p-6` or `p-8`
- Backdrop blur on headers: `backdrop-blur-sm`

### Gradient Pattern
- Primary gradient: `from-pink-500 via-purple-500 to-blue-500`
- Background gradients: `from-pink-100 via-purple-100 to-blue-100`
- Text gradients: `bg-gradient-to-r ... bg-clip-text text-transparent`
- Button gradients: `from-pink-500 to-purple-500`

### Form Pattern
- Input fields with `rounded-xl` borders
- Focus states with ring colors
- Submit buttons with gradient backgrounds
- Validation feedback inline

## Component Relationships

### Page → API Flow (Kalori)
```
Kalori Page (Client)
  ↓ User uploads image
  ↓ Convert to base64
  ↓ POST /api/analyze-food
     ↓
  API Route (Server)
     ↓ Forward to OpenAI Vision API
     ↓ Parse response
     ↓ Return JSON
  ↓
Kalori Page receives data
  ↓ Update state
  ↓ Display results
  ↓ Save to localStorage
```

### Dashboard Data Flow
```
Dashboard Page
  ↓ useEffect on mount
  ↓ Load from localStorage
     - userName
     - mantras
     - activities
  ↓ Update state
  ↓ Render stats and activities
```

## Critical Implementation Paths

### Image Upload & Analysis
1. User selects image via file input
2. FileReader converts to base64 data URL
3. State updated with `selectedImage`
4. Auto-trigger analysis or manual button click
5. POST to `/api/analyze-food` with base64 image
6. Server calls OpenAI Vision API with specific prompt
7. Response parsed and returned as JSON
8. Client updates meal list with new data
9. Image and data stored in state

### Timer Implementation (Meditation)
1. User selects duration or starts custom timer
2. `setInterval` increments time every second
3. State updates trigger re-render of time display
4. Pause button clears interval
5. Finish button logs session and resets

### LocalStorage Pattern
```typescript
// Save
localStorage.setItem('key', JSON.stringify(data));

// Load
const data = localStorage.getItem('key');
if (data) {
  const parsed = JSON.parse(data);
  setState(parsed);
}
```

## Error Handling Patterns

### API Errors
- Try-catch blocks around fetch calls
- User-friendly error messages via `alert()` (temporary)
- Console logging for debugging
- Graceful fallbacks to demo data

### Image Upload Errors
- File type validation
- Size limits (if needed)
- Clear error messages
- Reset state on error

## Performance Considerations
- Client-side rendering for all pages
- No unnecessary re-renders (useCallback for functions)
- Lazy loading not needed yet (small app)
- Image optimization via Next.js Image component (future)

## Security Patterns
- API keys in `.env.local` (never committed)
- API routes protect sensitive keys from client
- No authentication yet (future feature)
- CORS handled by Next.js automatically