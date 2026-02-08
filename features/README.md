# Feature-Sliced Design

This directory uses **Feature-Sliced Design** principles to organize business logic by domain.

## Structure

Each feature should be a self-contained module:

```
features/
├── orders/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── inventory/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
└── production/
    ├── components/
    ├── hooks/
    ├── types/
    └── utils/
```

## Guidelines

1. **Isolation**: Each feature should not directly import from other features
2. **Shared Code**: Use `lib/` and `components/ui/` for shared utilities
3. **Server Actions**: Place in `actions/` directory
4. **Type Safety**: Define feature-specific types in feature's `types/` folder
