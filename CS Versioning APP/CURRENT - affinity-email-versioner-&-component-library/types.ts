
export enum AffinityGroup {
  CHI = 'CHI',
  DIGNITY = 'DIGNITY',
  MOUNTAIN = 'MOUNTAIN'
}

export enum ComponentType {
  HEAD = 'HEAD',
  LOGO_NAV = 'LOGO_NAV',
  SIGNATURE = 'SIGNATURE',
  FOOTER = 'FOOTER',
  VIEW_IN_BROWSER = 'VIEW_IN_BROWSER',
  CALLOUT = 'CALLOUT'
}

export interface EmailComponent {
  id: string;
  type: ComponentType;
  label: string;
  content: string;
}

export interface Foundation {
  id: string;
  name: string;
  region: AffinityGroup;
  components: EmailComponent[];
}

export interface EmailLink {
  id: string;
  originalUrl: string;
  currentUrl: string;
  isDeleted: boolean;
  isReplaced: boolean;
  text: string;
}

export interface EmailImage {
  id: string;
  originalSrc: string;
  newSrc: string;
  originalAlt: string;
  newAlt: string;
  keepOriginal: boolean;
  width: string;
  height: string;
  maxWidth: string;
  maxHeight: string;
  originalWidth?: string;
  originalHeight?: string;
  originalMaxWidth?: string;
  originalMaxHeight?: string;
  hasLink: boolean;
  linkUrl: string;
  originalLinkUrl?: string;
  removeLink?: boolean;
}

export interface EmailSection {
  label: string;
  content: string;
  isPreserved: boolean;
}
