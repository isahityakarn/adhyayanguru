# StudyYodha Design System

## 🎨 Color Palette

### Primary Colors
```
Primary (Indigo):     #6366F1 - Main brand color, buttons, links
Primary Dark:         #4F46E5 - Hover states
Primary Light:        #818CF8 - Accents
Primary Background:   #EEF2FF - Subtle backgrounds
```

### Secondary Colors
```
Secondary (Amber):    #F59E0B - Call-to-action, highlights
Secondary Dark:       #D97706 - Hover states
Secondary Light:      #FCD34D - Accents
Secondary Background: #FEF3C7 - Badges, pills
```

### Accent Colors
```
Accent (Green):       #10B981 - Success states
Accent Dark:          #059669 - Confirmation
Accent Light:         #34D399 - Positive feedback
Accent Background:    #D1FAE5 - Success messages
```

### Neutral Colors
```
Dark:                 #1F2937 - Headings, primary text
Dark Gray:            #374151 - Secondary text
Gray:                 #6B7280 - Muted text
Light Gray:           #D1D5DB - Borders
Lighter Gray:         #F3F4F6 - Backgrounds
White:                #FFFFFF - Cards, surfaces
Background:           #F9FAFB - Page background
```

### Status Colors
```
Success:              #10B981 - Completed, correct
Warning:              #F59E0B - Attention needed
Error:                #EF4444 - Errors, blocked
Info:                 #3B82F6 - Information
```

## 📝 Typography

### Font Families
```css
Headings:  'Poppins', sans-serif (600, 700, 800)
Body Text: 'Inter', sans-serif (400, 500, 600, 700)
```

### Font Sizes
```
Hero (h1):      48px / 3rem - Landing page hero
Title (h1):     36px / 2.25rem - Page titles
Heading (h2):   24px / 1.5rem - Section headings
Subheading (h3):20px / 1.25rem - Card titles
Body Large:     16px / 1rem - Important text
Body:           14px / 0.875rem - Regular text
Small:          12px / 0.75rem - Captions, meta
```

### Font Weights
```
Regular:  400 - Body text
Medium:   500 - Emphasized text
Semibold: 600 - Subheadings, labels
Bold:     700 - Headings, buttons
```

## 📦 Components

### Cards
```
Background:     White (#FFFFFF)
Border:         1px solid #F3F4F6
Border Radius:  16px
Padding:        20px
Shadow:         0 1px 3px rgba(0,0,0,0.05)
Hover Shadow:   0 10px 25px rgba(0,0,0,0.1)
Transition:     200ms ease
```

### Buttons

**Primary Button:**
```
Background:     #6366F1
Text Color:     #FFFFFF
Padding:        10px 20px
Border Radius:  8px
Font Weight:    600
Hover:          #4F46E5
Active:         scale(0.95)
```

**Secondary Button:**
```
Background:     #F59E0B
Text Color:     #FFFFFF
Padding:        10px 20px
Border Radius:  8px
Font Weight:    600
Hover:          #D97706
```

**Outline Button:**
```
Background:     transparent
Text Color:     #6366F1
Border:         2px solid #6366F1
Padding:        10px 20px
Border Radius:  8px
Hover BG:       #EEF2FF
```

### Input Fields
```
Background:     #FFFFFF
Border:         2px solid #F3F4F6
Border Radius:  8px
Padding:        12px 16px
Focus Border:   #6366F1
Font Size:      14px
```

### Progress Bars
```
Height:         8px
Border Radius:  999px
Background:     #F3F4F6
Fill:           Linear gradient
Animation:      300ms ease
```

### Badges/Pills
```
Padding:        6px 12px
Border Radius:  999px
Font Size:      12px
Font Weight:    600
```

### Navigation Sidebar
```
Width:          256px (64 * 4)
Background:     #FFFFFF
Border:         1px solid #F3F4F6

Active Item:
  Background:   #EEF2FF
  Text Color:   #6366F1
  Icon Color:   #6366F1

Inactive Item:
  Text Color:   #374151
  Icon Color:   #6B7280
```

## 📐 Spacing Scale

```
xs:  4px   - Tight spacing
sm:  8px   - Small gaps
md:  12px  - Default gaps
lg:  16px  - Section spacing
xl:  20px  - Card padding
2xl: 24px  - Large spacing
3xl: 32px  - Section margins
4xl: 48px  - Page margins
```

## 🎭 Shadows

```
Card:         0 1px 3px rgba(0,0,0,0.05)
Card Hover:   0 10px 25px rgba(0,0,0,0.1)
Button:       0 4px 6px rgba(99,102,241,0.2)
Modal:        0 25px 50px rgba(0,0,0,0.25)
```

## ⚡ Animations

```
Fast:         150ms - Micro-interactions
Normal:       200ms - Standard transitions
Slow:         300ms - Large movements
Ease:         ease - Default easing
In-Out:       ease-in-out - Smooth start/end
```

## 🖼️ Icons

**Library:** Lucide React
**Size Scale:**
```
Small:   16px
Medium:  20px
Large:   24px
XLarge:  32px
```

**Usage:**
- Navigation: 18-20px
- Cards: 20-24px
- Headers: 24-32px

## 📱 Breakpoints

```
Mobile:       < 640px
Tablet:       640px - 1024px
Desktop:      > 1024px
```

## ✨ Interactive States

### Hover
```
Cards:        Lift + Shadow increase
Buttons:      Darken background
Links:        Underline + color change
```

### Focus
```
Inputs:       Border color change + ring
Buttons:      Outline ring
Links:        Outline ring
```

### Active
```
Buttons:      Scale down (0.95)
Cards:        Slight scale
```

### Disabled
```
Opacity:      0.5
Cursor:       not-allowed
Background:   Gray
```

## 🎯 Usage Guidelines

1. **Always use the color system** - Don't introduce new colors
2. **Maintain consistent spacing** - Use the spacing scale
3. **Typography hierarchy** - Follow the size/weight guidelines
4. **Accessibility** - Minimum 4.5:1 contrast ratio
5. **Mobile-first** - Design for mobile, enhance for desktop
6. **Performance** - Optimize animations, use CSS transforms
7. **Icons** - Use consistently sized icons from Lucide
8. **Feedback** - Provide visual feedback for all interactions

---

This design system ensures consistency across the entire StudyYodha platform! 🎨
