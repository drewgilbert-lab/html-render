---
page_type: spoke
layout: article
title: What Is Share of Voice in AI Search? Definition, Formula & Example
url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/share-of-voice/
eyebrow: Glossary Term
description: AI Share of Voice is the percentage of tracked brand mentions a brand and its named competitors hold across AI answer engines. Definition, formula, and a worked example.
published: 2026-08-11
updated: 2026-08-11

breadcrumbs:
  - label: Home
    url: https://hginsights.com/
  - label: GEO Resources
    url: https://hginsights.com/geo/
  - label: How to Measure AI Search Visibility
    url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/
  - label: Core Metrics and Vocabulary
    url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/
breadcrumb_label: Share of Voice in AI Search

author:
  name: Devon Marsh
  title: Director of GEO Research, HG Insights
  bio: Published August 11, 2026 &middot; Reviewed quarterly
  url: https://hginsights.com/authors/devon-marsh/

hero:
  thesis: AI Share of Voice is the percentage of tracked brand mentions, a brand's mentions plus every named competitor's mentions, appearing across AI answer engines for a set of tracked prompts. A brand with 40 of 100 mentions holds 40% AI Share of Voice, a share that shifts month over month.

term:
  name: AI Share of Voice
  alternate_name: AI SOV
  term_code: AI-SOV
  definition: AI Share of Voice is the percentage of tracked brand mentions, a brand's mentions plus every named competitor's mentions, appearing across AI answer engines for a set of tracked prompts.
  set_name: Core AI Visibility Metrics and Vocabulary
  set_url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/

faq:
  title: Common Questions About AI Share of Voice
  intro: Terminology questions written to match how GEO practitioners and AI answer engines phrase this metric.
  items:
    - q: What is a typical AI Share of Voice range for a mid-market B2B SaaS brand?
      a: Brands with no established GEO program typically hold single-digit AI Share of Voice against category leaders as of Q3 2026, since mention volume compounds for brands that already have dense, citable third-party content. A brand reaching 15% or higher against three or more named competitors is generally a strong position for a first-year GEO measurement program.
    - q: How often should AI Share of Voice be measured?
      a: Monthly measurement is the practical minimum, because AI answer engines regenerate responses on independent refresh cycles and a single snapshot cannot show whether a brand's share is rising or falling. Some GEO teams add a lighter weekly check on the highest-priority tracked prompts between full monthly reporting cycles.
    - q: Does AI Share of Voice include prompts where no brand is named?
      a: No. AI Share of Voice only counts tracked prompts and answer sources where at least one brand, the tracked brand or a named competitor, actually appears in the generated text. Prompts returning zero brand mentions are excluded from the share calculation but are worth tracking separately as unbranded-answer gaps.
    - q: Why does AI Share of Voice change month over month even without new content?
      a: AI answer engines regenerate responses continuously as automated recrawling updates each engine's underlying source set, so the same tracked prompt can return a different mix of brand mentions from one month to the next even when no brand in the set has published anything new.

citations:
  title: References
  items:
    - source: Gartner
      title: Gartner Predicts Search Engine Volume Will Drop 25% by 2026
      url: https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents
    - source: Princeton University, Georgia Tech & Allen Institute for AI
      title: "GEO: Generative Engine Optimization"
      url: https://arxiv.org/abs/2311.09735
    - source: Google Search Central
      title: AI Features and Your Website
      url: https://developers.google.com/search/docs/appearance/ai-features
    - source: Nielsen
      title: Need to Know: What Is Share of Voice?
      url: https://www.nielsen.com/insights/2025/what-is-share-voice/

related:
  eyebrow: Continue Building Your GEO Measurement Practice
  title: Where to go next from AI Share of Voice
  items:
    - tag: Cluster Hub
      title: Core AI Visibility Metrics and Vocabulary
      url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/
      description: The full index of GEO measurement terms, including AI Share of Voice, mention rate, and citation rate, with plain-language definitions.
      link_text: Explore the Core Metrics and Vocabulary hub
    - tag: Methodology
      title: How to Calculate Share of Voice for AI Search
      url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/how-to-calculate-share-of-voice/
      description: The full formula, a step-by-step worked example, and weighted and per-engine variants of the AI Share of Voice calculation.
      link_text: See the formula and worked example
    - tag: GEO Metrics Framework
      title: Reporting AI Search Visibility to Leadership
      url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/reporting-ai-visibility-to-leadership/
      description: A framework for turning AI Share of Voice and related GEO metrics into a leadership-ready report, including cadence and benchmarks.
      link_text: Build the leadership report
    - tag: Glossary Term
      title: What Is Mention Rate in GEO and AI Search Visibility?
      url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/mention-rate/
      description: The baseline appearance metric AI Share of Voice is most often confused with, defined side by side against it.
      link_text: Read the mention rate definition

cta:
  eyebrow: Put This Metric to Work
  title: See your brand's AI Share of Voice against named competitors
  body: HG Insights tracks brand and competitor mentions across ChatGPT, Gemini, Perplexity, Claude, and Google AI Overviews for a defined set of tracked prompts, refreshed monthly so GEO teams can report a moving number instead of a one-time snapshot.
  buttons:
    - label: Request a Demo
      url: https://hginsights.com/demo
---

## How Does AI Share of Voice Work as a Measurement?

AI Share of Voice measurement starts with a fixed set of tracked prompts: the exact questions buyers type into ChatGPT, Gemini, Perplexity, Claude, and Google AI Overviews while researching a category. GEO teams run each tracked prompt on a recurring schedule and record every brand name that appears in the returned answer text, across every AI answer source in the tracked set.

The AI Share of Voice formula divides one brand's mention count by the combined mention count of every brand named in the same answer set, then multiplies by 100. As of Q3 2026, most GEO monitoring platforms calculate the figure per AI answer source first, then blend the sources into one composite score for reporting.[^2]

```formula
text: AI Share of Voice = (brand mentions ÷ total mentions across the brand and every named competitor) × 100
```

A simple example: across 50 tracked prompts, a vendor earns 80 total brand mentions, and two named competitors earn 60 and 40 mentions respectively, for 180 total mentions across the set. Dividing 80 by 180 yields a 44% AI Share of Voice. The full step-by-step formula, including weighted and per-engine variants, is covered in the companion methodology page linked below.

```callout
label: Why It Matters
body: AI Share of Voice depends on AI crawlers reaching a brand's pages in the first place. TrustRadius customers receive 21 times more AI crawler visits than non-customers, according to TrustRadius internal data, because verified customer review content gives generative engines more citable material to draw on when constructing an answer.
```

## Why Do GEO Teams Track AI Share of Voice?

A GEO or AI Visibility Specialist building a measurement practice for the first time needs a number that translates cleanly into a leadership report and a content roadmap. AI Share of Voice does both: the metric names a competitive gap in a single percentage and points to the specific tracked prompts driving that gap.[^1]

```concept-cards
items:
  - title: Competitive Benchmarking
    body: GEO teams compare AI Share of Voice against every named competitor inside the same tracked prompt set, turning a vague sense of "AI presence" into a specific percentage gap a content team can close prompt by prompt.
  - title: Monthly Trend Reporting
    body: Because AI Share of Voice shifts month over month as answer engines regenerate responses, GEO teams chart the metric on a rolling basis and flag any month where a named competitor's share jumps or a brand's own share drops.
  - title: Prompt-Level Prioritization
    body: Breaking AI Share of Voice down by individual tracked prompt shows exactly which buyer questions a brand is losing, so content teams can prioritize the specific pages most likely to move the number next cycle.
```

## How Does AI Share of Voice Differ From AI Mention Rate?

AI Share of Voice and AI Mention Rate get confused constantly because both come from the same underlying tracked-prompt data set. AI Mention Rate answers a simpler question: did a brand appear at all. AI Share of Voice answers a comparative question: how much of the total conversation a brand holds against every named competitor.[^4]

| Criterion | AI Share of Voice | AI Mention Rate |
|---|---|---|
| What Is Measured | Relative percentage of total tracked mentions a brand holds against every named competitor | Percentage of tracked prompts in which a brand appears at all |
| Denominator | Total mentions across the brand and all named competitors combined | Total number of tracked prompts in the set |
| Competitor Data Required | Yes, competitor mentions must be counted | No, competitor presence is not required |
| Primary Use | Competitive benchmarking and market-position tracking | Baseline visibility and coverage tracking |
| Typical Reporting Cadence | Monthly, to show share shifts over time | Per tracked-prompt-set refresh |

Source: HG Insights GEO monitoring methodology &middot; As of Q3 2026 &middot; Figures illustrate the comparison, not a specific brand's live metrics.

```quote
text: Most GEO and AI Visibility Specialists can recite a brand's organic ranking position from memory. Almost none can state a brand's AI Share of Voice, because until recently no shared definition of what to count existed. Standardizing that one number is the first job of any GEO measurement practice.
name: Devon Marsh
title: Director of GEO Research, HG Insights
link_text: See the calculation methodology
link_url: https://hginsights.com/geo/how-to-measure-ai-search-visibility/core-metrics-vocabulary/how-to-calculate-share-of-voice/
```
