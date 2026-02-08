# UI Components

This directory contains **generic, reusable UI components** that are used across the application.

## Guidelines

1. **No Business Logic**: These components should be presentational only
2. **Props-Driven**: All behavior should be controlled via props
3. **Accessible**: Follow WCAG guidelines (enforced by ESLint)
4. **Typed**: Use TypeScript for all props interfaces

## Examples

- Buttons
- Input fields
- Modal dialogs
- Cards
- Tables
- Loading spinners

## Usage

```tsx
import { Button } from '@/components/ui/button';

<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```
