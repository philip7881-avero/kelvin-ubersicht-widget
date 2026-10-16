/* Kelvin en el escritorio del Mac (para Übersicht): el día en un reloj de
   24 horas, con el cielo y la temperatura de cada hora.

   El widget no calcula nada: pide a Kelvin la imagen ya dibujada del tamaño
   justo y la muestra. Se actualiza cada 15 minutos.
   Para buscar las coordenadas de tu lugar: kelvin-puce.vercel.app. Un clic abre Kelvin;
   arrastrarlo lo mueve, y queda donde lo sueltes.

   Para cambiar el lugar, el tamaño, el idioma o el fondo, edita solo estas
   líneas y guarda: Übersicht lo recarga solo.

   EN: Kelvin, the weather averaged from many forecasts, as a 24-hour clock.
   By default it finds your city from your internet connection and speaks your
   Mac's language. To pick a place, set LUGAR, e.g.
   const LUGAR = { nombre: "London", lat: 51.51, lon: -0.13 }; */

/* null = el lugar aproximado de tu conexión. Para elegir uno:
   const LUGAR = { nombre: "Santiago", lat: -33.45, lon: -70.66 }; */
const LUGAR = null;
/* "auto" = el idioma del Mac. También "es", "en", "pt", "fr", "de" o "it". */
const IDIOMA = "auto";
const TIPO = "reloj";        // "reloj" (el día en 24 horas), "chico", "mediano" o "grande"
const TEMA = "auto";         // "auto" (vidrio que sigue al Mac), "claro", "oscuro", "transparente" o "transparente-oscura"
const ARRIBA = 40, DERECHA = 40;   // dónde aparece la primera vez; después, donde lo dejes

/* Solo para el grande: hasta cinco lugares. */
const LUGARES = [
  { nombre: "Santiago", lat: -33.45, lon: -70.66 },
  { nombre: "Valparaíso", lat: -33.05, lon: -71.62 },
  { nombre: "Buenos Aires", lat: -34.6, lon: -58.38 },
  { nombre: "Madrid", lat: 40.42, lon: -3.7 },
  { nombre: "Ciudad de México", lat: 19.43, lon: -99.13 }
];

import { run } from "uebersicht";

/* Las mismas medidas que los widgets de macOS, para que quede parejo al lado
   del calendario o el reloj del sistema. */
const MEDIDAS = { chico: [162, 162], mediano: [342, 162], grande: [342, 342], reloj: [342, 342] };

/* El velo translúcido de los widgets del sistema: deja pasar el color del
   fondo de pantalla. En "auto" la imagen viene sin fondo y el velo lo pone
   el Mac; con los otros temas la imagen trae su propio fondo. */
const VELO = { "vidrio": "rgba(28,30,36,0.42)", "vidrio-claro": "rgba(246,247,250,0.6)" };

export const refreshFrequency = 15 * 60 * 1000;

/* La hora cambia la dirección de la imagen en cada vuelta, para que no se
   quede con una copia vieja; y se pregunta si el Mac está en modo oscuro. */
export const command = "echo $(date +%s) $(defaults read -g AppleInterfaceStyle 2>/dev/null)";

export const className = `
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  img { display: block; }
`;

/* Dónde quedó la última vez que se arrastró. */
const GUARDADO = "kelvin-posicion-" + TIPO;
function posicion() {
  try { const p = JSON.parse(localStorage.getItem(GUARDADO)); if (p && isFinite(p.x) && isFinite(p.y)) return p; } catch (e) {}
  return null;
}

/* Arrastrar: se mueve la caja mientras el botón está apretado. Si el mouse se
   movió menos de 4 puntos, cuenta como clic y abre Kelvin. */
function arrastrar(ev, abrir) {
  const caja = ev.currentTarget;
  const r = caja.getBoundingClientRect();
  const dx = ev.clientX - r.left, dy = ev.clientY - r.top;
  const x0 = ev.clientX, y0 = ev.clientY;
  let movio = false;
  const mover = (e) => {
    if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 4) movio = true;
    if (!movio) return;
    const x = Math.max(0, Math.min(window.innerWidth - r.width, e.clientX - dx));
    const y = Math.max(0, Math.min(window.innerHeight - r.height, e.clientY - dy));
    caja.style.left = x + "px"; caja.style.top = y + "px"; caja.style.right = "auto";
  };
  const soltar = () => {
    window.removeEventListener("mousemove", mover);
    window.removeEventListener("mouseup", soltar);
    if (movio) {
      try { localStorage.setItem(GUARDADO, JSON.stringify({ x: parseFloat(caja.style.left), y: parseFloat(caja.style.top) })); } catch (e) {}
    } else abrir();
  };
  window.addEventListener("mousemove", mover);
  window.addEventListener("mouseup", soltar);
  ev.preventDefault();
}

export const render = ({ output }) => {
  const [hora, modo] = (output || "").trim().split(" ");
  const tema = TEMA === "auto" ? (modo === "Dark" ? "vidrio" : "vidrio-claro") : TEMA;
  const [w, h] = MEDIDAS[TIPO] || MEDIDAS.mediano;
  const q = new URLSearchParams({ tipo: TIPO, w: w * 2, h: h * 2, tema, t: hora || "0" });
  q.set("idioma", IDIOMA === "auto" ? (navigator.language || "es").slice(0, 2) : IDIOMA);
  if (TIPO === "grande") q.set("l", LUGARES.map((x) => [x.nombre, x.lat, x.lon].join("~")).join("|"));
  else if (LUGAR) { q.set("n", LUGAR.nombre); q.set("lat", LUGAR.lat); q.set("lon", LUGAR.lon); }
  else q.set("lugar", "auto");
  /* Un clic abre Kelvin en ese lugar; sin lugar elegido, Kelvin busca el tuyo. */
  const abrir = LUGAR ? "https://kelvin-puce.vercel.app/?n=" + encodeURIComponent(LUGAR.nombre) + "&lat=" + LUGAR.lat + "&lon=" + LUGAR.lon
                      : "https://kelvin-puce.vercel.app/";
  const p = posicion();
  const lugar = p ? { left: p.x, top: p.y } : { top: ARRIBA, right: DERECHA };
  return (
    <div style={{ position: "absolute", ...lugar, pointerEvents: "auto", cursor: "grab",
                  borderRadius: 22, overflow: "hidden", background: VELO[tema] || "transparent",
                  boxShadow: VELO[tema] ? "inset 0 0 0 0.5px rgba(255,255,255,0.14)" : "none" }}
         onMouseDown={(ev) => arrastrar(ev, () => run("open '" + abrir + "'"))}>
      <img src={"https://kelvin-puce.vercel.app/api/widget?" + q.toString()}
           width={w} height={h} alt="Kelvin" draggable={false} />
    </div>
  );
};
