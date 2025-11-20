# Technical Context

## Technology Stack

### Core Framework
- **Next.js 16.0.0**
  - App Router (not Pages Router)
  - React Server Components available but not used yet
  - API Routes for backend endpoints
  - Built-in TypeScript support

### Frontend
- **React 19.2.0**
  - Functional components only
  - Hooks: useState, useEffect, useCallback
  - Client components ("use client" directive)

- **TypeScript 5.x**
  - Strict type checking
  - Interface definitions for data structures
  - Type-safe props and state

- **Tailwind CSS 4.x**
  - Utility-first styling
  - Custom gradients and colors
  - Responsive design utilities
  - JIT compilation

### Backend/API
- **OpenAI API**
  - Model: `gpt-4o-mini` (Vision capable)
  - Used for food image analysis
  - Future: Chat completions for AI Chat feature

### Development Tools
- **ESLint 9.x** - Code linting
- **PostCSS** - CSS processing for Tailwind

## Development Setup

### Prerequisites
- Node.js (version compatible with Next.js 16)
- npm or yarn
- OpenAI API key

### Installation
```bash
npm install
```

### Environment Variables
Create `.env.local` in project root:
```
OPENAI_API_KEY=sk-proj-...
```

### Running Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`

### Building for Production
```bash
npm run build
npm start
```

## Technical Constraints

### Browser Compatibility
- Modern browsers only (ES6+ support required)
- No IE11 support
- Mobile browsers: iOS Safari 12+, Chrome Android 80+

### Performance Targets
- Initial page load: < 2s
- API response time: < 3s (depends on OpenAI)
- Smooth 60fps animations

### API Limits
- OpenAI API rate limits apply
- Image size limits for Vision API
- Token limits for completions

## Dependencies

### Production Dependencies
```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "next": "16.0.0"
}
```

### Dev Dependencies
```json
{
  "typescript": "^5",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@tailwindcss/postcss": "^4",
  "tailwindcss": "^4",
  "eslint": "^9",
  "eslint-config-next": "16.0.0"
}
```

## File Structure Conventions

### Page Files
- Location: `src/app/[route]/page.tsx`
- Must export default component
- Use "use client" for client components
- TypeScript with .tsx extension

### API Routes
- Location: `src/app/api/[route]/route.ts`
- Export named functions: GET, POST, PUT, DELETE
- Return NextResponse objects
- TypeScript with .ts extension

### Styles
- Global styles: `src/app/globals.css`
- Component styles: Inline Tailwind classes
- No CSS modules or styled-components

## TypeScript Patterns

### Interface Definitions
```typescript
interface Meal {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  type: "Kahvaltı" | "Öğle" | "Akşam" | "Atıştırmalık";
  image?: string;
}
```

### Component Props
```typescript
interface Props {
  title: string;
  onClick?: () => void;
}

export default function Component({ title, onClick }: Props) {
  // ...
}
```

### State Types
```typescript
const [meals, setMeals] = useState<Meal[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(false);
```

## API Integration Patterns

### OpenAI Vision API Call
```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this food...' },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]
    }],
    max_tokens: 300
  }),
});
```

### Client-Side API Call
```typescript
const response = await fetch('/api/analyze-food', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64Image }),
});
const data = await response.json();
```

## Tool Usage Patterns

### Tailwind Classes
- Spacing: `p-6`, `px-4`, `py-2`, `gap-4`, `space-y-4`
- Colors: `bg-white`, `text-gray-800`, `from-pink-500`
- Borders: `rounded-2xl`, `rounded-full`, `border`
- Shadows: `shadow-lg`, `shadow-xl`
- Effects: `backdrop-blur-sm`, `hover:scale-105`, `transition`

### Next.js Link
```typescript
import Link from "next/link";

<Link href="/dashboard" className="...">
  Dashboard
</Link>
```

### Image Handling
```typescript
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};
```

## Known Technical Debt
- No database (using localStorage)
- No authentication system
- No real-time features
- Limited error handling
- No testing suite
- No CI/CD pipeline
- Hard-coded demo data in some places
- AI Chat not connected to real API yet
- No image optimization
- No analytics tracking