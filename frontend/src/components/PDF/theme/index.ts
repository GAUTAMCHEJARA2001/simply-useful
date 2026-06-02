import { StyleSheet } from '@react-pdf/renderer';
import { presets, DesignTokens } from './presets';
import { ThemePreset, PrintDensity } from '../types/printableCommon.types';

export const getThemeStyles = (themePreset: ThemePreset, density: PrintDensity) => {
  const token: DesignTokens = presets[themePreset] || presets.zoho;

  // Spacing scales dynamically based on Print Density
  const spacingMultiplier = density === 'compact' ? 0.7 : density === 'detailed' ? 1.2 : 1.0;
  const padding = (val: number) => val * spacingMultiplier;

  return StyleSheet.create({
    page: {
      paddingTop: 32,
      paddingRight: 28,
      paddingBottom: 40,
      paddingLeft: 28,
      fontSize: token.typography.body,
      fontFamily: 'Helvetica',
      color: token.colors.text,
      backgroundColor: '#FFFFFF',
      flexDirection: 'column',
    },
    
    // Header
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: token.borders.thin,
      borderBottomColor: token.colors.border,
      borderStyle: token.borders.style,
      paddingBottom: padding(token.spacing.md),
      marginBottom: padding(token.spacing.md),
    },
    companySection: {
      flexDirection: 'column',
      maxWidth: '60%',
    },
    logo: {
      height: 45,
      width: 120,
      marginBottom: token.spacing.xs,
      objectFit: 'contain',
    },
    companyName: {
      fontSize: token.typography.heading + 2,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.primary,
      marginBottom: 3,
    },
    companyDetail: {
      fontSize: token.typography.tiny + 0.5,
      color: token.colors.muted,
      marginBottom: 1.5,
      lineHeight: 1.2,
    },
    docBadgeSection: {
      alignItems: 'flex-end',
      maxWidth: '38%',
    },
    docTitleBadge: {
      backgroundColor: token.colors.primary,
      color: '#FFFFFF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 3,
      fontSize: token.typography.heading - 1,
      fontFamily: 'Helvetica-Bold',
      marginBottom: token.spacing.sm,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    metaGrid: {
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 1.5,
    },
    metaLabel: {
      fontSize: token.typography.tiny + 0.5,
      color: token.colors.muted,
      width: 75,
      textAlign: 'right',
      marginRight: 6,
    },
    metaVal: {
      fontSize: token.typography.tiny + 0.5,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.text,
      width: 85,
      textAlign: 'left',
    },

    // Party Information Grid
    partySectionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: token.borders.thin,
      borderBottomColor: token.colors.border,
      borderStyle: token.borders.style,
      paddingBottom: padding(token.spacing.md),
      marginBottom: padding(token.spacing.md),
    },
    partyCol: {
      width: '48%',
      flexDirection: 'column',
    },
    partySectionTitle: {
      fontSize: token.typography.small,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.secondary,
      textTransform: 'uppercase',
      borderBottomWidth: token.borders.thin,
      borderBottomColor: token.colors.border,
      borderStyle: token.borders.style,
      paddingBottom: 2,
      marginBottom: 4,
    },
    partyName: {
      fontSize: token.typography.body,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.text,
      marginBottom: 2,
    },
    partyDetail: {
      fontSize: token.typography.tiny + 0.5,
      color: token.colors.muted,
      lineHeight: 1.3,
      marginBottom: 1.5,
    },

    // Tables
    tableContainer: {
      width: '100%',
      marginVertical: padding(token.spacing.sm),
      borderWidth: token.borders.thin,
      borderColor: token.colors.border,
      borderStyle: token.borders.style,
      borderRadius: 4,
      overflow: 'hidden',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: token.colors.bgHeader,
      borderBottomWidth: token.borders.thin,
      borderBottomColor: token.colors.border,
      borderStyle: token.borders.style,
      alignItems: 'center',
      minHeight: padding(22),
    },
    tableHeaderCell: {
      fontSize: token.typography.small,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.primary,
      padding: padding(4),
    },
    tableBodyRow: {
      flexDirection: 'row',
      borderBottomWidth: token.borders.thin,
      borderBottomColor: token.colors.border,
      borderStyle: token.borders.style,
      alignItems: 'center',
      minHeight: padding(20),
    },
    tableBodyRowAlternate: {
      backgroundColor: token.colors.bgAlternate,
    },
    tableCell: {
      fontSize: token.typography.small,
      color: token.colors.text,
      padding: padding(4),
    },
    
    // Totals Grid
    summaryPaneContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: padding(token.spacing.sm),
      minHeight: 80,
    },
    wordsTermsSection: {
      width: '54%',
      flexDirection: 'column',
    },
    wordsBlock: {
      padding: padding(4),
      backgroundColor: token.colors.bgHeader,
      borderRadius: 4,
      marginBottom: token.spacing.sm,
      borderWidth: token.borders.thin,
      borderColor: token.colors.border,
      borderStyle: token.borders.style,
    },
    wordsTitle: {
      fontSize: token.typography.tiny,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.muted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    wordsContent: {
      fontSize: token.typography.small,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.text,
      lineHeight: 1.2,
    },
    termsBlock: {
      marginTop: 4,
    },
    termsTitle: {
      fontSize: token.typography.tiny + 0.5,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.muted,
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    termsContent: {
      fontSize: token.typography.tiny,
      color: token.colors.muted,
      lineHeight: 1.3,
      marginBottom: 1.5,
    },
    financialTotalsSection: {
      width: '42%',
      flexDirection: 'column',
      borderWidth: token.borders.thin,
      borderColor: token.colors.border,
      borderStyle: token.borders.style,
      borderRadius: 5,
      overflow: 'hidden',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: padding(3.5),
      borderBottomWidth: token.borders.thin,
      borderBottomColor: token.colors.border,
      borderStyle: token.borders.style,
    },
    totalLabel: {
      fontSize: token.typography.tiny + 0.5,
      color: token.colors.muted,
    },
    totalVal: {
      fontSize: token.typography.tiny + 0.5,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.text,
      textAlign: 'right',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: padding(6),
      backgroundColor: token.colors.primary,
    },
    grandTotalLabel: {
      fontSize: token.typography.body,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
    },
    grandTotalVal: {
      fontSize: token.typography.heading,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
      textAlign: 'right',
    },

    // Tax Details Breakout
    taxSection: {
      marginTop: padding(token.spacing.sm),
      marginBottom: padding(token.spacing.sm),
    },

    // Bottom Signatures & Bank section
    bottomGovernanceSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: padding(token.spacing.xl),
      minHeight: 65,
    },
    bankBlock: {
      width: '48%',
      padding: padding(6),
      borderWidth: token.borders.thin,
      borderColor: token.colors.border,
      borderStyle: token.borders.style,
      borderRadius: 4,
      backgroundColor: token.colors.bgAlternate,
    },
    bankTitle: {
      fontSize: token.typography.tiny + 0.5,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.secondary,
      textTransform: 'uppercase',
      marginBottom: 3,
    },
    bankDetailRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    bankLabel: {
      fontSize: token.typography.tiny,
      color: token.colors.muted,
      width: 70,
    },
    bankValue: {
      fontSize: token.typography.tiny,
      color: token.colors.text,
      fontFamily: 'Helvetica-Bold',
    },
    signatureBlock: {
      width: '45%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 2,
    },
    signatureLine: {
      width: '100%',
      borderTopWidth: token.borders.thin,
      borderTopColor: token.colors.text,
      borderStyle: 'solid',
      paddingTop: 4,
      alignItems: 'center',
    },
    signatureTitle: {
      fontSize: token.typography.tiny + 0.5,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.text,
      textTransform: 'uppercase',
    },
    signatureSub: {
      fontSize: token.typography.tiny,
      color: token.colors.muted,
      marginTop: 1,
    },

    // Watermark Component Style
    watermarkContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: -1,
    },
    watermarkText: {
      fontSize: 50,
      fontFamily: 'Helvetica-Bold',
      color: token.colors.primary,
      opacity: token.watermarkOpacity,
      transform: 'rotate(-45deg)',
    },

    // PDF Footer Block
    footerContainer: {
      position: 'absolute',
      bottom: 15,
      left: 28,
      right: 28,
      borderTopWidth: token.borders.thin,
      borderTopColor: token.colors.border,
      borderStyle: token.borders.style,
      paddingTop: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerLeft: {
      fontSize: token.typography.tiny,
      color: token.colors.muted,
    },
    footerRight: {
      fontSize: token.typography.tiny,
      color: token.colors.muted,
      textAlign: 'right',
    },
  });
};
