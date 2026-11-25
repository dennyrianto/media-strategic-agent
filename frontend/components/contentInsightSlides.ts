import type PptxGenJS from 'pptxgenjs';
import { ContentInsight } from '../types';

interface DeckColors {
  primary: string;
  accent: string;
  light: string;
}

const IDEAS_PER_SLIDE = 2;

/**
 * Adds the "Content Insight" slides (key contents of virality) to a deck:
 * one overview slide, then the viral content ideas, two per slide.
 * Does nothing for strategies saved before this section existed.
 */
export function addContentInsightSlides(
  pres: PptxGenJS,
  insight: ContentInsight | undefined,
  colors: DeckColors,
  masterName = 'MASTER_SLIDE',
): void {
  if (!insight) return;

  // --- Overview + principles -------------------------------------------------
  const overview = pres.addSlide({ masterName });
  overview.addText('Content Insight: Key Contents of Virality', {
    x: 0.5, y: 0.8, w: 9, fontSize: 24, bold: true, color: colors.primary,
  });
  overview.addText(insight.overview, { x: 0.5, y: 1.4, w: 9, h: 1.1, fontSize: 12, color: '334155', valign: 'top' });

  (insight.viralityPrinciples ?? []).slice(0, 5).forEach((principle, i) => {
    const y = 2.6 + i * 0.52;
    overview.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y, w: 9, h: 0.45, rectRadius: 0.08, fill: { color: colors.light }, line: { color: 'cbd5e1', width: 0.5 },
    });
    overview.addText(`${i + 1}`, { x: 0.6, y, w: 0.4, h: 0.45, fontSize: 14, bold: true, color: colors.accent, align: 'center', valign: 'middle' });
    overview.addText(principle, { x: 1.05, y, w: 8.35, h: 0.45, fontSize: 10, color: '1f2937', valign: 'middle' });
  });

  // --- Viral content ideas ----------------------------------------------------
  const ideas = insight.ideas ?? [];
  for (let start = 0; start < ideas.length; start += IDEAS_PER_SLIDE) {
    const slide = pres.addSlide({ masterName });
    slide.addText('Viral Content Ideas', { x: 0.5, y: 0.8, w: 9, fontSize: 24, bold: true, color: colors.primary });

    ideas.slice(start, start + IDEAS_PER_SLIDE).forEach((idea, col) => {
      const x = 0.5 + col * 4.6;
      const w = 4.4;
      const label = (text: string) => ({ text, options: { bold: true, fontSize: 9, color: colors.accent } });
      const body = (text: string) => ({ text, options: { fontSize: 9, color: '1f2937', breakLine: true } });

      slide.addShape(pres.ShapeType.roundRect, {
        x, y: 1.4, w, h: 3.85, rectRadius: 0.12, fill: { color: 'f8fafc' }, line: { color: colors.accent, width: 1 },
      });
      slide.addText(
        [
          { text: `${start + col + 1}. ${idea.title}`, options: { bold: true, fontSize: 13, color: colors.primary, breakLine: true } },
          { text: idea.concept, options: { fontSize: 9, color: '475569', breakLine: true } },
          label('Hook: '), body(idea.hook),
          label('Why it can go viral: '), body((idea.viralityDrivers ?? []).join(' | ')),
          label('Format & platforms: '), body(idea.formatAndPlatforms),
          label('How to make it: '), body((idea.howToMake ?? []).map((s, i) => `${i + 1}) ${s}`).join('  ')),
          label('Share trigger: '), body(idea.shareTrigger),
          label('For: '), body([idea.targetPersona, idea.linkedBigIdea].filter(Boolean).join('  |  ')),
        ],
        { x: x + 0.1, y: 1.45, w: w - 0.2, h: 3.75, valign: 'top', paraSpaceAfter: 3 },
      );
    });
  }
}
