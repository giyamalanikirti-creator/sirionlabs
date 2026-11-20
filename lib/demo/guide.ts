export const GUIDE_STAGES = [
  { step: 1, title: 'Review round', time: '14 Nov · Rohan’s supplier update', href: '/outlook/ananya?msg=M8', instruction: 'Compare Rohan’s email with clause 14.2 of the attached draft.' },
  { step: 2, title: 'Resolve side thread', time: 'Two days later · 16 Nov', href: '/outlook/ananya?msg=M12', instruction: 'Decide whether to link the side thread, then review both offers.' },
  { step: 3, title: 'Check reply', time: 'Two days later · 18 Nov', href: '/outlook/vikram?msg=M13', instruction: 'Try an annual revision reply and review the warning before sending.', result: '/outlook/vikram?msg=M13&result=warning' },
  { step: 4, title: 'Verify signing copy', time: 'The next day · 19 Nov', href: '/word/v6', instruction: 'Run the check and insert one correction to see what CloudDesk receives.' },
  { step: 5, title: 'See handover', time: 'Two days later · 21 Nov', href: '/contracts/C-2026-0417?tab=obligations', result: '/contracts/C-2026-0417?tab=invoices', instruction: 'Verify the returned copy and follow the signed price through to December’s invoice.' },
] as const satisfies ReadonlyArray<{step: 1 | 2 | 3 | 4 | 5; title: string; time: string; href: string; result?: string; instruction: string}>;
