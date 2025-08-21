# Enterprise Keybind Learner PWA - Implementation Plan

## Overview
Create a professional keybind/shortcut learning application that helps you master keyboard shortcuts for tmux, Ghostty, AeroSpace, and other development tools. The app will capture keystrokes, provide visual feedback, track progress, and help build muscle memory through interactive practice.

## Architecture Decision

### Approach: Copy Web Directory to Dotfiles
- Copy `/WebappPWAStarter/web/` to `/dotfiles/keybind-learner/`
- This maintains clean separation while leveraging the full PWA starter
- No API/services needed - purely client-side with local storage
- Static JSON files for keybind data (already present in starter-default-keymaps)

## Core Features

### 1. Keystroke Capture System
- **Global key event listener** with proper event handling
- **Key chord detection** (e.g., Ctrl+B then C for tmux)
- **Modifier key tracking** (Cmd, Ctrl, Alt, Shift)
- **Visual key display** with macOS-style glyphs (⌘ ⌥ ⌃ ⇧)
- **Key sequence buffering** for multi-key commands

### 2. Learning Modes
- **Practice Mode**: Show command, user types shortcut
- **Quiz Mode**: Random commands to test knowledge
- **Reference Mode**: Searchable shortcut directory
- **Muscle Memory Mode**: Timed repetition exercises

### 3. Data Model & Storage
```typescript
interface Keybind {
  tool: 'tmux' | 'ghostty' | 'aerospace' | 'vscode' | 'lazygit';
  key: string;
  modifiers?: string[];
  description: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  context?: string; // e.g., "copy-mode", "normal-mode"
}

interface Progress {
  keybindId: string;
  correctCount: number;
  incorrectCount: number;
  lastPracticed: Date;
  averageTime: number;
  mastered: boolean;
}
```

### 4. UI Components Structure
```
src/
├── components/
│   ├── keybind-learner/
│   │   ├── KeystrokeCapture.tsx     # Event listener & display
│   │   ├── KeyVisualizer.tsx        # Visual keyboard representation
│   │   ├── PracticeMode.tsx         # Interactive practice
│   │   ├── QuizMode.tsx            # Testing interface
│   │   ├── ProgressTracker.tsx      # Statistics & charts
│   │   └── KeybindSearch.tsx       # Reference lookup
│   └── layout/
│       └── LearnerLayout.tsx       # Main app layout
├── hooks/
│   ├── useKeystrokeCapture.ts      # Key event handling
│   ├── useKeySequence.ts           # Multi-key detection
│   └── useProgress.ts              # Progress tracking
├── stores/
│   └── keybindStore.ts             # Zustand store for state
└── utils/
    ├── keyFormatter.ts             # Format keys for display
    ├── keybindParser.ts           # Parse JSON data
    └── progressCalculator.ts      # Spaced repetition logic
```

## Implementation Steps

### Phase 1: Setup & Foundation
1. Copy web directory to dotfiles/keybind-learner
2. Clean up unnecessary auth/API components
3. Set up routing for learner modes
4. Configure PWA manifest for keybind learner

### Phase 2: Keystroke Capture
1. Implement global keystroke listener with:
   - Event.preventDefault() for captured keys
   - Proper cleanup on unmount
   - Cross-browser compatibility
2. Build key sequence detection for multi-key shortcuts
3. Create visual key display component
4. Add modifier key detection and formatting

### Phase 3: Data Integration
1. Load keybind JSON files from starter-default-keymaps
2. Parse and normalize data structure
3. Implement search/filter functionality
4. Set up localStorage for progress tracking

### Phase 4: Learning Features
1. Build Practice Mode:
   - Display command description
   - Capture user input
   - Provide instant feedback
   - Track timing and accuracy
2. Create Quiz Mode:
   - Random selection algorithm
   - Difficulty progression
   - Score tracking
3. Implement spaced repetition for muscle memory

### Phase 5: Progress & Analytics
1. Track per-keybind statistics
2. Generate progress charts (Chart.js integration)
3. Export/import progress data
4. Achievement system for motivation

### Phase 6: Polish & Optimization
1. PWA offline functionality
2. Keyboard navigation throughout app
3. Dark/light theme support
4. Performance optimization
5. Accessibility (ARIA labels, screen reader support)

## Technical Implementation Details

### Keystroke Capture Method
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      timestamp: Date.now()
    };
    
    // Process key for chord detection
    processKeystroke(key);
    
    // Prevent default for captured shortcuts
    if (isLearningMode) {
      e.preventDefault();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Key Features
- **No backend required** - all client-side
- **PWA installable** for native-like experience
- **Responsive design** for mobile practice
- **Keyboard-first navigation**
- **Export keybind data** for team sharing
- **Customizable practice sets**

## Success Metrics
- Load all keybinds from JSON files
- Capture and display keystrokes accurately
- Track progress in localStorage
- Provide smooth, responsive UI
- Work offline after initial load
- Support all major browsers

## Future Enhancements
- Import custom keybind configurations
- Vim mode keybinds
- IDE shortcut training (VS Code, IntelliJ)
- Multiplayer challenges
- AI-powered learning recommendations
- Native app versions via Tauri/Electron

## Keystroke Capture Implementation Guide

### How to Capture Keystrokes in a Web App

#### 1. Global Event Listener Setup
```typescript
// Hook: useKeystrokeCapture.ts
export const useKeystrokeCapture = (options: {
  onKeystroke: (event: KeystrokeEvent) => void;
  preventDefaults?: string[];
  isActive?: boolean;
}) => {
  useEffect(() => {
    if (!options.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keystroke: KeystrokeEvent = {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        timestamp: Date.now(),
        target: e.target as HTMLElement
      };

      // Prevent default for specific key combinations
      const keyCombo = formatKeyCombo(keystroke);
      if (options.preventDefaults?.includes(keyCombo)) {
        e.preventDefault();
        e.stopPropagation();
      }

      options.onKeystroke(keystroke);
    };

    // Capture phase to get events before they bubble
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [options.isActive, options.onKeystroke, options.preventDefaults]);
};
```

#### 2. Key Sequence Detection for Multi-Key Commands
```typescript
// Hook: useKeySequence.ts
export const useKeySequence = (timeout = 1000) => {
  const [sequence, setSequence] = useState<KeystrokeEvent[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const addKeystroke = useCallback((keystroke: KeystrokeEvent) => {
    setSequence(prev => [...prev, keystroke]);
    
    // Clear timeout and set new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setSequence([]);
    }, timeout);
  }, [timeout]);

  const clearSequence = useCallback(() => {
    setSequence([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { sequence, addKeystroke, clearSequence };
};
```

#### 3. Key Formatting for Display
```typescript
// utils/keyFormatter.ts
export const formatKeyForDisplay = (keystroke: KeystrokeEvent): string => {
  const modifiers: string[] = [];
  
  if (keystroke.metaKey) modifiers.push('⌘');
  if (keystroke.ctrlKey) modifiers.push('⌃');
  if (keystroke.altKey) modifiers.push('⌥');
  if (keystroke.shiftKey) modifiers.push('⇧');
  
  const key = formatSpecialKey(keystroke.key);
  
  return [...modifiers, key].join('');
};

const formatSpecialKey = (key: string): string => {
  const specialKeys: Record<string, string> = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↩',
    'Escape': 'Esc',
    'Backspace': '⌫',
    'Delete': '⌦',
    'Tab': '⇥',
    ' ': 'Space'
  };
  
  return specialKeys[key] || key.toUpperCase();
};
```

#### 4. Practice Mode Integration
```typescript
// components/PracticeMode.tsx
export const PracticeMode: React.FC = () => {
  const [currentKeybind, setCurrentKeybind] = useState<Keybind | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  const { sequence, addKeystroke, clearSequence } = useKeySequence();
  
  useKeystrokeCapture({
    onKeystroke: (keystroke) => {
      // Skip if typing in input fields
      if (keystroke.target?.tagName === 'INPUT') return;
      
      addKeystroke(keystroke);
      const inputString = formatSequenceForComparison(sequence);
      setUserInput(inputString);
      
      // Check if matches current keybind
      if (currentKeybind && inputString === currentKeybind.key) {
        setIsCorrect(true);
        // Record success and move to next
        recordProgress(currentKeybind.id, true);
        setTimeout(() => loadNextKeybind(), 1500);
      }
    },
    preventDefaults: currentKeybind ? [currentKeybind.key] : [],
    isActive: true
  });

  return (
    <div className="practice-mode">
      {currentKeybind && (
        <div>
          <h2>Practice: {currentKeybind.description}</h2>
          <div className="key-display">
            Expected: {formatKeyForDisplay(parseKeybind(currentKeybind.key))}
          </div>
          <div className="user-input">
            Your input: {userInput}
          </div>
          {isCorrect !== null && (
            <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✅ Correct!' : '❌ Try again'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 5. Preventing Browser Shortcuts
```typescript
// Prevent specific browser shortcuts during practice
const PREVENTED_SHORTCUTS = [
  'Meta+R',     // Refresh
  'Meta+T',     // New tab
  'Meta+W',     // Close tab
  'Meta+N',     // New window
  'Ctrl+R',     // Refresh
  'Ctrl+T',     // New tab
  'F5',         // Refresh
  'F12'         // Dev tools
];

// In your practice component
useKeystrokeCapture({
  onKeystroke: handleKeystroke,
  preventDefaults: PREVENTED_SHORTCUTS,
  isActive: isPracticeMode
});
```

This approach provides enterprise-level keystroke capture with:
- Cross-browser compatibility
- Proper event handling and cleanup
- Multi-key sequence support
- Visual feedback with macOS-style glyphs
- Prevention of browser shortcuts during practice
- Robust state management for learning progress