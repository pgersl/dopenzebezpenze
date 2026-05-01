/**
 * chart-loader.js
 * Renders Observable Plot charts from CSV data via Hugo shortcode data attributes.
 *
 * Dependencies (load before this script):
 *   - Observable Plot  https://cdn.jsdelivr.net/npm/@observablehq/plot/+esm
 *   - D3               https://cdn.jsdelivr.net/npm/d3/+esm
 *
 * Usage in Hugo shortcode output:
 *   <div
 *     class="chart-container"
 *     data-chart-src="data/my-file.csv"
 *     data-chart-type="line"
 *     data-chart-x="year"
 *     data-chart-y="value"
 *     data-chart-color="region"       (optional)
 *     data-chart-title="My Chart"     (optional, overrides shortcode title)
 *   ></div>
 */

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3/+esm";

// ---------------------------------------------------------------------------
// Design System Theme
// Encodes DESIGN.md tokens for all charts. Edit here; applies everywhere.
// ---------------------------------------------------------------------------
const THEME = {
  // Typography
  fontFamily: "Inter, sans-serif",      // Data labels — mathematical clarity

  // Surface
  background: "#f6f3ef",               // surface-container-low

  // Text
  textColor: "#1c1c18",                // on-background — never pure black

  // Data colors
  primary:    "#4C704C",               // main data trend
  secondary:  "#86ac86",               // comparative / second dataset
  tertiary:   "#b9b9ac",               // third dataset or muted series

  // Grid
  gridColor:       "#1c1c18",          // on-surface
  gridOpacity:     0.10,               // outline-variant at 10%

  // Tick / axis labels
  tickColor:       "#1c1c18",
  tickOpacity:     0.45,

  // Tooltip (glassmorphic — styled separately in CSS, referenced here for JS)
  tooltipBackground: "#f6f3ef",   // inverse-surface
  tooltipTextColor:  "#f6f3ef",                  // inverse-on-surface
  tooltipBlur:       "12px",

  // Axis formatting
  xTickFormat: null,               // set after d3 is available — see below

  // Chart geometry
  marginTop:    28,
  marginRight:  32,
  marginBottom: 48,
  marginLeft:   56,
};

// Ordered palette used when "color" encoding maps to a categorical variable.
// Drawn from primary → secondary → tertiary and two muted midpoints.
const CATEGORICAL_PALETTE = [
  "#4C704C",
  "#86ac86",
  "#b9b9ac",
  "#0a0f0a",
  "#b19b81",
];

// Initialise formatting that depends on d3 being loaded.
// "d" = plain integer, no thousand separator — correct default for year axes.
THEME.xTickFormat = d3.format("d");

// ---------------------------------------------------------------------------
// Tip options helper
// Centralises tooltip styling + x-axis format so all builders stay in sync.
// ---------------------------------------------------------------------------
function tipOptions(opts) {
  return {
    fill:       THEME.tooltipBackground,
    stroke:     "none",
    color:      THEME.tooltipTextColor,
    fontFamily: THEME.fontFamily,
    format:     { x: opts.xFormat ? d3.format(opts.xFormat) : THEME.xTickFormat },
  };
}


// ---------------------------------------------------------------------------
// Chart builders
// Each function receives (data, opts) and returns a Plot specification object.
// ---------------------------------------------------------------------------

/**
 * Shared Plot config applied to every chart type.
 */
function baseConfig(opts) {
  return {
    width:        opts.width,
    marginTop:    THEME.marginTop,
    marginRight:  THEME.marginRight,
    marginBottom: THEME.marginBottom,
    marginLeft:   THEME.marginLeft,
    background:   THEME.background,
    style: {
      fontFamily:  THEME.fontFamily,
      color:       THEME.textColor,
      background:  THEME.background,
    },
    x: {
      label:       opts.x ?? null,
      tickFormat:  opts.xFormat ? d3.format(opts.xFormat) : THEME.xTickFormat,
      tickSize:    4,
      tickColor:   `rgba(28,28,24,${THEME.tickOpacity})`,
      labelColor:  THEME.textColor,
      grid:        false,
    },
    y: {
      label:       opts.yLabel ?? null,
      tickSize:    0,
      tickColor:   `rgba(28,28,24,${THEME.tickOpacity})`,
      labelColor:  THEME.textColor,
      grid:        true,
      gridColor:   `rgba(28,28,24,${THEME.gridOpacity})`,
    },
    color: opts.color
      ? {
          legend:  true,
          range:   CATEGORICAL_PALETTE,
          label:   opts.color,
        }
      : undefined,
  };
}

/**
 * Resolve the fill/stroke value: categorical field name or primary color.
 */
function colorEncoding(opts) {
  return opts.color ? opts.color : THEME.primary;
}

// --- Line chart ------------------------------------------------------------
function buildLine(data, opts) {
  return Plot.plot({
    ...baseConfig(opts),
    marks: [
      Plot.gridY({ stroke: THEME.gridColor, strokeOpacity: THEME.gridOpacity }),
      Plot.line(data, {
        x:      opts.x,
        y:      opts.y,
        stroke: colorEncoding(opts),
        strokeWidth: 2,
        curve:  "monotone-x",
      }),
      Plot.dot(data, Plot.pointerX({
        x:    opts.x,
        y:    opts.y,
        fill: colorEncoding(opts),
        r:    4,
      })),
      Plot.tip(data, Plot.pointerX({ x: opts.x, y: opts.y, ...tipOptions(opts) })),
    ],
  });
}

// --- Bar chart (vertical) -------------------------------------------------
function buildBar(data, opts) {
  const stacked = Plot.stackY({
    x:    opts.x,
    y:    opts.y,
    fill: colorEncoding(opts),
  });

  return Plot.plot({
    ...baseConfig(opts),
    x: {
      ...baseConfig(opts).x,
      tickRotate: -90,
    },
    marks: [
      Plot.gridY({ stroke: THEME.gridColor, strokeOpacity: THEME.gridOpacity }),
      Plot.barY(data, stacked),
      Plot.tip(data, Plot.pointerX(Plot.stackY({
        x:     opts.x,
        y:     opts.y,
        z:     opts.color ?? null,
        filter: null,
        ...(opts.yLabel ? { channels: { [opts.yLabel]: "_value" } } : {}),
        ...tipOptions(opts),
      }))),
    ],
  });
}

// --- Scatter plot ---------------------------------------------------------
function buildScatter(data, opts) {
  return Plot.plot({
    ...baseConfig(opts),
    marks: [
      Plot.gridY({ stroke: THEME.gridColor, strokeOpacity: THEME.gridOpacity }),
      Plot.gridX({ stroke: THEME.gridColor, strokeOpacity: THEME.gridOpacity }),
      Plot.dot(data, {
        x:       opts.x,
        y:       opts.y,
        fill:    colorEncoding(opts),
        r:       4,
        opacity: 0.80,
      }),
      Plot.tip(data, Plot.pointer({ x: opts.x, y: opts.y, ...tipOptions(opts) })),
    ],
  });
}

// --- Area chart -----------------------------------------------------------
function buildArea(data, opts) {
  return Plot.plot({
    ...baseConfig(opts),
    marks: [
      Plot.gridY({ stroke: THEME.gridColor, strokeOpacity: THEME.gridOpacity }),
      Plot.areaY(data, {
        x:       opts.x,
        y:       opts.y,
        fill:    colorEncoding(opts),
        fillOpacity: 0.18,
        curve:   "monotone-x",
      }),
      Plot.line(data, {
        x:           opts.x,
        y:           opts.y,
        stroke:      colorEncoding(opts),
        strokeWidth: 2,
        curve:       "monotone-x",
      }),
      Plot.tip(data, Plot.pointerX({ x: opts.x, y: opts.y, ...tipOptions(opts) })),
    ],
  });
}

// --- Histogram ------------------------------------------------------------
// Uses only the `x` field; `y` becomes the count automatically.
function buildHistogram(data, opts) {
  return Plot.plot({
    ...baseConfig(opts),
    marks: [
      Plot.gridY({ stroke: THEME.gridColor, strokeOpacity: THEME.gridOpacity }),
      Plot.rectY(data, Plot.binX(
        { y: "count" },
        {
          x:    opts.x,
          fill: THEME.primary,
        }
      )),
      Plot.tip(data, Plot.pointerX(Plot.binX(
        { y: "count" },
        { x: opts.x, ...tipOptions(opts) }
      ))),
    ],
  });
}

// --- Heatmap --------------------------------------------------------------
// x and y are both categorical; intensity derived from a third field
// supplied via data-chart-fill, falling back to count if absent.
function buildHeatmap(data, opts) {
  const hasFill = opts.fill ?? null;
  return Plot.plot({
    ...baseConfig(opts),
    color: {
      scheme:   "Greens",           // fits primary palette
      legend:   true,
      reverse:  false,
    },
    marks: [
      Plot.cell(data, {
        x:     opts.x,
        y:     opts.y,
        fill:  hasFill ?? Plot.identity,
        inset: 0.5,
      }),
      Plot.tip(data, Plot.pointer({ x: opts.x, y: opts.y, ...tipOptions(opts) })),
    ],
  });
}

// ---------------------------------------------------------------------------
// Wide → long fold
// Converts multi-column ("wide") data into a single-value-per-row ("long")
// format that Plot's color encoding can group into separate series.
// e.g. { Rok: 1990, Muzi: 68.1, Zeny: 75.3 }
//   → { Rok: 1990, _value: 68.1, _series: "Muzi" }
//      { Rok: 1990, _value: 75.3, _series: "Zeny" }
// ---------------------------------------------------------------------------
function foldData(data, xField, yFields) {
  return data.flatMap(row =>
    yFields.map(field => ({
      [xField]: row[xField],
      _value:   row[field],
      _series:  field,
    }))
  );
}

function xTickInterval(data, xField, width) {
  const uniqueX = new Set(data.map(d => d[xField])).size;
  const targetTicks = Math.floor(width / 60);   // ~60px per tick label minimum
  return uniqueX <= targetTicks ? 1 : Math.ceil(uniqueX / targetTicks);
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------
const BUILDERS = {
  line:      buildLine,
  bar:       buildBar,
  scatter:   buildScatter,
  area:      buildArea,
  histogram: buildHistogram,
  heatmap:   buildHeatmap,
};

// ---------------------------------------------------------------------------
// CSV loader + renderer
// ---------------------------------------------------------------------------

/**
 * Parse all data attributes from a .chart-container element into an opts object.
 */
function parseOptions(el) {
  const d = el.dataset;
  const rawY = d.chartY ?? null;
  const isWide = rawY?.includes(",") ?? false;
  return {
    src:     d.chartSrc    ?? null,
    type:    d.chartType   ?? "line",
    x:       d.chartX      ?? null,
    y:       isWide ? null : rawY,
    yFields: isWide ? rawY.split(",").map(s => s.trim()) : null,
    yLabel: d.chartYLabel ?? null,
    color:   d.chartColor  ?? null,     // optional categorical color field
    fill:    d.chartFill   ?? null,     // optional quantitative fill field (heatmap)
    xFormat: d.chartXFormat ?? null,   // optional D3 format string override for x axis
    title:   d.chartTitle  ?? null,
  };
}

/**
 * Fetch and parse a CSV file. Returns a typed array via d3.autoType.
 */
async function loadCSV(src) {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`chart-loader: failed to fetch "${src}" (${response.status})`);
  }

  let text = await response.text();

  // Strip UTF-8 BOM (common in Czech/Windows exports).
  text = text.replace(/^\uFEFF/, "");

  // Auto-detect delimiter: semicolon vs comma.
  const delimiter = text.split(";").length > text.split(",").length ? ";" : ",";
  const parser = d3.dsvFormat(delimiter);

  // Normalise Czech decimal comma → decimal point before autoType runs.
  // Only replaces commas flanked by digits to avoid corrupting text fields.
  const normalised = delimiter === ";" ? text.replace(/(\d),(\d)/g, "$1.$2") : text;

  return parser.parse(normalised, d3.autoType);
}

/**
 * Render a single chart container element.
 */
async function renderChart(el) {
  const opts = parseOptions(el);

  if (!opts.src) {
    console.warn("chart-loader: missing data-chart-src on", el);
    return;
  }
  if (!opts.x) {
    console.warn("chart-loader: missing data-chart-x on", el);
    return;
  }

  // Derive a responsive width from the container, falling back to 640.
  const width = el.clientWidth > 0 ? el.clientWidth : 640;

  try {
    const raw = await loadCSV(opts.src);

    const builder = BUILDERS[opts.type];
    if (!builder) {
      console.warn(`chart-loader: unknown chart type "${opts.type}". Supported: ${Object.keys(BUILDERS).join(", ")}`);
      return;
    }

    // Fold wide data into long format when multiple y columns are supplied.
    let data = raw;
    let plotOpts = { ...opts, width };
    if (opts.yFields) {
      data = foldData(raw, opts.x, opts.yFields);
      plotOpts = { ...plotOpts, y: "_value", color: "_series" };
    }

    const chart = builder(data, plotOpts);

    // Observable Plot returns a DOM node — append it directly.
    el.innerHTML = "";
    el.appendChild(chart);

  } catch (err) {
    console.error("chart-loader:", err);
    // Surface the error visibly in development without hard-crashing the page.
    el.innerHTML = `<pre style="color:${THEME.textColor};font-family:${THEME.fontFamily};opacity:0.5;font-size:0.8rem;padding:1rem">${err.message}</pre>`;
  }
}

// ---------------------------------------------------------------------------
// Responsive resize
// Re-renders all charts when the viewport width changes.
// Debounced at 300ms — matches DESIGN.md "weighted" transition timing.
// ---------------------------------------------------------------------------
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Entry point — runs after DOM is ready
// ---------------------------------------------------------------------------
function init() {
  const containers = Array.from(
    document.querySelectorAll(".chart-container[data-chart-src]")
  );
  if (containers.length === 0) return;

  // Initial render
  containers.forEach(el => renderChart(el));

  // Re-render on resize
  const handleResize = debounce(
    () => containers.forEach(el => renderChart(el)),
    300
  );
  window.addEventListener("resize", handleResize);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}