// next.config.mjs
import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx'
})

// now pass only Next.js options here:
export default withNextra({
  output: 'export',          // Next.js 14/15 static-export mode
  images: {
    unoptimized: true        // skip Next’s Image Optimization
  }
})