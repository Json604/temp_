const BLOCKED_DOMAINS = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.it",
  "yahoo.es",
  "yahoo.ca",
  "yahoo.com.br",
  "yahoo.com.au",
  "ymail.com",
  "rocketmail.com",
  // Microsoft
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.it",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "live.co.uk",
  "msn.com",
  // AOL
  "aol.com",
  "aol.co.uk",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Proton
  "protonmail.com",
  "protonmail.ch",
  "proton.me",
  "pm.me",
  // Zoho
  "zoho.com",
  "zohomail.com",
  // Russian
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  // Other personal providers
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "web.de",
  "mail.com",
  "email.com",
  "usa.com",
  "inbox.com",
  "fastmail.com",
  "fastmail.fm",
  "hushmail.com",
  "tutanota.com",
  "tutanota.de",
  "tuta.io",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "mailinator.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "pokemail.net",
  "dispostable.com",
  "yopmail.com",
  "trashmail.com",
  "rediffmail.com",
  "163.com",
  "126.com",
  "qq.com",
  "sina.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "cox.net",
  "sbcglobal.net",
  "att.net",
  "verizon.net",
  "comcast.net",
  "charter.net",
  "earthlink.net",
  "optonline.net",
  "frontier.com",
  "aim.com",
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
