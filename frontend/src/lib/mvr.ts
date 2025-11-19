export const MVR_REGISTRY_OBJECT_ID =
  "0x0e5d473a055b6b7d014af557a13ad9075157fdc19b6d51562a18511afd397727";
export const SUILEND_SUINS_OBJECT_ID =
  "0x07914f35c88605d5d0f12269a43bd7c6cb24bce81f4d8627a232fc71d261ad80"; // Owned by 0xb1ff

export type MvrGitInfo = {
  repository: string; // E.g. https://github.com/suilend/suilend-public
  subdirectory: string; // E.g. contracts/suilend
  commitHash: string; // E.g. 6d3baefa31c0a672b1f96c81a058b4c688bf8ffc
};
export type MvrMetadata = {
  description?: string;
  iconUrl?: string;
  documentationUrl?: string;
  homepageUrl?: string;
  contact?: string;
};
