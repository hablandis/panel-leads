## Principios de datos y seguridad (permanentes)
- La seguridad vive en las reglas de Firebase, no en esconder la config del cliente.
- La apiKey del cliente es pública por diseño; nunca exponer service-account keys.
- Contraseñas: solo en el gestor del equipo. Nunca en código, correo ni documentos.
- Backups: exportación JSON periódica de la BD, guardada en local + Drive (file-over-app).
- No exponer rutas ni escritura a internet sin necesidad; cerrar reglas abiertas.
- Mínimo de datos personales; los leads son datos de terceros (profes).

## Convivencia con los talleres (no romper lo existente)
- Panel-Leads comparte el proyecto Firebase `hablandis-quiz` con los talleres (taller-ia, taller-juego), pero es una app aparte: trabajar solo en su carpeta.
- No editar el código de los talleres desde este proyecto.
- Las reglas de seguridad son UN bloque para toda la base de datos. No republicar reglas sin el bloque completo delante: pegar un fragmento borra en silencio las otras rutas (niTuLoSabes, embustero, leads, sesion, rubrica) y tumbaría el quiz.
- Las rutas del quiz las usan los talleres en directo: no tocarlas. Panel-Leads solo lee /leads/ y escribe bajo /contactos/ y /leads/<…>/gestion/notaDelEvento (aditivo, no pisa lo existente).
- No edites el código de los talleres ni republiques reglas de seguridad en esta sesión; trabaja solo dentro de Panel-Leads.

## Protocolo obligatorio para cambios en reglas de Firebase
1. SIEMPRE pedir el bloque completo actual antes de proponer ningún cambio.
2. Mostrar el bloque COMPLETO resultante (no solo el fragmento añadido).
3. Señalar explícitamente qué líneas son nuevas y cuáles se conservan intactas.
4. No publicar nunca un fragmento parcial.

## Bloque de reglas completo (actualizado 23 jun 2026 — Fase 3)
```json
{
  "rules": {
    "niTuLoSabes": { ".read": true, ".write": true },
    "embustero":   { ".read": true, ".write": true },
    "leads": {
      ".write": true,
      ".read": "auth != null && auth.token.email.endsWith('@hablandis.com')"
    },
    "sesion":  { ".read": true, ".write": true },
    "rubrica": { ".read": true, ".write": true },
    "contactos": {
      ".read": "auth != null && auth.token.email.endsWith('@hablandis.com')",
      ".write": "auth != null && auth.token.email.endsWith('@hablandis.com')"
    },
    "eventos": {
      ".read": "auth != null && auth.token.email.endsWith('@hablandis.com')",
      ".write": "auth != null && auth.token.email.endsWith('@hablandis.com')"
    }
  }
}
```
