import Script from "next/script";
import { googleMeasurementId, shouldLoadGoogleAnalytics } from "@/lib/google";

export function GoogleAnalytics() {
  const measurementId = googleMeasurementId();
  if (!measurementId || !shouldLoadGoogleAnalytics()) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}');`}
      </Script>
    </>
  );
}
