import { expect, test } from "bun:test";
import {
  cleanFileContent,
  ensureExpoPackageJson,
  sanitizeExpoAppJson,
} from "./os";
import { ArtifactProcessor } from "./parser";
import { systemPrompt } from "./systemPrompt";

test("Action with shell and file", async () => {
  const boltAction = `<boltArtifact>
        <boltAction type="shell">
            npm run start
        </boltAction>
        <boltAction type="file" filePath="src/index.js">
            console.log("Hello, world!");
        </boltAction>
    </boltArtifact>`;

  const artifactProcessor = new ArtifactProcessor(
    boltAction,
    (filePath, fileContent) => {
      expect(filePath).toBe("src/index.js");
      expect(fileContent).toContain('console.log("Hello, world!");');
    },
    (shellCommand) => {
      console.log(shellCommand);
      expect(shellCommand).toContain("npm run start");
    },
  );

  await artifactProcessor.parse();
  expect(artifactProcessor.currentArtifact).not.toContain("<boltAction>");
});

test("Action with append", async () => {
  const boltAction = `<boltArtifact>
        <boltAction type="shell">
            npm run start
        </boltAction>
        <boltAction type="file" filePath="src/index.js">
            console.log("Hello, world!");
        </boltAction>
    </boltArtifact>`;

  const artifactProcessor = new ArtifactProcessor(
    boltAction,
    (filePath, fileContent) => {
      expect(filePath).toBe("src/index.js");
      expect(fileContent).toContain('console.log("Hello, world!");');
    },
    (shellCommand) => {
      console.log(shellCommand);
    },
  );

  await artifactProcessor.parse();

  artifactProcessor.append(`
        <boltAction type="shell">
        npm run start
        </boltAction>    
    `);
  await artifactProcessor.parse();
  artifactProcessor.append(`
        <boltAction type="file" filePath="src/index.js">
        console.log("Hello, world!");
        </boltAction>    
    `);
  await artifactProcessor.parse();
  expect(artifactProcessor.currentArtifact).not.toContain("<boltAction>");
});

test("Action with opening tag and content on the same line", async () => {
  let writtenFile = "";
  let writtenContent = "";
  const artifactProcessor = new ArtifactProcessor(
    `<boltAction type="file" filePath="app/index.tsx">import React from "react";
export default function App() {
  return null;
}
</boltAction>`,
    (filePath, fileContent) => {
      writtenFile = filePath;
      writtenContent = fileContent;
    },
    () => {},
  );

  await artifactProcessor.parse();

  expect(writtenFile).toBe("app/index.tsx");
  expect(writtenContent.startsWith('import React from "react";')).toBe(true);
  expect(writtenContent).not.toContain("<boltAction");
});

test("Action can arrive across stream chunks", async () => {
  let writtenFile = "";
  let writtenContent = "";
  const artifactProcessor = new ArtifactProcessor(
    "<boltAct",
    (filePath, fileContent) => {
      writtenFile = filePath;
      writtenContent = fileContent;
    },
    () => {},
  );

  await artifactProcessor.parse();
  artifactProcessor.append(`ion type="file" filePath="app/index.tsx">
console.log("streamed");
</boltAction>`);
  await artifactProcessor.parse();

  expect(writtenFile).toBe("app/index.tsx");
  expect(writtenContent.trim()).toBe('console.log("streamed");');
  expect(artifactProcessor.currentArtifact).not.toContain("<boltAction");
});

test("File cleaner strips bolt tags and markdown fences", () => {
  const cleanedContent = cleanFileContent(`
<boltAction type="file" filePath="app/index.tsx">
\`\`\`tsx
import React from "react";

export default function App() {
  return null;
}
\`\`\`
</boltAction>
`);

  expect(cleanedContent.startsWith('import React from "react";')).toBe(true);
  expect(cleanedContent).not.toContain("<boltAction");
  expect(cleanedContent).not.toContain("```");
});

test("ensureExpoPackageJson adds missing Expo Router runtime deps", () => {
  const result = ensureExpoPackageJson(
    JSON.stringify({
      name: "todo",
      dependencies: {
        expo: "~51.0.0",
        "expo-router": "~3.5.0",
        react: "18.2.0",
      },
    }),
  );
  const pkg = JSON.parse(result);

  expect(pkg.main).toBe("expo-router/entry");
  expect(pkg.dependencies["expo-status-bar"]).toBe("~1.12.1");
  expect(pkg.dependencies["react-native-screens"]).toBe("3.31.1");
  expect(pkg.scripts.web).toBe("npx expo start --web");
});

test("sanitizeExpoAppJson removes missing binary asset refs", () => {
  const result = sanitizeExpoAppJson(
    JSON.stringify({
      expo: {
        name: "Todo",
        icon: "./assets/icon.png",
        splash: {
          image: "./assets/splash.png",
          backgroundColor: "#ffffff",
        },
        android: {
          adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#ffffff",
          },
        },
        web: {
          favicon: "./assets/favicon.png",
          bundler: "metro",
        },
      },
    }),
  );
  const config = JSON.parse(result);

  expect(config.expo.icon).toBeUndefined();
  expect(config.expo.splash.image).toBeUndefined();
  expect(config.expo.splash.backgroundColor).toBe("#ffffff");
  expect(config.expo.android.adaptiveIcon.foregroundImage).toBeUndefined();
  expect(config.expo.web.favicon).toBeUndefined();
  expect(config.expo.web.bundler).toBe("metro");
});

test("System prompt includes current workspace files when provided", () => {
  const prompt = systemPrompt(
    "REACT_NATIVE",
    '<file path="app/index.tsx">export default function App() { return null; }</file>',
  );

  expect(prompt).toContain("<workspace_files>");
  expect(prompt).toContain('path="app/index.tsx"');
  expect(prompt).toContain("preserve user changes");
});

test("System prompt tells the model to match local human code style", () => {
  const prompt = systemPrompt("REACT_NATIVE");

  expect(prompt).toContain("<human_code_style>");
  expect(prompt).toContain("local workspace as the source of truth");
  expect(prompt).toContain("not like a generic LLM output");
});

test("System prompt brands the assistant as Mobile Magic", () => {
  const prompt = systemPrompt("REACT_NATIVE");

  expect(prompt).toContain("You are Mobile Magic");
  expect(prompt).toContain("Mobile Magic creates a SINGLE");
  expect(prompt).not.toContain("You are Bolty");
});

test("System prompt omits workspace files for fresh projects", () => {
  const prompt = systemPrompt("REACT_NATIVE");

  expect(prompt).not.toContain("<workspace_files>");
});
