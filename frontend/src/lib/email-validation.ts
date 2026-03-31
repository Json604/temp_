const BLOCKED_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.fr", "yahoo.de",
  "yahoo.it", "yahoo.es", "yahoo.ca", "yahoo.com.br", "yahoo.com.au",
  "ymail.com", "rocketmail.com",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it",
  "outlook.com", "outlook.co.uk", "live.com", "live.co.uk", "msn.com",
  "aol.com", "aol.co.uk",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "protonmail.ch", "proton.me", "pm.me",
  "zoho.com", "zohomail.com",
  "yandex.com", "yandex.ru", "mail.ru",
  "gmx.com", "gmx.de", "gmx.net", "web.de", "mail.com", "email.com",
  "usa.com", "inbox.com", "fastmail.com", "fastmail.fm", "hushmail.com",
  "tutanota.com", "tutanota.de", "tuta.io",
  "guerrillamail.com", "tempmail.com", "throwaway.email", "mailinator.com",
  "sharklasers.com", "guerrillamailblock.com", "pokemail.net", "dispostable.com",
  "yopmail.com", "trashmail.com", "rediffmail.com",
  "163.com", "126.com", "qq.com", "sina.com",
  "naver.com", "daum.net", "hanmail.net",
  "cox.net", "sbcglobal.net", "att.net", "verizon.net", "comcast.net",
  "charter.net", "earthlink.net", "optonline.net", "frontier.com", "aim.com",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateWorkEmail(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, error: "Please enter your work email address." };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  const domain = trimmed.split("@")[1];

  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: "Please use your company or organisation email address.",
    };
  }

  return { valid: true };
}

export function extractDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1];
}
