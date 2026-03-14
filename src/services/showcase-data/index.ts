import type { ShowcaseProfileData } from "./types";
import { biancaData } from "./bianca";
import { thiagoNigroData } from "./thiago-nigro";
import { francinyehlkeData } from "./francinyehlke";
import { camilacoutinhoData } from "./camilacoutinho";
import { mohindiData } from "./mohindi";
import { nortonmelloData } from "./nortonmello";
import { whinderssonnunesData } from "./whinderssonnunes";
import { manualdomundoData } from "./manualdomundo";
import { eduardofeldbergData } from "./eduardofeldberg";
import { virginiaData } from "./virginia";

export type { ShowcaseProfileData };

export const SHOWCASE_PROFILE_DATA: Record<string, ShowcaseProfileData> = {
  bianca: biancaData,
  "thiago.nigro": thiagoNigroData,
  francinyehlke: francinyehlkeData,
  camilacoutinho: camilacoutinhoData,
  mohindi: mohindiData,
  nortonmello: nortonmelloData,
  whinderssonnunes: whinderssonnunesData,
  manualdomundo: manualdomundoData,
  eduardofeldberg: eduardofeldbergData,
  virginia: virginiaData,
};
