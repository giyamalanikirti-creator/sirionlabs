'use client';

/**
 * Our add-in panes use a teal brand theme inside the Microsoft host chrome
 * (§4D). The host stays Microsoft blue; the pane is Sirion teal, which is what
 * "a Sirion add-in inside Microsoft apps" actually looks like.
 */
import { createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';

export const dealLedgerBrand: BrandVariants = {
  10: '#020405',
  20: '#0B1A1D',
  30: '#0D2B30',
  40: '#0E373D',
  50: '#0D444B',
  60: '#0C5159',
  70: '#0C5E69' as string,
  80: '#0C5E69',
  90: '#0F6671',
  100: '#2A7E88',
  110: '#4A96A0',
  120: '#6CAEB6',
  130: '#8FC5CB',
  140: '#B1D0CA',
  150: '#CFE4E2',
  160: '#E8F2F1',
};

export const dealLedgerTheme: Theme = createLightTheme(dealLedgerBrand);
