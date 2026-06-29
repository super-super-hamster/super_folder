# Settings & UI Conventions

---

## Card Backgrounds & Hover States

All settings card containers use a unified background convention:

| State | Class | Previous (avoid) |
|-------|-------|-----------------|
| Default | `bg-sf-panel/80` | `bg-gray-50` |
| Hover | `bg-sf-item` | `bg-gray-100` |

Apply to: settings cards, tag items, preset rows, sidebar items.

---

## HeroUI Select (Single Select)

Use `onSelectionChange` with destructuring to extract the single selected value:

```tsx
<Select
  selectedKey={value.toString()}
  onSelectionChange={(key) => {
    if (!key || key === 'all') return  // guard against empty/undefined
    const selected = [...(key as unknown as Set<string>)][0]
    if (selected) setValue(Number(selected))
  }}
>
  <Select.Trigger className="bg-sf-input hover:bg-sf-input-hover rounded-full shadow-none border-none h-9 min-h-9 flex items-center px-4 data-[hover=true]:bg-sf-input-hover data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed">
    <Select.Value className="text-sm font-medium text-gray-800 bg-transparent w-full truncate" />
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-data-[open=true]:rotate-180 transition-transform">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </Select.Trigger>
  <Select.Popover className="border border-gray-200 shadow-lg rounded-xl w-32 p-1">
    <ListBox className="gap-1 p-0">
      {options.map((opt) => (
        <ListBox.Item
          key={opt.value}
          id={opt.value.toString()}
          textValue={opt.label}
          className="rounded-lg text-sm font-medium text-gray-800 px-3 py-1.5 data-[hover=true]:bg-gray-100 data-[selected=true]:bg-sf-selected/75 data-[selected=true]:text-black transition-colors cursor-pointer"
        >
          {opt.label}
        </ListBox.Item>
      ))}
    </ListBox>
  </Select.Popover>
</Select>
```

---

## Switch (Green When On)

HeroUI Switch does not apply `data-[selected=true]` to the control element in all cases. Use the render-prop class pattern:

```tsx
<Switch isSelected={value} onChange={setValue}>
  {({ isSelected }) => (
    <Switch.Content>
      <Switch.Control className={isSelected ? 'bg-green-500' : 'bg-gray-300'}>
        <Switch.Thumb />
      </Switch.Control>
    </Switch.Content>
  )}
</Switch>
```

---

## Confirm Modal

Use `useModalStore.openModal('confirm', ...)` for destructive or important actions:

```tsx
useModalStore.getState().openModal('confirm', {
  message: '确定要清空所有缩略图缓存吗？此操作不可撤销。',
  confirmVariant: 'red',     // 'red' | 'green' — controls button color
  confirmButtonText: '确认清空',
  cancelButtonText: '取消',
  onConfirm: async () => {
    // perform the action
  }
})
```

- `confirmVariant: 'red'` → red button (destructive)
- `confirmVariant: 'green'` → green button (positive action like trimming)
- The modal auto-closes after `onConfirm` completes
- Modal type `'confirm'` must be included in `ModalType` union in `modalStore.ts`

---

## Cache Auto-Clean Pattern

```tsx
useEffect(() => {
  if (!cacheLimitEnabled || autoCleanPeriod === 'never') return
  const interval = setInterval(async () => {
    await AutoCleanThumbnailCache(cacheLimitMB)
    fetchSize()
  }, 60000)  // every 60 seconds
  return () => clearInterval(interval)
}, [cacheLimitEnabled, autoCleanPeriod, cacheLimitMB])
```

- Only runs when both `cacheLimitEnabled` is true and `autoCleanPeriod !== 'never'`
- Calls `AutoCleanThumbnailCache(limitMB)` then refreshes the displayed size
- 60-second interval is a simple polling approach (no need for more complex scheduling)

---

## Settings Tab Order

The settings sidebar tabs follow this order (defined in `SettingsSidebar.tsx`):

1. 通用 (General) — nav order, view mode defaults, other options
2. 搜索 (Search) — search presets
3. 标签 (Tags) — tag management
4. 缓存 (Cache) — thumbnail cache management

---

## Zustand Settings Persistence

Prefer `partialize` to persist only specific fields:

```tsx
partialize: (state) => ({
  cacheLimitMB: state.cacheLimitMB,
  cacheLimitEnabled: state.cacheLimitEnabled,
  autoCleanPeriod: state.autoCleanPeriod,
})
```

Only persist what is needed across restarts. UI-only transient state (like `doubleClickOpenMode`) is initialized in `settingsStore` and does not need persistence if the backend also stores it.
