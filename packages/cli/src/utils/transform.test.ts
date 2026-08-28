import { describe, it, expect } from "vitest";

import { transformImports } from "./transform";
import type { SublayConfig } from "../commands/init";

function makeConfig(
  platform: SublayConfig["platform"] = "react"
): SublayConfig {
  return {
    platform,
    style: "styled",
    typescript: true,
    paths: { components: "src/components" },
    aliases: { "@/components": "./src/components" },
  };
}

describe("transformImports — registry 'files/' rewrite", () => {
  // Regression guard for the quote-mismatch bug: the replacements used to
  // hardcode one quote character, so a double-quoted source produced
  // `from "../components/x'` — syntactically broken output that still
  // "contained" the right path. Assert the whole string, not a substring.

  it("rewrites a single-quoted named import", () => {
    expect(
      transformImports(
        "import { Foo } from '../files/bar';",
        makeConfig()
      )
    ).toBe("import { Foo } from '../components/bar';");
  });

  it("rewrites a double-quoted named import", () => {
    expect(
      transformImports(
        'import { Foo } from "../files/bar";',
        makeConfig()
      )
    ).toBe('import { Foo } from "../components/bar";');
  });

  it("rewrites a single-quoted side-effect import", () => {
    expect(transformImports("import '../files/bar';", makeConfig())).toBe(
      "import '../components/bar';"
    );
  });

  it("rewrites a double-quoted side-effect import", () => {
    expect(transformImports('import "../files/bar";', makeConfig())).toBe(
      'import "../components/bar";'
    );
  });

  it("rewrites a single-quoted dynamic import", () => {
    expect(
      transformImports("const m = await import('../files/bar');", makeConfig())
    ).toBe("const m = await import('../components/bar');");
  });

  it("rewrites a double-quoted dynamic import", () => {
    expect(
      transformImports('const m = await import("../files/bar");', makeConfig())
    ).toBe('const m = await import("../components/bar");');
  });

  it("leaves non-registry paths untouched", () => {
    const source = [
      "import { Foo } from './files/bar';",
      "import { Baz } from '../hooks/useBaz';",
    ].join("\n");

    expect(transformImports(source, makeConfig())).toBe(source);
  });
});

describe("transformImports — expo package rewrite", () => {
  it("rewrites @sublay/react-native to @sublay/expo on the expo platform", () => {
    // Note: the replacement normalises to double quotes regardless of input.
    expect(
      transformImports(
        "import { useAuth } from '@sublay/react-native';",
        makeConfig("expo")
      )
    ).toBe('import { useAuth } from "@sublay/expo";');

    expect(
      transformImports(
        'import { useAuth } from "@sublay/react-native";',
        makeConfig("expo")
      )
    ).toBe('import { useAuth } from "@sublay/expo";');
  });

  it("leaves @sublay/react-native alone on the react-native platform", () => {
    const source = 'import { useAuth } from "@sublay/react-native";';

    expect(transformImports(source, makeConfig("react-native"))).toBe(source);
  });
});
