import React from "react";
import { DocsThemeConfig, useConfig, useTheme } from "nextra-theme-docs";
import Image from "next/image";

const currentYear = new Date().getFullYear(); // Get the current year dynamically

// const Logo = () => {
//   return (
//     <Link
//       href="/"
//       style={{
//         display: "inline-flex",
//         alignItems: "center",
//         justifyContent: "center",
//         borderRadius: "0.375rem",
//         outline: "none",
//         transition: "all 0.2s ease-in-out",
//         fontWeight: "bold",
//         fontSize: "1.25rem",
//         height: "2.5rem",
//         width: "2.5rem",
//         border: "1px solid black",
//         color: "black",
//         cursor: "pointer",
//       }}
//       onMouseEnter={(e) => {
//         e.currentTarget.style.backgroundColor = "transparent";
//         e.currentTarget.style.color = "#4b5563"; // Equivalent to gray-800
//       }}
//       onMouseLeave={(e) => {
//         e.currentTarget.style.backgroundColor = "initial";
//         e.currentTarget.style.color = "black";
//       }}
//     >
//       Re
//     </Link>
//   );
// };

const Logo = () => {
  const { resolvedTheme } = useTheme();

  return resolvedTheme === "dark" ? (
    <Image
      src="/logo-white.webp"
      alt="logo"
      width={100}
      height={20}
      priority
    />
  ) : (
    <Image
      src="/logo-black.webp"
      alt="logo"
      width={100}
      height={20}
      priority
    />
  );
};

const config: DocsThemeConfig = {
  logo: <Logo />,
  // head: (
  //   <>
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  //     <meta property="og:title" content="Replyke Docs" />
  //     <meta
  //       property="og:description"
  //       content="Build communities around your content"
  //     />
  //   </>
  // ),
  head() {
    const { frontMatter } = useConfig();
    // return (
    //   <NextSeo
    //     title={frontMatter.title}
    //     titleTemplate="%s | Replyke"
    //     description={frontMatter.description}
    //   />
    // );

    return (
      <>
        <title>{frontMatter.title || "Docs"} | Replyke</title>
        <meta
          name="description"
          content={
            frontMatter.description ||
            "Learn how to integrate add social features into your app in minutes"
          }
        />
      </>
    );
  },
  project: {
    link: "https://github.com/Replyke/docs-v6",
  },
  chat: {
    link: "https://discord.com/invite/REKxnCJzPz",
  },
  docsRepositoryBase: "https://github.com/Replyke/docs-v6",
  footer: {
    content: `© Replyke ${currentYear}`, // Add the year dynamically here
  },
};

export default config;
