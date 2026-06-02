# hackathon-cursor-musica

E-drum service demo: six trigger codes and Web Audio playback in the browser.

## Drum codes

| Code | Pad |
|------|-----|
| `feet_1` | Kick |
| `feet_2` | Hi-hat pedal |
| `arm_left_low` | Snare |
| `arm_left_high` | Hi-hat |
| `arm_right_low` | Low tom |
| `arm_right_high` | Crash |

Keyboard after enabling audio: `1` `2` `q` `w` `e` `r`.

## DrumPlayer

```ts
import { Drum, DrumPlayer } from "@/lib/drum-player";

// After a click/tap (browser autoplay policy):
await DrumPlayer.init();
DrumPlayer.play("feet_right"); // alias → feet_2
DrumPlayer.play(Drum.kick);

// Or your own instance:
const player = new DrumPlayer();
await player.unlock();
player.play("arm_left_low");
```

Drum WAVs live in `public/samples/` (see `public/samples/ATTRIBUTION.md`). They load automatically after **Enable audio**.

Test page: [http://localhost:3000/music-test](http://localhost:3000/music-test)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
