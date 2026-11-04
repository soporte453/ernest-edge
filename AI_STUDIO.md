# Ernest Edge en Google AI Studio · paso a paso

Google AI Studio tiene un modo **Build** que crea apps con Gemini, las ejecuta en una vista previa y las publica en **Cloud Run** con una dirección pública. Las dos primeras apps se publican gratis y sin tarjeta, y la clave de Gemini queda guardada en el servidor.

La forma más segura de usarlo **no es pedirle que invente la app desde cero** (perdería funciones que ya están probadas), sino **importar el código de Ernest Edge desde GitHub** y pedirle solo los cambios necesarios para que funcione en su servidor.

---

## Qué necesitas

- Cuenta de Google (para AI Studio).
- Cuenta de GitHub con el repositorio `ernest-edge` (sección 3 del README). Si ya lo subiste para Netlify, sirve el mismo.
- Tu proyecto de Supabase con `supabase/schema.sql` ya ejecutado (sección 3 del README), y su Project URL, clave pública y clave privada.

---

## Paso 1 · Preparar el repositorio

1. En GitHub, abre tu repositorio `ernest-edge`.
2. Sube este archivo (`AI_STUDIO.md`) y el `public/index.html` más reciente: **Add file → Upload files → Commit changes**.
3. Comprueba que `public/config.js` tiene tu Supabase URL y tu clave **pública** (nunca la privada).

## Paso 2 · Importar en AI Studio

1. Entra a **aistudio.google.com** con tu cuenta de Google.
2. En el menú izquierdo abre **Build**.
3. En el cuadro donde se escribe el prompt, pulsa **+ (Add files) → Import from GitHub**.
4. Autoriza a AI Studio a leer tu GitHub y elige el repositorio `ernest-edge`.
5. Espera a que cargue los archivos.

## Paso 3 · Pegar el prompt principal

Copia **completo** el "Prompt 1" de abajo, pégalo en el chat de Build y envíalo. AI Studio trabajará varios minutos: crea el servidor, adapta las funciones y levanta la vista previa.

## Paso 4 · Guardar las claves secretas

Cuando AI Studio lo pida (o en el icono de **configuración / Secrets** del proyecto), agrega:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | tu Project URL |
| `SUPABASE_ANON_KEY` | tu clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | tu clave privada (service_role / secret) |
| `AI_DAILY_LIMIT` | `5` |
| `TWELVEDATA_API_KEY` | tu clave gratuita de twelvedata.com (precios en vivo) |

La clave de Gemini la pone AI Studio sola en el servidor; no tienes que copiarla.

## Paso 5 · Probar en la vista previa

Usa la lista de "Comprobación" al final de este archivo. Si algo falla, usa el **Prompt 2** pegando el error, o activa el **modo de anotación** (seleccionas un elemento de la vista previa y describes el cambio).

> Regla de oro: pide cambios pequeños y de uno en uno. Si una respuesta de AI Studio rompe algo que funcionaba, pídele que deshaga ese cambio en concreto.

## Paso 6 · Publicar

1. Pulsa **Deploy → Cloud Run** (arriba a la derecha).
2. Acepta crear el proyecto de Google Cloud si te lo pide. Para las dos primeras apps no hace falta tarjeta.
3. Al terminar te da una dirección pública. Ábrela en el celular y en otra computadora.
4. En **Supabase → Authentication → URL Configuration**, pon esa dirección como **Site URL** y agrégala en **Redirect URLs** (para los correos de confirmación y de contraseña).

## Paso 7 · Guardar una copia del código

En AI Studio usa **Export / Save to GitHub** para guardar la versión adaptada en tu repositorio (por ejemplo en una rama nueva `ai-studio`). Así nunca pierdes el trabajo.

---

## Prompt 1 · Importar y adaptar (pégalo completo)

```
Este repositorio es "Ernest Edge", un journal de trading que YA FUNCIONA. La interfaz completa está en public/index.html (JavaScript sin framework, unos 300 KB), la configuración pública en public/config.js, las funciones de servidor en netlify/functions (coach.mjs, econ.mjs, econ-sync.mjs) y netlify/lib/econ.mjs, y la base de datos es Supabase (supabase/schema.sql).

Objetivo: que funcione como app full-stack de AI Studio publicable en Cloud Run, SIN perder funciones y SIN cambiar el diseño.

Reglas obligatorias:
1. Sirve public/index.html, public/config.js y public/favicon.svg tal como están, como archivos estáticos. No reescribas la interfaz en React ni cambies textos (español), colores, tipografías, rutas con # (#inicio, #acceso, #dash, #jour, #cal, #edge, #news, #strat, #scan, #bt, #accounts, #plan, #tools, #prop, #set) ni la lógica del navegador.
2. Mantén Supabase para usuarios y datos exactamente como está (la app ya se conecta sola con window.EE_CONFIG y la librería @supabase/supabase-js@2.58.0).
3. Crea un servidor Node (Express) que:
   a) Sirva la carpeta public.
   b) POST /api/coach: misma lógica que netlify/functions/coach.mjs (verifica el token de Supabase del encabezado Authorization con SUPABASE_URL/auth/v1/user, aplica el límite diario con la tabla ai_usage, arma el mismo prompt según body.type sea "briefing" o no, y llama a Gemini con la clave del servidor). Devuelve { text, remaining } o { error } con los mismos códigos (401, 413, 429, 502).
   c) GET /api/econ?from=AAAA-MM-DD&to=AAAA-MM-DD: misma lógica que netlify/functions/econ.mjs y netlify/lib/econ.mjs (descarga https://nfs.faireconomy.media/ff_calendar_thisweek.json con User-Agent de navegador, normaliza, guarda en la tabla econ_events de Supabase con SUPABASE_SERVICE_ROLE_KEY si los datos tienen más de 3 horas, y devuelve { source, updated, from, to, events }). Agrega caché en memoria de 15 minutos.
   d) Cada 4 horas, mientras el servidor esté activo, ejecuta la sincronización del calendario (equivalente a econ-sync.mjs).
   e) GET /api/bars?symbol=&interval=&outputsize=: misma lógica que netlify/functions/bars.mjs (verifica el token de Supabase, llama a Twelve Data con TWELVEDATA_API_KEY del servidor, convierte las velas a { t, o, h, l, c } en segundos UTC, caché de 4 minutos y los mismos mensajes de error 401/403/404/429).
4. Lee estas variables del entorno/secretos: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TWELVEDATA_API_KEY, AI_DAILY_LIMIT (por defecto 5), GEMINI_MODEL (opcional) y la clave de Gemini que AI Studio configura. Nunca envíes la clave de Gemini ni la clave service_role al navegador.
5. No borres ni modifiques los archivos de netlify ni supabase (sirven de respaldo).
6. Al terminar, dame: la lista exacta de archivos creados o modificados, y cómo probar /api/econ y /api/coach.
```

## Prompt 2 · Corregir un error (cámbialo según el caso)

```
En la vista previa pasa esto: [describe lo que ves y pega el mensaje de error de la consola o del servidor].
Corrígelo con el cambio mínimo posible. No modifiques nada más de public/index.html ni del diseño. Dime qué archivo y qué líneas cambiaste.
```

## Prompt 3 · Activar el inicio con Google (opcional)

```
Quiero que el botón "Continuar con Google" funcione. La app usa Supabase Auth (signInWithOAuth con provider "google"). Solo cambia google: true en public/config.js y dime qué debo configurar en Supabase (Authentication → Providers → Google) y en Google Cloud (pantalla de consentimiento OAuth y URI de redirección). No cambies nada más.
```

## Prompt 4 (opcional, avanzado) · Pasar de Supabase a Firebase

Úsalo solo si quieres que todo quede dentro de Google y la app ya funciona con el Prompt 1.

```
Reemplaza Supabase por Firebase sin cambiar la interfaz:
- Firebase Authentication con correo/contraseña (verificación de correo y recuperación de contraseña) y Google.
- Cloud Firestore: users/{uid}/items/{id} con { kind: 't'|'b'|'p'|'e'|'settings', data, updated_at }; econ_events/{id} (lectura para todos, escritura solo del servidor); users/{uid}/ai_usage (solo servidor).
- Reglas de seguridad: cada usuario solo lee y escribe sus propios items.
- Adapta en public/index.html únicamente el objeto Store en modo "sb" (Store.init, Store.useSession, Store.write), la vista viewAccesoSB y el envío del token en runAIServer y aiBriefing, manteniendo exactamente el mismo comportamiento.
- En el servidor, verifica el ID token de Firebase en /api/coach y usa Firestore en /api/econ.
Antes de cambiar nada, explícame el plan y espera mi confirmación.
```

---

## Comprobación (en la vista previa y luego en la dirección publicada)

| Prueba | Resultado esperado |
|---|---|
| Abrir la app | Se ve la portada de Ernest Edge |
| `/api/econ?from=…&to=…` (lunes y domingo de esta semana) | Texto que empieza con `{"source":"Forex Factory"` |
| Crear cuenta → confirmar correo → entrar | Aparece "Configura tu journal" |
| Registrar un trade y recargar | El trade sigue ahí |
| Cuentas | Puedes agregar cuentas reales y de fondeo, editarlas y eliminarlas |
| Calendario | P&L por día, total por semana, puntos de noticias y revisión semanal |
| Noticias | Semana con horas locales, impacto y previsión |
| Análisis → Analizar con IA | Texto en español y "Te quedan N revisiones con IA hoy" |
| Escáner → Histórico | Encuentra setups con los datos de práctica |
| Backtesting | El gráfico de velas avanza vela a vela |

## Bueno saber

- AI Studio reescribe código con IA: revisa siempre la lista de comprobación antes de compartir la dirección con tu grupo, y guarda cada versión buena en GitHub.
- En el plan gratuito de Gemini, Google puede revisar y usar los prompts y respuestas para mejorar sus productos. Ernest Edge solo envía estadísticas agregadas y la lista pública de noticias.
- Cloud Run tiene un nivel gratuito; un uso muy alto podría generar costos si activas facturación. Las dos primeras apps se publican sin tarjeta.
- El modo "Mercado ahora" del escáner usa Twelve Data en tu sitio; la descarga de TradingView solo existe dentro de claude.ai.
- La versión de Netlify (README.md) sigue siendo válida como respaldo.
