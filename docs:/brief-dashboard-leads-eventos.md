# Brief — Dashboard de gestión de leads de eventos (Módulo 1)

> Documento para el proyecto de Claude Code. Define **qué** construir y **con qué criterios**.
> Modo de trabajo: **propón el plan antes de escribir código, pregunta lo que no esté claro, no inventes, una fase por sesión.**
> Contexto estratégico completo: ver `estrategia-eventos-viajes-hablandis.md` (secciones 2, 3, 4 y 7).

---

## 1. Rol y objetivo

Construyes una **herramienta interna** para que el equipo de Hablandis (Román, Mila, Miriam) gestione los leads captados en eventos de profesores de ELE.

No es una pieza suelta: es la **cara visible de Firebase**, que ya es la base de datos real (cada lead entra entero por los formularios de acceso de los talleres). El dashboard lee esa base, la muestra y permite **enriquecerla y gestionarla** — sobre todo capturar los insights verbales que hoy se pierden en papel.

**Zoho queda fuera de este dashboard.** Solo Firebase. Diseño provider-agnostic: el día que se migre el email a Brevo u otro, este dashboard no se toca.

---

## 2. PRIMER PASO OBLIGATORIO — auditar Firebase (no escribas UI todavía)

Antes de nada — **esta auditoría se ejecuta en el proyecto donde vive el código que usa Firebase** (`Taller-Asistente-IA`, donde está `hablandis_acceso_taller_ia.html`), no en el proyecto nuevo del dashboard. Lee ese código y dime con precisión:

1. **Qué Firebase es:** ¿Realtime Database o Firestore? (Los formularios escriben en rutas tipo `/leads/taller-ia.json`, lo que apunta a Realtime Database — confírmalo.)
2. **Estructura actual de los datos:** cómo se guardan los leads, en qué rutas, con qué campos. ¿Hay una ruta por taller (`/leads/taller-ia`, `/leads/taller-juego`) o algo consolidado?
3. **Cómo está protegido HOY:** las reglas de seguridad. ¿La base está abierta a lectura/escritura pública? (Es crítico: si los formularios escriben desde el cliente sin auth, hay que entender qué está expuesto antes de añadir un dashboard que lee todo.)
4. **Config de Firebase** que usa el proyecto y dónde vive.

Con eso, **propón** (sin implementar aún) el plan de §3 y §4. Si algo no cuadra, pregúntame.

---

## 3. Seguridad y acceso (innegociable)

El dashboard contiene **datos personales de ciudadanos de la UE**. Por tanto:

- **No puede ser una URL abierta.** Acceso solo con login, para el equipo (3 personas).
- Propón **Firebase Auth** (email/contraseña encaja, ya estamos en Firebase) como mecanismo.
- **Reglas de seguridad de Firebase:** los datos de leads deben quedar legibles/escribibles **solo por usuarios autenticados**, no en abierto. Si hoy están abiertos (probable, por los formularios), hay que cerrarlos sin romper la escritura de los formularios públicos — propón cómo (p. ej. reglas distintas para escribir-lead vs leer-todo).
- **Ninguna credencial ni API key sensible en el cliente.**
- **Lo que hace Román, no Code:** crear las cuentas del equipo y manejar las contraseñas en la consola de Firebase. Tú escribes el código y las reglas; él configura usuarios y credenciales.

---

## 4. Arquitectura

- **Lee y escribe en Firebase.** Nada de Zoho.
- **Proyecto propio, nuevo** (carpeta hermana de `Taller-Asistente-IA` y `Taller-Juegos`, p. ej. `Panel-Leads/`). El dashboard es **transversal a todos los talleres**, no parte de uno: por eso no va dentro de un taller. **Comparte el mismo proyecto Firebase** (la misma base de leads) reutilizando su config web (es pública por diseño en el SDK de cliente; copiarla es correcto), pero es código y despliegue aparte, con su propio login. Razona el despliegue (subdominio propio tipo `panel.hablandis…`, o ruta protegida).
- **Captura resiliente** (no offline completo): la nota/edición se guarda en local en el instante (no se pierde si cae el wifi del evento) y se sincroniza con Firebase en segundo plano, con un indicador discreto "X sin sincronizar". El **repaso/analítica asume conexión**.
- **Instalable como PWA:** manifest + service worker para "Añadir a pantalla de inicio" → icono propio y pantalla completa en iPhone y Android. (El service worker, mínimo y al servicio de la captura resiliente; sin cachés agresivas que compliquen.)

---

## 5. Modelo de datos

**Ya llegan por los formularios (no se piden aquí):** nombre, apellidos, email, canal, taller, evento, ciudad/país, fecha, campo abierto, UTMs.

**Se rellenan en el dashboard (capa de enriquecimiento):**
- *Filtro del viaje (lo decisivo):* **edad de los estudiantes** (multiselección: 3-7, 8-10, 11-13, 14-16, +17) · **nº de estudiantes** · **tipo de centro**.
- *Relación y venta:* **centro académico** (nombre) · **teléfono** · **LinkedIn** (enlace) · ciudad.
- *Gestión:* **cualificación** (frío / templado / caliente) · **¿ha traído grupos antes?** · **propietario** (Mila / Miriam / Román) · **próximo toque** (fecha) · **notas/insight** (texto libre).

Instagram y rango de edad docente quedan **fuera** (ruido).

---

## 6. UI — una app, dos modos (ver el mockup como referencia visual)

**Modo evento (móvil, captura rápida de pie):**
- Selector de evento activo + indicador de sincronización.
- Lista de leads de hoy/del evento, con un punto de color por cualificación.
- Ficha rápida: nombre/email, chips de canal/evento, **cualificación de un toque** (frío/templado/caliente), y un **campo de notas grande**. El campo de notas se rellena con el **dictado nativo del teclado del móvil** (no construyas grabador de voz propio); la nota queda como texto.
- Mínimo en caliente: aquí NO se piden los campos de enriquecimiento.

**Modo repaso (portátil, gestión con calma):**
- Filtros por evento, canal, país + búsqueda + exportar.
- Tarjetas-resumen: leads totales, calientes, captados hoy, eventos.
- Lista de leads; al desplegar uno, el panel de **enriquecimiento** (§5) con el "filtro del viaje" destacado, y la nota completa editable.

**Cualificación por colores:** frío = info/azul, templado = warning/ámbar, caliente = danger/rojo (con leyenda).

---

## 7. Voz y diseño

- Usa el **sistema de diseño y la marca de Hablandis** ya presentes en el proyecto (navy, amarillo, tipografía Aglet Mono). No inventes una estética nueva.
- **Mobile-first** (el uso crítico es de pie en un congreso, una mano).
- **Accesible:** labels, foco visible, estados de error claros, contraste, navegable con teclado.
- Sobrio y rápido; es una herramienta de trabajo, no una web de marketing.

---

## 8. Fuera de alcance de esta v1

- **El copiloto/agente** (proponer campos desde la nota, redactar mensajes en la voz de Román, recordar con criterio) = Módulo 2, más adelante. **No lo construyas ahora.**
- **Automatización de WhatsApp** = nunca (es manual y humano por diseño).
- Redes sociales más allá del campo enlace de LinkedIn.
- Analítica avanzada.

*Sí entra* un recordatorio **mecánico** simple: a partir del campo "próximo toque", una vista de "te tocan hoy/esta semana". Es un cálculo, no un agente.

---

## 9. Fases sugeridas (una por sesión de Code)

1. **Auth + lectura:** login del equipo + reglas de seguridad + leer y listar los leads existentes (modo repaso básico).
2. **Edición + enriquecimiento + cualificación:** rellenar y guardar los campos de §5; ficha desplegable.
3. **Captura resiliente + PWA + modo evento móvil:** guardado local, sincronización, instalable, ficha rápida con dictado.
4. **Analítica:** las tarjetas-resumen, filtros, exportar, vista "te tocan hoy".

---

## 10. Antes de empezar a codear, confírmame

1. El resultado de la **auditoría de Firebase** (§2): tipo, estructura, reglas actuales.
2. Tu propuesta de **auth y reglas de seguridad** (§3).
3. Si el dashboard va en el **mismo repo** que las landings (área protegida) o separado, y por qué.
4. Cualquier punto donde lo que leas en el proyecto contradiga este brief.

Si falta algo, **pregunta. No supongas y no inventes.**
