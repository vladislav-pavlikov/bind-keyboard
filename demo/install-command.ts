import { getElement } from "./dom";
import { copyTextFrom } from "./copy-to-clipboard";

// --- Install command ---------------------------------------------------------

const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const isPackageManager = (value: string | undefined): value is PackageManager =>
  (PACKAGE_MANAGERS as readonly string[]).includes(value ?? "");

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm install bind-keyboard",
  yarn: "yarn add bind-keyboard",
  pnpm: "pnpm add bind-keyboard",
  bun: "bun add bind-keyboard",
};

const currentPackageManager = (): PackageManager => {
  const {
    dataset: { value },
  } = getElement<HTMLButtonElement>("#install-toggle .active");
  return isPackageManager(value) ? value : "npm";
};

const installCommandEl = getElement<HTMLElement>("#install-command-text");
const copyInstallButton = getElement<HTMLButtonElement>("#copy-install");

export const renderInstallCommand = (): void => {
  const { [currentPackageManager()]: command } = INSTALL_COMMANDS;
  installCommandEl.textContent = command;
};

copyInstallButton.addEventListener("click", () => {
  void copyTextFrom(installCommandEl, copyInstallButton);
});
