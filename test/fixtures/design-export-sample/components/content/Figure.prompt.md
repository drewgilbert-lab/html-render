Frames every image in a document or page the same way.

```jsx
<Figure src="chart-crm-share.png" alt="CRM install share by vendor, Q2 2026"
  caption="Figure 1. CRM install share among companies with 500+ employees, Q2 2026." />
<Figure placeholder="[IMAGE NEEDED] CRM share chart, Q2 2026" caption="Figure 1. …" />
```

Omit `src` to get the dashed draft marker — the placeholder is a functional flag that an asset is outstanding, so never ship one silently.
