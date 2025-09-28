# Claude Development Notes

## Project Guidelines

### Testing Policy
- **User handles all testing** - Claude should not include testing steps in todos or implementation plans
- Focus on implementation only
- User will provide feedback on functionality

### Next Strip Movement System
- **Naming Convention:**
  - Main image = x-1 (current viewing image)
  - Next strip shows x and x+1 (next 2 images)
- **Timer:** 3-second interval calls moveNextImages()
- **Movement Logic:** x disappears → x+1 moves to x position → x+2 appears in x+1 position
- **Structure:** All movement functions prepared for future transition addition

### Commands to Remember
- **Lint/Typecheck:** No specific commands found - ask user if needed
- **Cache Busting:** Added ?v=1 to CSS/JS files and cache headers to HTML