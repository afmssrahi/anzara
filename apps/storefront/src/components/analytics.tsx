import { publicSettings } from '../lib/api';

/**
 * Injects GA4 / GTM / Meta Pixel scripts into <head>.
 *
 * IDs are read from the public settings endpoint, so turning
 * analytics on is a no-code admin action:
 *
 *   group: 'analytics' (must be `isPublic: true` to be returned here)
 *   - analytics.ga4.measurementId   e.g. G-XXXXXXXXXX
 *   - analytics.gtm.containerId     e.g. GTM-XXXXXXX
 *   - analytics.meta.pixelId        e.g. 1234567890
 *
 * Each is independently optional. Empty / missing -> that
 * vendor is skipped entirely (no empty <script> tags).
 *
 * Render as a server component (async). No client-side JS
 * dependencies — the vendor snippets are self-contained.
 */
export async function AnalyticsScripts() {
  let settings: Record<string, unknown> = {};
  try {
    settings = await publicSettings.all();
  } catch {
    return null;
  }

  // Tolerate both flat and JSON shapes, since SiteSetting.value is `Json`.
  function pick(settingKey: string): string | undefined {
    const v = settings[settingKey];
    if (typeof v === 'string') return v.trim() || undefined;
    if (v && typeof v === 'object') {
      // JSON shape: { id: "G-..." } or { containerId: "GTM-..." }
      const obj = v as Record<string, unknown>;
      for (const k of ['id', 'measurementId', 'containerId', 'pixelId']) {
        const c = obj[k];
        if (typeof c === 'string' && c.trim()) return c.trim();
      }
    }
    return undefined;
  }

  const ga4 = pick('analytics.ga4.measurementId');
  const gtm = pick('analytics.gtm.containerId');
  const meta = pick('analytics.meta.pixelId');

  if (!ga4 && !gtm && !meta) return null;

  return (
    <>
      {/* Google Tag Manager — should be the FIRST script in <head> per GTM docs */}
      {gtm && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
          }}
        />
      )}

      {/* GA4 (gtag.js) — only if no GTM (GTM can deploy GA4 itself) */}
      {ga4 && !gtm && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}',{send_page_view:true});`,
            }}
          />
        </>
      )}

      {/* Meta (Facebook) Pixel */}
      {meta && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`,
          }}
        />
      )}

      <noscript>
        {gtm && (
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        )}
      </noscript>
    </>
  );
}
