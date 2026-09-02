The hero data exhibit — ranks items by a single metric, typically paired with `KeyInsights` in a `1fr 380px` grid.

```jsx
<BarChart title="CRM Install Share — Enterprise Segment" subtitle="500+ employees · 47,218 installs" dateBadge="Q2 2026"
  rows={[
    { label: 'Salesforce', width: 82, value: '38.2%' },
    { label: 'HubSpot', width: 28, value: '11.8%', emphasis: 'accent' },
    { label: 'Other', width: 19, value: '7.9%', emphasis: 'dim' }
  ]}
  source="Source: HG Insights · Q2 2026 · 47,218 verified installs" />
```

Use `variant="stacked"` when each row decomposes into parts and `variant="grouped"` to compare two series per label — both need a `legend`. Keep the series ramp consistent between bars and legend: s1 gradient, s2 blue, s3 light blue, dim gray.
