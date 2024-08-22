const domain = process.env.EMAIL_DOMAIN || 'qualsearch.io';

const EmailAddresses = {
  Noreply: `noreply@${domain}`,
  Support: `support@${domain}`,
  Sales: `sales@${domain}`,
  Abuse: `abuse@${domain}`,
  Admin: `admin@${domain}`,
  Billing: `billing@${domain}`,
  Security: `security@${domain}`,
};

export default EmailAddresses;
