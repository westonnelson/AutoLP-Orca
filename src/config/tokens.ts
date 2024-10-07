import { PublicKey } from "@solana/web3.js";

// Important: add any token involved in the pool you interact with to TOKENS_BY_NAME and TOKENS_BY_MINT

export const TOKENS_BY_NAME: {
  [key: string]: { name: string; mint: PublicKey; decimals: number };
} = {
  // STABLES
  PYUSD: {
    name: "PYUSD",
    mint: new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"),
    decimals: 6,
  },
  USDT: {
    name: "USDT",
    mint: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
    decimals: 6,
  },
  USDC: {
    name: "USDC",
    mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    decimals: 6,
  },
  USDe: {
    name: "USDe",
    mint: new PublicKey("DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT"),
    decimals: 9,
  },
  sUSDe: {
    name: "sUSDe",
    mint: new PublicKey("Eh6XEPhSwoLv5wFApukmnaVSHQ6sAnoD9BmgmwQoN2sN"),
    decimals: 9,
  },
  EUROe: {
    name: "EUROe",
    mint: new PublicKey("2VhjJ9WxaGC3EZFwJG9BDUs9KxKCAjQY4vgd1qxgYWVg"),
    decimals: 6,
  },
  EURC: {
    name: "EURC",
    mint: new PublicKey("HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr"),
    decimals: 6,
  },
  ISC: {
    name: "ISC",
    mint: new PublicKey("J9BcrQfX4p9D1bvLzRNCbMDv8f44a9LFdeqNE4Yk2WMD"),
    decimals: 6,
  },
  UXD: {
    name: "UXD",
    mint: new PublicKey("7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT"),
    decimals: 6,
  },
  // SOL
  SOL: {
    name: "SOL",
    mint: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  },
  sSOL: {
    name: "sSOL",
    mint: new PublicKey("sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh"),
    decimals: 9,
  },
  INF: {
    name: "INF",
    mint: new PublicKey("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"),
    decimals: 9,
  },
  JitSOL: {
    name: "JitoSOL",
    mint: new PublicKey("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"),
    decimals: 9,
  },
  // OTHER
  NYAN: {
    name: "NYAN",
    mint: new PublicKey("NYANpAp9Cr7YarBNrby7Xx4xU6No6JKTBuohNA3yscP"),
    decimals: 9,
  },
  ORCA: {
    name: "ORCA",
    mint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"),
    decimals: 6,
  },
  ORE: {
    name: "ORE",
    mint: new PublicKey("oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp"),
    decimals: 11,
  },
  JLP: {
    name: "JLP",
    mint: new PublicKey("27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4"),
    decimals: 6,
  },
  "r/snoofi": {
    name: "r/snoofi",
    mint: new PublicKey("7M9KJcPNC65ShLDmJmTNhVFcuY95Y1VMeYngKgt67D1t"),
    decimals: 6,
  },
  HNT: {
    name: "HNT",
    mint: new PublicKey("hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux"),
    decimals: 8,
  },
  IOT: {
    name: "IOT",
    mint: new PublicKey("iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns"),
    decimals: 6,
  },
  BILLY: {
    name: "BILLY",
    mint: new PublicKey("3B5wuUrMEi5yATD7on46hKfej3pfmd7t1RKgrsN3pump"),
    decimals: 6,
  },
};

export const TOKENS_BY_MINT: {
  [key: string]: { name: string; decimals: number };
} = {
  // STABLES
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": {
    name: "PYUSD",
    decimals: 6,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    name: "USDT",
    decimals: 6,
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    name: "USDC",
    decimals: 6,
  },
  DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT: {
    name: "USDe",
    decimals: 9,
  },
  Eh6XEPhSwoLv5wFApukmnaVSHQ6sAnoD9BmgmwQoN2sN: {
    name: "sUSDe",
    decimals: 9,
  },
  J9BcrQfX4p9D1bvLzRNCbMDv8f44a9LFdeqNE4Yk2WMD: {
    name: "ISC",
    decimals: 6,
  },
  "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT": {
    name: "UXD",
    decimals: 6,
  },
  "2VhjJ9WxaGC3EZFwJG9BDUs9KxKCAjQY4vgd1qxgYWVg": {
    name: "EUROe",
    decimals: 6,
  },
  HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr: {
    name: "EURC",
    decimals: 6,
  },
  // SOL
  So11111111111111111111111111111111111111112: {
    name: "SOL",
    decimals: 9,
  },
  sSo14endRuUbvQaJS3dq36Q829a3A6BEfoeeRGJywEh: {
    name: "sSOL",
    decimals: 9,
  },
  "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm": {
    name: "INF",
    decimals: 9,
  },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: {
    name: "JitoSOL",
    decimals: 9,
  },
  // OTHER
  "3B5wuUrMEi5yATD7on46hKfej3pfmd7t1RKgrsN3pump": {
    name: "BILLY",
    decimals: 6,
  },
  NYANpAp9Cr7YarBNrby7Xx4xU6No6JKTBuohNA3yscP: {
    name: "NYAN",
    decimals: 9,
  },
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: {
    name: "ORCA",
    decimals: 6,
  },
  oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp: {
    name: "ORE",
    decimals: 11,
  },
  "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4": {
    name: "JLP",
    decimals: 6,
  },
  "7M9KJcPNC65ShLDmJmTNhVFcuY95Y1VMeYngKgt67D1t": {
    name: "r/snoofi",
    decimals: 6,
  },
  hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux: {
    name: "HNT",
    decimals: 8,
  },
  iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns: {
    name: "IOT",
    decimals: 6,
  },
};
