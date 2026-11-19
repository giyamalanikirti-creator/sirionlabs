// BUILD_SPEC §8 settings. Everything Finance can turn is here.

export const COST_OF_MONEY = 0.1;
export const MIN_OWN_N = 8;
export const HIGH_CONF_N = 20;
export const READER_CONFIDENCE_MIN = 0.75;
export const SEND_CONFIDENCE_MIN = 0.7;
export const CFO_COMMITMENT_LIMIT_LAKH = 100;
export const CFO_TERM_LIMIT_YEARS = 1;
export const READER_TIMEOUT_MS = 20000;
export const SEND_TIMEOUT_MS = 8000;

// Guard rails shown on /insights.
export const SEND_ANYWAY_RETHINK = 0.5;
export const NEEDS_CONFIRMATION_RETHINK = 3;
export const PRE_PILOT_MEDIAN_DAYS = 9;

// Reader / send-check guards (§9.3).
export const READER_MAX_MESSAGES = 6;
export const READER_MAX_BODY_CHARS = 4000;
export const READER_MAX_TOKENS = 1200;
export const SEND_MAX_DRAFT_CHARS = 2000;
export const SEND_MAX_TOKENS = 300;

// Microsoft's limit on a Smart Alert errorMessage (§4E).
export const SMART_ALERT_MAX_CHARS = 500;
export const TAKE_ACTION_MAX_CHARS = 20;

export const DEMO_DEAL_ID = 'D-CLOUDDESK';
export const CONTRACT_ID = 'C-2026-0417';
export const DEAL_ID_TAG = 'DL-CLOUDDESK-2026';
export const CAPTURE_ADDRESS = 'deals@meridian.example';

// Header-check counter shown on the Threads tab (§8.5).
export const HEADERS_CHECKED = 186;
