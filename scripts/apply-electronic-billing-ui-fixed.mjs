import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const originalPath = 'scripts/apply-electronic-billing-ui.mjs';
const fixedPath = '/tmp/apply-electronic-billing-ui-fixed-runtime.mjs';
let source = fs.readFileSync(originalPath, 'utf8');

source = source.replace(
  'className={`rounded-full border px-2.5 py-1 text-xs font-black ${billingStatusTone(selected.billing.status)}`}',
  'className={"rounded-full border px-2.5 py-1 text-xs font-black " + billingStatusTone(selected.billing.status)}',
);
source = source.replace(
  'className={`rounded-full border px-2.5 py-1 text-xs font-black ${billingStatusTone(selectedBilling.status)}`}',
  'className={"rounded-full border px-2.5 py-1 text-xs font-black " + billingStatusTone(selectedBilling.status)}',
);
source = source.replace(
  '{selectedBilling.verification_digit ? `-${selectedBilling.verification_digit}` : ""}',
  '{selectedBilling.verification_digit ? "-" + selectedBilling.verification_digit : ""}',
);

fs.writeFileSync(fixedPath, source);
await import(`${pathToFileURL(fixedPath).href}?v=${Date.now()}`);
