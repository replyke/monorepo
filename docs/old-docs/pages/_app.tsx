import type { AppProps } from "next/app";
import Head from "next/head";
// import { useConfig } from "nextra-theme-docs";

export default function App({ Component, pageProps }: AppProps) {
  // const { frontMatter } = useConfig();
  // const { title, description } = frontMatter;

  // console.log({ title, description });

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.webp" type="image/webp" />
        {/* <title>{title ? `${title} | Replyke` : "Replyke"}</title>
        {description && <meta name="description" content={description} />} */}
      </Head>
      <Component {...pageProps} />
    </>
  );
}
