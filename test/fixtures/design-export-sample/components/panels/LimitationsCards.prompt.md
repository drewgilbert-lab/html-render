Discloses three or more named caveats in a scannable list — usually right after a methodology section.

```jsx
<LimitationsCards items={[
  { title: 'Install share is not revenue share', body: 'A technology with broad adoption among smaller companies may show high install share while representing a small fraction of revenue.' },
  { title: 'Geographic signal density varies', body: 'Coverage is strongest in North America, Western Europe, and Australia.' }
]} />
```

Titles are melon, matching the left border. For a single inline caveat use `Callout variant="melon"` or `Methodology`'s `caveat` prop.
