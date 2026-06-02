/**
 * Layout Safety Guard Service
 * 
 * Manages margin boundaries, precomputes sizes, and coordinates pagination safety 
 * rules to ensure that footers (90px minimum reserve), signature blocks, and grand totals 
 * never bleed across pages or clip content borders.
 */
export const layoutGuard = {
  /** Page dimensions for standard A4 in points (width x height) */
  A4_DIMENSIONS: {
    width: 595.28,
    height: 841.89
  },

  /** Standard margins defined in our print layout guidelines */
  MARGINS: {
    top: 32,
    right: 28,
    bottom: 40,
    left: 28
  },

  /** Safe heights allocated for repeating or structural blocks */
  RESERVED_HEIGHTS: {
    header: 110,
    party: 85,
    tableHeader: 26,
    tableRowEstimated: 22,
    totalsBlock: 120,
    bankSignatureBlock: 110,
    footer: 45,
    footerMinSpacing: 90 // Critical 90px footer bottom safety guard
  },

  /** 
   * Calculates the maximum printable height per A4 page after subtracting 
   * margins and necessary footer spaces.
   */
  getMaxPrintableHeight(): number {
    return this.A4_DIMENSIONS.height - (this.MARGINS.top + this.MARGINS.bottom + this.RESERVED_HEIGHTS.footerMinSpacing);
  },

  /**
   * Estimates whether the document's total height is likely to trigger a page break.
   */
  shouldInjectForceBreak(currentAccumulatedHeight: number, nextSectionHeight: number): boolean {
    const maxHeight = this.getMaxPrintableHeight();
    return (currentAccumulatedHeight + nextSectionHeight) > maxHeight;
  }
};
export type LayoutGuardServiceType = typeof layoutGuard;
