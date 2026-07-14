/*
    <boltArtifact>
        <boltAction type="shell">
            npm run start
        </boltAction>
        <boltAction type="file" filePath="src/index.js">
            console.log("Hello, world!");
        </boltAction>
    </boltArtifact>
*/

export class ArtifactProcessor {
  public currentArtifact: string;
  private onFileContent: (
    filePath: string,
    onFileContent: string,
  ) => void | Promise<void>;
  private onShellCommand: (shellCommand: string) => void | Promise<void>;

  constructor(
    currentArtifact: string,
    onFileContent: (
      filePath: string,
      fileContent: string,
    ) => void | Promise<void>,
    onShellCommand: (shellCommand: string) => void | Promise<void>,
  ) {
    this.currentArtifact = currentArtifact;
    this.onFileContent = onFileContent;
    this.onShellCommand = onShellCommand;
  }

  append(artifact: string) {
    this.currentArtifact += artifact;
  }

  private getAttribute(source: string, name: string) {
    const match = source.match(
      new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
    );

    return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
  }

  private keepOnlyPotentialPartialTag() {
    const lastTagStart = this.currentArtifact.lastIndexOf("<");
    this.currentArtifact =
      lastTagStart === -1 ? "" : this.currentArtifact.slice(lastTagStart);
  }

  async parse() {
    const actionOpenTag = /<boltAction\b([^>]*)>/i;
    const actionCloseTag = /<\/boltAction>/i;

    while (true) {
      const startMatch = actionOpenTag.exec(this.currentArtifact);

      if (!startMatch) {
        this.keepOnlyPotentialPartialTag();
        return;
      }

      const actionStart = startMatch.index;
      const actionContentStart = actionStart + startMatch[0].length;
      const actionRemainder = this.currentArtifact.slice(actionContentStart);
      const endMatch = actionCloseTag.exec(actionRemainder);

      if (!endMatch) {
        this.currentArtifact = this.currentArtifact.slice(actionStart);
        return;
      }

      const actionContentEnd = actionContentStart + endMatch.index;
      const actionEnd = actionContentEnd + endMatch[0].length;
      const actionAttributes = startMatch[1] ?? "";
      const actionType = this.getAttribute(actionAttributes, "type");
      const actionContent = this.currentArtifact.slice(
        actionContentStart,
        actionContentEnd,
      );

      this.currentArtifact = this.currentArtifact.slice(actionEnd);

      try {
        if (actionType === "shell") {
          const shellCommand = actionContent.trim();

          if (shellCommand) {
            await this.onShellCommand(shellCommand);
          }
        } else if (actionType === "file") {
          const filePath = this.getAttribute(actionAttributes, "filePath");

          if (filePath) {
            await this.onFileContent(filePath, actionContent);
          }
        }
      } catch (e) {
        console.log("Error parsing artifact chunk");
        console.error(e);
      }
    }
  }
}
