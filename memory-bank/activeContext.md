# Active Context

## Current Work Focus
**Kalori (Calorie Tracking) Feature - OpenAI Vision API Integration**

We are implementing AI-powered food photo analysis using OpenAI's Vision API to automatically detect food items and calculate nutritional information.

## Recent Changes

### Completed
1. ✅ Created `/api/analyze-food` API route
   - Location: `src/app/api/analyze-food/route.ts`
   - Integrates with OpenAI Vision API (gpt-4o-mini model)
   - Accepts base64 image, returns JSON with nutritional data
   - Error handling for API failures

2. ✅ Added OpenAI API key to environment
   - Created `.env.local` file
   - Added `OPENAI_API_KEY` variable
   - Key is protected on server-side

3. ✅ Kalori page has image upload functionality
   - File input for image selection
   - Base64 conversion via FileReader
   - Image preview before analysis

### In Progress
4. ⚠️ **ISSUE**: Kalori page API integration causing errors
   - Attempted to connect frontend to `/api/analyze-food`
   - System stopped working after integration attempt
   - Reverted to demo mode temporarily
   - Current state: Using setTimeout with mock data

## Current Status

### What Works
- ✅ All pages load correctly
- ✅ Navigation between pages
- ✅ Dashboard displays stats and activities
- ✅ Meditasyon timer functionality
- ✅ AI Chat UI (demo responses)
- ✅ Kalori page with demo data
- ✅ API route exists and is properly configured
- ✅ OpenAI API key is set

### What's Broken
- ❌ Kalori page real API integration
- ❌ Actual food photo analysis
- ❌ Real nutritional data from OpenAI

## Next Steps

### Immediate Priority
1. **Debug Kalori API Integration**
   - Identify why the integration broke the app
   - Check for syntax errors in kalori/page.tsx
   - Verify API route is accessible
   - Test with simple fetch call first
   - Add proper loading states
   - Implement error boundaries

2. **Fix and Test**
   - Restore API integration carefully
   - Test with real food image
   - Verify response format matches expected structure
   - Ensure state updates correctly
   - Save meals to localStorage

3. **Enhance User Experience**
   - Add loading spinner during analysis
   - Better error messages (not just alert)
   - Image preview before upload
   - Ability to edit detected values
   - Delete meals from history

### Future Enhancements
- Connect AI Chat to real OpenAI API
- Add user authentication
- Implement database for data persistence
- Add meal history and statistics
- Export meal logs
- Barcode scanning for packaged foods
- Recipe suggestions based on nutrition goals

## Active Decisions and Considerations

### API Integration Approach
- **Decision**: Use Next.js API routes instead of direct client calls
- **Reason**: Protect API key, handle CORS, add server-side logic
- **Trade-off**: Extra network hop, but more secure

### State Management
- **Decision**: Keep using React hooks, no Redux/Zustand yet
- **Reason**: App is simple, no complex shared state needs
- **When to reconsider**: If multiple pages need same meal data

### Error Handling Strategy
- **Current**: Try-catch with alert() for errors
- **Better**: Toast notifications or inline error messages
- **Future**: Error boundary components

### Data Persistence
- **Current**: LocalStorage for client-side data
- **Limitation**: Data lost if user clears browser data
- **Future**: Backend database (Supabase, Firebase, or custom)

## Important Patterns and Preferences

### Code Style
- Use TypeScript interfaces for all data structures
- Functional components only, no class components
- "use client" directive for client components
- Tailwind utility classes, no custom CSS
- Descriptive variable names in Turkish for UI text

### UI Patterns
- Gradient backgrounds on all pages
- White cards with rounded corners and shadows
- Emoji icons for visual interest
- Hover effects on interactive elements
- Responsive design with mobile-first approach

### API Response Format
```typescript
// Expected from /api/analyze-food
{
  name: string;        // e.g., "Tavuk Göğsü"
  calories: number;    // e.g., 350
  protein: number;     // grams
  carbs: number;       // grams
  fat: number;         // grams
}
```

## Learnings and Project Insights

### What Worked Well
1. **Next.js App Router**: Clean structure, easy routing
2. **Tailwind CSS**: Fast styling, consistent design
3. **TypeScript**: Caught errors early, better DX
4. **Component Structure**: Self-contained pages are easy to manage

### Challenges Encountered
1. **API Integration**: Breaking changes when connecting real API
   - Lesson: Test API separately before integrating
   - Solution: Build incrementally, test each step

2. **State Management**: Meals array not updating correctly
   - Issue: Using `[...meals, newMeal]` in async context
   - Solution: Use functional setState: `setMeals(prev => [...prev, newMeal])`

3. **Environment Variables**: Server restart required after .env changes
   - Lesson: Always restart dev server after .env.local changes
   - Note: Document this in README

### Best Practices Established
1. Always use functional setState when updating based on previous state
2. Keep API keys in .env.local, never commit them
3. Use try-catch for all API calls
4. Provide user feedback for loading and error states
5. Test with real data, not just mock data

## Known Issues

### Critical
- Kalori page API integration broken (reverted to demo mode)

### Minor
- AI Chat uses demo responses, not real API
- No data persistence across browser sessions (localStorage only)
- No user authentication
- Hard-coded demo data in Dashboard

### Technical Debt
- Error handling uses alert() instead of proper UI
- No loading states for async operations
- No input validation on forms
- No image size/type validation
- No rate limiting on API calls