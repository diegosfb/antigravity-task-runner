# React

Use a dedicated frontend skill when component architecture is central to the task. These are fallback conventions.

## Components

Define a clear prop contract and keep rendering focused:

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ children, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
```

Prefer composition over configuration-heavy components when it makes the call site clearer.

## Hooks and state

- Extract a custom hook when behavior is reused or becomes easier to test independently—not merely to shorten a component.
- Use functional state updates when the next value depends on the previous value.
- Keep dependency arrays correct; do not suppress hook-lint rules without explaining the invariant.

```typescript
setCount(previousCount => previousCount + 1);
```

## Rendering

Keep states explicit when several conditions compete:

```tsx
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;
return <DataDisplay data={data} />;
```

Short conditional expressions are fine; avoid nested expressions that obscure precedence or missing states.

