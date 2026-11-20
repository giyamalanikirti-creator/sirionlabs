export const PREVIEW_EMAIL = 'Hi Ananya, we can extend payment to 60 days if Meridian renews for three years. Please confirm you can commit to that term. Rohan';

export interface Extraction {
  term: string;
  quote: string;
  condition: string;
  uncertainty: string;
}

export const REPLAY_EXTRACTION: Extraction = {
  term: '60-day payment',
  quote: 'we can extend payment to 60 days if Meridian renews for three years',
  condition: 'Meridian must renew for three years.',
  uncertainty: 'CloudDesk made a conditional offer. Meridian’s acceptance is still unconfirmed.',
};
