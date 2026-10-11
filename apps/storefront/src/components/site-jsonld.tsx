import { organizationLd, webSiteLd, jsonLdScript } from '@anzara/ui';
import { publicSettings } from '../lib/api';

/**
 * Renders site-wide JSON-LD (Organization + WebSite) into the storefront layout.
 *
 * SameAs + contact email/phone are sourced from the public settings endpoint
 * (social.facebook / social.instagram / social.whatsapp / contact.email),
 * so adding a social handle in admin appears in the JSON-LD without a redeploy.
 */
export async function SiteJsonLd({ siteUrl }: { siteUrl: string }) {
  // Defaults if settings endpoint is unreachable
  const sameAs: string[] = [];
  let contactEmail: string | undefined;
  let whatsapp: string | undefined;
  try {
    const s = await publicSettings.all();
    const fb = typeof s['social.facebook'] === 'string' ? (s['social.facebook'] as string) : '';
    const ig = typeof s['social.instagram'] === 'string' ? (s['social.instagram'] as string) : '';
    const wa = typeof s['social.whatsapp'] === 'string' ? (s['social.whatsapp'] as string) : '';
    if (fb) sameAs.push(fb);
    if (ig) sameAs.push(ig);
    if (wa) {
      // wa.me URLs are nice to surface to search engines
      const phone = wa.replace(/[^0-9+]/g, '').replace(/^\+/, '');
      if (phone) sameAs.push(`https://wa.me/${phone}`);
      whatsapp = wa;
    }
    const email = s['contact.email'];
    if (typeof email === 'string' && email.trim()) contactEmail = email;
  } catch {
    /* non-fatal */
  }

  const org = organizationLd({
    name: 'Anzara',
    url: siteUrl,
    ...(contactEmail ? { contactEmail } : {}),
    ...(whatsapp ? { contactPhone: whatsapp } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  });
  const site = webSiteLd({
    name: 'Anzara',
    url: siteUrl,
    searchUrlTemplate: `${siteUrl}/products?search={search_term_string}`,
  });

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript([org, site]) }}
    />
  );
}
