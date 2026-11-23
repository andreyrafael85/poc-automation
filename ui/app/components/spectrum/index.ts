/**
 * The "Value Spectrum" components (3.2). Styled by `engine/spectrum.css`, the one stylesheet
 * allowed to draw gradient, glow and painted ink, on the terms `engine.test.ts` sets.
 */
export { BrandGlyph } from './BrandGlyph';
export { FlowMap, type FlowMapNode, type FlowMapProps } from './FlowMap';
export { BRAND_GLYPHS, type BrandGlyph as BrandGlyphName } from './brandGlyphs';
export { GaugeRing, type GaugeRingProps } from './GaugeRing';
export { HeatCalendar, type HeatCalendarProps } from './HeatCalendar';
export { InventoryTile, type InventoryTileProps } from './InventoryTile';
export { KpiHero, type KpiHeroProps } from './KpiHero';
export { ProviderMark, type ProviderMarkProps } from './ProviderMark';
export { SeverityBar, type RiskLevel, type SeveritySegment } from './SeverityBar';
export { SpectrumArea, type SpectrumAreaProps } from './SpectrumArea';
export { SpectrumSpark, type SpectrumSparkProps } from './SpectrumSpark';
export { StackMap, type StackMapProps } from './StackMap';
export { EnvironmentFlow, type EnvironmentFlowProps } from './EnvironmentFlow';
export { StatusRadar, type RadarAxis, type RadarStatus } from './StatusRadar';
export { TechChips, techGlyph, type TechChip } from './TechChips';
export { ThresholdGauge, type GaugeRating, type ThresholdGaugeProps } from './ThresholdGauge';
export { SPECTRUM_FAMILIES, svgId, type SpectrumFamily } from './family';
export { useChartFormat, type ChartFormat } from './chartFormat';
