import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MemeBongo — Cómo se juega",
  description:
    "Aprende a tocar la batería moviendo tu cuerpo frente a la cámara",
};

// Cada parte del cuerpo es un instrumento. Los colores coinciden con las
// cápsulas que se dibujan sobre el vídeo en la cámara.
const INSTRUMENTOS = [
  {
    emoji: "🫳",
    parte: "Brazo izquierdo (parte alta)",
    sonido: "Charles (hi-hat)",
    color: "oklch(0.82 0.14 210)",
  },
  {
    emoji: "💪",
    parte: "Antebrazo izquierdo",
    sonido: "Caja",
    color: "oklch(0.75 0.2 45)",
  },
  {
    emoji: "🤪",
    parte: "Brazo derecho (parte alta)",
    sonido: "¡Sonido meme!",
    color: "oklch(0.82 0.18 145)",
  },
  {
    emoji: "🥁",
    parte: "Antebrazo derecho",
    sonido: "Tom bajo",
    color: "oklch(0.72 0.22 300)",
  },
  {
    emoji: "🦵",
    parte: "Pierna izquierda",
    sonido: "Bombo",
    color: "oklch(0.72 0.22 25)",
  },
  {
    emoji: "🦶",
    parte: "Pierna derecha",
    sonido: "Pedal",
    color: "oklch(0.78 0.16 75)",
  },
];

const PASOS = [
  {
    emoji: "🎥",
    titulo: "Da acceso a la cámara",
    texto:
      "Pulsa «¡Vamos a tocar!», luego «Dar acceso a la cámara» y acepta el permiso del navegador.",
  },
  {
    emoji: "🧍",
    titulo: "Colócate bien",
    texto:
      "Sepárate un par de metros para que se te vea de cintura para arriba, con los brazos y las piernas a la vista.",
  },
  {
    emoji: "💥",
    titulo: "Mueve el cuerpo",
    texto:
      "Cada parte de tu cuerpo es un instrumento. Mueve un brazo o una pierna con energía para tocar su sonido.",
  },
  {
    emoji: "⚡",
    titulo: "Cuanto más rápido, mejor",
    texto:
      "La velocidad del movimiento marca el golpe. Verás aparecer el nombre del sonido en grande sobre la pantalla.",
  },
  {
    emoji: "🎶",
    titulo: "Crea tu ritmo",
    texto:
      "Combina movimientos de brazos y piernas para montar tu propio ritmo. ¡A darlo todo!",
  },
];

const CONSEJOS = [
  "💡 Busca un sitio con buena luz.",
  "🚶 Mejor con un fondo despejado y tú solo en el plano.",
  "🔊 Sube el volumen para escuchar bien la batería.",
  "🪞 La cámara está en modo espejo: te ves como en un espejo.",
];

export default function Home() {
  return (
    <main className="min-h-full bg-amber-100 px-6 py-12 text-black sm:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        {/* Cabecera */}
        <header className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-black/60">
            Cómo se juega
          </p>
          <h1 className="mt-2 text-6xl font-extrabold tracking-tight sm:text-5xl">
            Meme <span className="text-orange-500">Bongo</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-lg font-medium text-black/70">
            Conviértete en una batería humana: muévete delante de la cámara y
            haz sonar los tambores con tu cuerpo. 🥁
          </p>
          <p>Madrid Cursor hackaton #3</p>
        </header>

        {/* Empieza ya */}
        <div className="flex justify-center">
          <Link
            href="/jugar"
            className="cartoon-btn rounded-2xl bg-yellow-300 px-10 py-5 text-2xl font-extrabold text-black"
          >
            🥁 ¡Vamos a tocar!
          </Link>
        </div>

        {/* Pasos */}
        <section className="flex flex-col gap-4">
          {PASOS.map((paso, i) => (
            <div
              key={paso.titulo}
              className="cartoon flex items-start gap-4 rounded-2xl bg-white p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-2xl font-extrabold">
                {i + 1}
              </span>
              <div>
                <h2 className="text-xl font-extrabold">
                  {paso.emoji} {paso.titulo}
                </h2>
                <p className="mt-1 font-medium text-black/70">{paso.texto}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Mapa de instrumentos */}
        <section className="flex flex-col gap-4">
          <h2 className="text-center text-2xl font-extrabold">
            🗺️ Tu cuerpo es la batería
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {INSTRUMENTOS.map((it) => (
              <div
                key={it.parte}
                className="cartoon flex items-center gap-3 rounded-2xl bg-white p-4"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
                  style={{ backgroundColor: it.color }}
                >
                  {it.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black/60">
                    {it.parte}
                  </p>
                  <p className="text-lg font-extrabold leading-tight">
                    {it.sonido}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm font-medium text-black/60">
            Los colores coinciden con las cápsulas que verás sobre tu cuerpo en
            la cámara.
          </p>
        </section>

        {/* Consejos */}
        <section className="cartoon rounded-2xl bg-yellow-200 p-6">
          <h2 className="text-xl font-extrabold">✨ Consejos</h2>
          <ul className="mt-3 flex flex-col gap-2 font-medium text-black/80">
            {CONSEJOS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        {/* Llamada a la acción */}
        <div className="flex flex-col items-center gap-4 pb-6">
          <Link
            href="/jugar"
            className="cartoon-btn rounded-2xl bg-yellow-300 px-10 py-5 text-2xl font-extrabold text-black"
          >
            🥁 ¡Vamos a tocar!
          </Link>
          <Link
            href="/music-test"
            className="text-sm font-bold text-black/60 underline-offset-4 hover:underline"
          >
            🎹 ¿Sin cámara? Prueba los pads
          </Link>
        </div>
      </div>
    </main>
  );
}
