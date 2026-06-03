export type { Seed } from '@caputchin/replay-contract';

export type { Layout } from './layout';
export type { Bridge } from './bridge';
export type { LocaleKeySchema, LocalePreset, ResolvedLocale } from './locale';
export type { ResolvedSkin, SkinPreset, SkinSchemaEntry, SkinValueType } from './skin';
export type { ConfigPreset, ConfigSchemaEntry, ConfigValueType, ResolvedConfig } from './config';
export type {
  ConfigurationsFile,
  GameManifest,
  LocalesFile,
  MarketplaceMetadata,
  PreferredPresentation,
  SkinsFile,
} from './manifest';
export type { GameContext } from './context';
export type { GameFactory } from './register';
export { DEFAULT_REGISTRY_KEY, register } from './register';
