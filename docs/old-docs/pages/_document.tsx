// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <>
          {/* Load the GA4 library */}
          <script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-R0WW1RW0XF"
          />
          {/* Initialize GA4 */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-R0WW1RW0XF', {
                cookie_domain: 'replyke.com'
              });
            `,
            }}
          />
        </>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
