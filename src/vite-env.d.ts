/// <reference types="vite/client" />

declare module "virtual:optional-assets" {
  export const optionalAssets: {
    heroSky: boolean;
    ankuzo: boolean;
    twentyTwo: boolean;
    portrait: boolean;
    playground: boolean;
    games: Record<string, boolean>;
  };
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
