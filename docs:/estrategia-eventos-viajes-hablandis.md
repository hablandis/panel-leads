# Hablandis · Captación en eventos → viajes de estudio
### Documento de contexto vivo · actualizado 22 jun 2026

> Fuente de verdad de esta estrategia. Pensado para retomar en frío (otra sesión, o el 29 jun).
> Si algo aquí contradice lo que veas en producción, gana producción: avisa y se corrige.

---

## 0. PRÓXIMO PASO (en stand-by hasta el lunes 29 jun)

Trabajo de Zoho pausado por decisión de Román. Al retomar, el siguiente clic es:

1. Coger el **código de inserción (embed)** del formulario de Zoho **"Talleres Hablandis · Material"** y pegárselo a Claude (o a Code).
2. De ese código se sacan los **nombres internos exactos** de los campos Evento, País y Canal (Zoho los nombra con códigos tipo `CONTACT_CF_…`, no se adivinan).
3. Con esos nombres, instrucción a Code para: (a) ampliar `CONFIG.proveedor.campos` y los hidden fields para que la página propia mande **Evento + País + Canal** a Zoho (hoy solo manda nombre/apellidos/email); y (b) montar el **registro de eventos** (ver §3) y replicarlo en taller-juego.
4. Code debe **ignorar el captcha** del formulario donante (no se pudo quitar; no afecta, porque solo leemos nombres/identificadores, no copiamos su HTML).

IDs ya capturados del formulario nuevo (de la URL del editor):
- **List ID:** `18762900003438004`
- **Form ID:** `18762900003463025`
- (El `zcld` antiguo `129a9794d6c445b4` era del formulario viejo ya borrado; por eso hubo que rehacerlo.)

Pendiente menor, sin prisa: corregir el **remitente "Escuela La Playa"** que aparece en el pie legal de los correos (Configuración ⚙️ → Información de la organización).

---

## 1. El modelo, en una frase

El profe captado en un evento **no compra: prescribe**. Tiene que vender el viaje dentro de su mundo (alumnos, familias, dirección). Decisión lenta y estacional. Por tanto: cultivo de relación a 12–24 meses, no captación transaccional. Mayor palanca sin usar: **ayudarle a vender a los suyos** (one-pagers), no darle más material a él.

---

## 2. Arquitectura real (confirmada hoy leyendo el código)

- El formulario de `taller-ia/` (capa de acceso) es **propio, HTML/JS**, no un embed de Zoho.
- Al enviar, dispara 3 cosas en paralelo:
  1. **Zoho Campaigns** vía `weboptin.zc` (`mode: no-cors`, respuesta no legible). Hoy solo manda **FIRSTNAME, LASTNAME, CONTACT_EMAIL**. → entra en lista "Talleres Hablandis" y dispara la bienvenida.
  2. **Firebase** (`/leads/taller-ia.json`): payload **completo** (nombre, email, mensaje, consentimiento, fecha, evento, UTMs). Independiente de Zoho.
  3. **Acceso**: `localStorage` con expiración a **72 h** (puerta blanda, por dispositivo/navegador, sin cuentas).
- **Consecuencia clave:** evento y UTMs **solo llegan a Firebase, no a Zoho** (lo arregla el paso §0).
- **Firebase es la base de datos REAL.** Zoho es solo "el brazo que envía correos", reemplazable.

> Esto desbloquea el cambio de proveedor: dejar Zoho (→ posiblemente **Brevo**, más sencillo) será cambiar la función `enviarAProveedor`, sin tocar Firebase, la web ni el dashboard.

---

## 3. Modelo de datos (lista única)

**Capturados en el formulario / por la página:**
Nombre · Apellidos (separados — saludo por nombre) · Email · **Canal** · **Taller** · **Evento** · Ciudad/País · Fecha · Campo abierto.

- **Canal** = naturaleza del lead: `taller` / `mesa` / `web` / **`sorteo`**. (Decisión 21 jun: el sorteo de beca / actividad es un **valor de Canal**, no un campo nuevo; el detalle de *qué* sorteo va en la nota. Regla: un campo estructurado solo se justifica si vas a segmentar por él.)
- **Registro de eventos:** el QR lleva solo un código corto (`?evento=ic-milan-26`); un archivo de config lo expande a `{evento, ciudad, país, mes, año}`. Dar de alta un evento = añadir una línea, no fabricar URLs. A Zoho va el nombre legible (Evento) + País; a Firebase, todo.

**De enriquecimiento — se rellenan DESPUÉS (modo repaso, correos de respuesta, o extraídos de la nota de voz), nunca en la puerta.**
Fuente: el formulario antiguo (el monstruo de ~14 campos que generaba la fricción que estamos eliminando) es la **biblioteca de campos del perfil ideal**. Se conserva el *qué*, se cambia el *cuándo*. Priorizados por valor para el viaje:

- *Filtro decisivo:* **edad de los estudiantes** (3-7 … +17 — separa al prescriptor real del contacto inútil) · **nº de estudiantes** (proxy de tamaño de grupo) · **tipo de centro** (quién puede organizar un viaje).
- *Relación y venta:* **centro académico** (nombre, para el one-pager de dirección) · **teléfono** · **ciudad** · **LinkedIn** (enlace manual; contexto de venta real de un prescriptor profesional — ¿decide?, ¿jefe de departamento?).
- *Gestión:* **¿ha traído grupos antes?** · **cualificación** · **propietario**.
- *Descartado:* rango de edad docente (no cualifica, roza lo intrusivo) · **Instagram** (ruido salvo uso profesional del aula). Nota RGPD: enlazar a un perfil público que el contacto da, o que es obviamente profesional, sí; rastrear o recopilar redes por cuenta propia, no.

Nota clave: la **nota de voz** del evento suele contener ya el filtro decisivo ("instituto bilingüe, 2 grupos de 4º" = tipo de centro + edad + tamaño). El enriquecimiento estructurado se rellena desde ahí, en frío. **Mínimo en caliente, enriquecimiento en frío.**

---

## 4. Cualificación mínima

- **Caliente:** asistió a taller Y (respondió un correo O enseña secundaria/bachillerato/uni), o pidió llamada, o ha traído grupos.
- **Templado:** taller sin responder; o mesa con conversación real; o abre/clica sin responder.
- **Frío:** mesa/sorteo por merchandising, sin engagement.

**Regla que la hace valer:** Caliente → toque humano en X días, de quien lo conoce. El resto, en automático.

---

## 5. Nurturing multicanal (PRÓXIMO BLOQUE GRANDE — donde más se nos falla)

Cada canal para su momento. La fontanería (captura, campos, dashboard) sin esto es una base que se enfría.

**Email** — lo escalable y de poco compromiso. Tres flujos desacoplados:
1. **Bienvenida** (automática al registrarse): material → segmentación por etapa → prompts → puente sutil a Málaga. *Ya existe.* Saludo a `$[UD:FIRST_NAME]$`.
2. **Presencia útil** (≈mensual, para quien no convierte): contenido didáctico en la voz de Román, Málaga asomando de vez en cuando. *Lo que hoy falta.*
3. **Viaje** (estacional + por señal): el "¿hablamos?" se dispara con intención **y** en ventana. Sacar del día 7 fijo.

**WhatsApp** — el vínculo cálido. Hoy: **manual y personal** (se intercambian teléfonos en el evento "si os caéis bien" y se sigue hablando). **Principio firme: NO se automatiza.** Automatizarlo (API Business, difusión) mata lo que lo hace funcionar, es spam y abre líos de consentimiento. El sistema **sostiene** el canal sin desnaturalizarlo: el copiloto recuerda "te tocaba escribir a X" y deja el borrador en tu voz; **el envío siempre lo hace la persona**, desde su móvil. Por eso el **propietario** importa: recibe él el recordatorio. (Número dado en persona = legítimo; volcarlo a difusión masiva = no.)

**Llamada** — el momento de cerrar. Humana, para el prospecto caliente en ventana.

**Calendario:** promoción sept–abr · silencio may–ago · empuje de viaje al inicio de la ventana, para la temporada siguiente.

> Pendiente: **dedicar una sesión entera** a diseñar esto (qué canal en qué momento, qué se automatiza y qué es humano, cómo encaja con cualificación y calendario).

---

## 6. Activos de habilitación del prescriptor (pendiente)

- Landing `/viajes-estudio/` = **hub** (ya cubre seguridad 24h, seguros, acreditación Cervantes/FEDELE, qué incluye, alojamiento gratis del líder).
- **One-pager dirección** (PDF reenviable): seguridad, acreditación, qué incluye, rango de precio, ratios de supervisión.
- **One-pager familias** (PDF, cálido): seguridad, supervisión, alojamiento, qué se lleva el alumno, coste.
- Material de origen: PDF del programa (ya público) + la landing. No hace falta subir el catálogo.

---

## 7. Dashboard de leads = Módulo 1 de una "capa de gestión" sobre Firebase

**Reencuadre:** no es una pieza suelta; es la **cara visible de Firebase**. Lo que falta no era un dashboard, era una capa de gestión que se apoye en la base que ya existe.

**Decisiones de diseño (21 jun):**
- **Una sola app responsive, dos modos:** *evento* (móvil, captura rápida de pie) y *repaso* (portátil, análisis + gestión con calma).
- **Instalable como app (PWA):** "Añadir a pantalla de inicio" → icono propio, pantalla completa, en iPhone y Android. No va a las tiendas (ni falta); para el equipo es indistinguible de una app.
- **Edad de los estudiantes = multiselección** (un profe puede dar a varios tramos).
- **Notas/insights:** campo de texto rápido + **dictado nativo del teléfono** (no grabador propio: el reconocimiento de voz en navegador móvil es frágil). La nota queda como texto buscable. Audio crudo = posible mejora futura.
- **Fuente de datos:** Firebase, lee y escribe. **Zoho fuera.** Provider-agnostic por diseño.
- Es donde se rellena la **capa de enriquecimiento** (§3) + las notas.

**Requisitos del mundo real:**
- **Acceso:** contiene datos personales de ciudadanos UE → **no puede ser URL abierta**; login para el equipo. Verificar con Code que Firebase no esté abierto.
- **Conexión en evento:** decidido → **captura resiliente** (guardado local inmediato + sincronización en segundo plano con indicador "X sin sincronizar"), no offline completo. El repaso asume conexión.

**El copiloto (agente) — tres trabajos; Román juzga y envía:**
- *Proponer:* lee la nota de voz en bruto y sugiere los campos estructurados (tipo de centro, edad, nº alumnos). Román aprueba/corrige.
- *Recordar:* lo mecánico es un cálculo fiable (fecha de "próximo toque" → lista de "te tocan hoy"); lo de criterio lo propone el agente (lee "decide en claustro de octubre" → "escríbele a finales de septiembre").
- *Redactar:* deja el borrador en la voz de Román (email o WhatsApp), listo para aprobar. **El envío siempre es humano.**

**Construcción:** diseñar aquí (mockup → afinar), construir en Claude Code (lee/escribe Firebase real, vive en el dominio y stack de Hablandis).

**Roadmap modular de la capa de gestión:** Módulo 1 = leads/insights (esta semana). Módulo 2 (después) = orquestación de nurturing/campañas. **Redes sociales = horizonte**, no requisito ahora (otras herramientas, otra cadencia; ataría el proyecto).

---

## 8. Decisiones abiertas

- **Sesión dedicada al nurturing multicanal** (§5) — el próximo bloque grande.
- Migración a **Brevo** u otro (en frío, fuera de temporada; de-riesgada por la arquitectura Firebase).
- One-pagers: PDF (recomendado) vs sección de landing.
- Meses reales de viaje de los grupos (para timar el empuje estacional).
- Quién hace la llamada de venta cuando lleguen solicitudes de muchos eventos a la vez.
- Destilado nota→campos: lo hace el agente y Román aprueba (decidido); pendiente implementarlo en Code.
- "Insertar en Zoho CRM": aparcado; no mezclar CRM ahora.

---

## 9. Hecho / decidido

**21 jun:** separados Nombre/Apellidos · saludo a First Name · borrado el "Untitled Signup Form" (huérfano, no rompió nada) · creado formulario "Talleres Hablandis · Material" con 6 campos · confirmada arquitectura (formulario propio + Firebase base real + 72 h) · confirmado que evento/UTM hoy solo llegan a Firebase · sorteo = valor de Canal.

**22 jun (diseño del dashboard, cerrado):** captura resiliente (no offline completo) · edad de estudiantes en multiselección · filtro del viaje destacado en modo repaso · PWA instalable · copiloto = proponer + recordar + redactar (humano aprueba y envía) · WhatsApp manual, no se automatiza · LinkedIn sí / Instagram no · formulario antiguo = biblioteca de campos del perfil ideal.
