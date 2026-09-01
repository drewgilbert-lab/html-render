Compares vendors across several dimensions as a static table. Compose cell content from `ShareBar`, `TrendIndicator` and `.icp-tag` pills rather than inlining that markup.

```jsx
<ComparisonTable
  columns={[{ key: 'vendor', label: 'Vendor' }, { key: 'share', label: 'Install Share' }, { key: 'yoy', label: 'YoY Change', align: 'center' }]}
  rows={[{ vendor: 'Salesforce', share: <ShareBar width={38.2} value="38.2%" />, yoy: <TrendIndicator direction="up">+3.1pp</TrendIndicator> }]}
/>
```

The first column is bold `--hg-dark-blue` to anchor each row. Header row uses `--grad-dark-blue-purple`. When the dataset is large enough that readers want to slice it themselves, use `InteractiveTable` instead.
