'use client';

/**
 * Mock Microsoft 365 screens for the setup prequel: the admin consent prompt
 * and the Integrated apps page. Microsoft names appear as plain text next to
 * a "Mock" pill; no Microsoft logos or icons.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Checkbox, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { CheckmarkCircleFilled } from '@fluentui/react-icons';
import { Mark } from '@/components/sirion/Mark';
import { useDemo } from '@/lib/store';
import { CONNECTED_GROUP } from '@/lib/settings';

const useStyles = makeStyles({
  /* The page scrolls inside the app frame, so nothing is ever out of reach on a laptop screen. */
  page: { height: '100%', overflowY: 'auto', backgroundColor: '#F3F2F1', display: 'flex', flexDirection: 'column' },
  bar: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    columnGap: '10px',
    ...shorthands.padding('0', '20px'),
    backgroundColor: '#FFFFFF',
    ...shorthands.borderBottom('1px', 'solid', '#E1DFDD'),
    fontSize: '14px',
    fontWeight: 600,
  },
  card: {
    width: '440px',
    maxWidth: 'calc(100% - 32px)',
    ...shorthands.margin('24px', 'auto'),
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    ...shorthands.padding('28px', '36px', '0'),
    flexShrink: 0,
  },
  /* Cancel and Accept stay on screen while the permissions above scroll. */
  actions: {
    position: 'sticky',
    bottom: '0',
    display: 'flex',
    justifyContent: 'flex-end',
    columnGap: '8px',
    backgroundColor: '#FFFFFF',
    ...shorthands.margin('0', '-36px'),
    ...shorthands.padding('14px', '36px', '24px'),
    ...shorthands.borderTop('1px', 'solid', '#EDEBE9'),
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', fontWeight: 600, ...shorthands.padding('10px', '12px'), ...shorthands.borderBottom('1px', 'solid', '#E1DFDD') },
  td: { ...shorthands.padding('12px'), ...shorthands.borderBottom('1px', 'solid', '#EDEBE9'), verticalAlign: 'top' },
});

function MockPill() {
  return (
    <Badge appearance="outline" color="informative" size="small">
      Mock
    </Badge>
  );
}

export function ConsentMock() {
  const s = useStyles();
  const router = useRouter();
  const update = useDemo((st) => st.updateSetup);
  const [forOrg, setForOrg] = useState(true);
  return (
    <div className={s.page}>
      <div className={s.bar}>
        Microsoft sign-in <MockPill />
      </div>
      <div className={s.card}>
        <div style={{ fontSize: 13, color: tokens.colorNeutralForeground3 }}>it.admin@meridian.example</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '8px 0 12px' }}>Permissions requested</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Mark size={36} tone="dark" />
          <div>
            <div style={{ fontWeight: 600 }}>Sirion Deal Ledger</div>
            <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>sirion.example · App info</div>
          </div>
        </div>
        <p style={{ fontSize: 14, margin: '0 0 8px' }}>This app would like to:</p>
        <ul style={{ fontSize: 13.5, lineHeight: '20px', paddingLeft: 18, margin: '0 0 16px' }}>
          <li>
            <strong>Read mail in connected mailboxes</strong>
            <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>Limited by an application access policy to “{CONNECTED_GROUP}”.</div>
          </li>
          <li>
            <strong>Sign users in</strong>
            <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>Single sign-on for the Outlook and Word add-ins; no passwords.</div>
          </li>
        </ul>
        <Checkbox checked={forOrg} onChange={(_, d) => setForOrg(Boolean(d.checked))} label="Consent on behalf of your organisation" />
        <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3, margin: '8px 0 16px' }}>
          Accepting lets this app use the data above. An organisation admin must approve. You can change this in My Apps.
        </p>
        <div className={s.actions}>
          <Button onClick={() => router.push('/setup')}>Cancel</Button>
          <Button
            appearance="primary"
            data-tour="m365-accept"
            disabled={!forOrg}
            onClick={() => {
              update({ consented: true });
              router.push('/setup');
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

const APPS = [
  { name: 'Sirion for Outlook', what: 'Outlook add-in: matched contract, sync versions, Deal Ledger pane, check at Send' },
  { name: 'Sirion for Word', what: 'Word add-in: review, insert clauses, signing check, publish to Sirion' },
];

export function IntegratedAppsMock() {
  const s = useStyles();
  const router = useRouter();
  const deployed = useDemo((st) => st.setup.deployed);
  const update = useDemo((st) => st.updateSetup);
  return (
    <div className={s.page}>
      <div className={s.bar}>
        Microsoft 365 admin center <MockPill />
        <span style={{ fontWeight: 400, color: tokens.colorNeutralForeground3, marginLeft: 12 }}>Settings › Integrated apps</span>
      </div>
      <div style={{ padding: '24px 32px', maxWidth: 980 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 6px' }}>Integrated apps</h1>
        <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: '0 0 18px' }}>
          Add-ins deployed by an admin start automatically, including on Send. Users get them with single sign-on and nothing to install.
        </p>
        <div style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>App</th>
                <th className={s.th}>Status</th>
                <th className={s.th}>Assigned to</th>
                <th className={s.th}>Deployment</th>
              </tr>
            </thead>
            <tbody>
              {APPS.map((a) => (
                <tr key={a.name}>
                  <td className={s.td}>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>{a.what}</div>
                  </td>
                  <td className={s.td}>
                    {deployed ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckmarkCircleFilled color={tokens.colorPaletteGreenForeground1} /> Deployed
                      </span>
                    ) : (
                      'Not deployed'
                    )}
                  </td>
                  <td className={s.td}>{deployed ? CONNECTED_GROUP : 'Not set'}</td>
                  <td className={s.td}>{deployed ? 'Fixed for Procurement and Legal · Available for everyone else' : 'Not set'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          {!deployed && (
            <Button
              appearance="primary"
              data-tour="m365-deploy"
              onClick={() => {
                update({ deployed: true });
                router.push('/setup');
              }}
            >
              Deploy to “{CONNECTED_GROUP}”
            </Button>
          )}
          <Button onClick={() => router.push('/setup')}>Back to Sirion setup</Button>
        </div>
        <p style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginTop: 14 }}>
          The check at Send needs this admin deployment: Outlook only starts an add-in on Send when an admin deployed it.
        </p>
      </div>
    </div>
  );
}
