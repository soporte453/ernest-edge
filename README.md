# Ernest Edge · Guía completa para publicarlo gratis

Ernest Edge es un journal de trading profesional: portada, cuentas de usuario, dashboard, journal, calendario de resultados, **calendario económico con briefing diario**, plan del día, análisis, estrategias de liquidez, backtesting vela a vela, simulador de prueba de fondeo, herramientas (lote, sesiones, riesgo de ruina, crecimiento) y coach automático y con IA.

Esta carpeta es la versión independiente: no depende de claude.ai.

---

## 1. Cómo funciona

| Pieza | Servicio (gratis) | Qué hace |
|---|---|---|
| La web | **Netlify** | Publica la app con https y ejecuta 3 funciones de servidor |
| Usuarios y datos | **Supabase** | Registro con correo, inicio de sesión y base de datos privada por usuario |
| Calendario económico | **Forex Factory** (feed público semanal) | Eventos, impacto, previsión, anterior y real; se guarda el historial en Supabase |
| Coach y briefing con IA | **Google Gemini** (plan gratuito) | Resume tus estadísticas y las noticias del día. Opcional |
| Precios en vivo | **Twelve Data** (plan gratuito) | Velas para el escáner "Mercado ahora" y para descargar datos de backtesting. Opcional |
| Reporte y briefing automáticos | Incluidos en la app | Funcionan siempre, gratis y sin límite |

```
ernest-edge/
├── public/
│   ├── index.html            ← la app completa
│   ├── config.js             ← datos públicos de Supabase
│   └── favicon.svg
├── netlify/
│   ├── functions/
│   │   ├── coach.mjs         ← coach y briefing con IA (protege tu clave de Google)
│   │   ├── econ.mjs          ← /api/econ: entrega el calendario económico
│   │   ├── bars.mjs          ← /api/bars: velas en vivo de Twelve Data (protege tu clave)
│   │   └── econ-sync.mjs     ← tarea automática: guarda el calendario cada 4 horas
│   └── lib/econ.mjs          ← lógica compartida del calendario
├── supabase/schema.sql       ← tablas y reglas de privacidad
└── netlify.toml
```

**Cómo se actualiza el calendario económico:** cada 4 horas Netlify descarga la semana de Forex Factory y la guarda en Supabase. Si alguien abre la app y los datos tienen más de 3 horas, se actualizan en ese momento. Así cada día queda guardado con sus noticias, y el calendario de resultados muestra qué noticias hubo el día que operaste. La IA no inventa el calendario: solo resume los eventos reales.

Tiempo estimado: 45 a 60 minutos la primera vez. No necesitas instalar nada.

---

## 2. Antes de empezar

Ten a mano:
- Un correo (para Supabase, GitHub, Netlify y Google).
- El archivo `ernest-edge.zip` descomprimido en tu computadora.
- Un bloc de notas para copiar 4 datos: **Project URL**, **clave pública (anon/publishable)**, **clave privada (service_role/secret)** y **clave de Gemini**.

> Regla de seguridad: la clave **service_role / secret** y la clave de **Gemini** solo van en las variables de Netlify (paso 5). **Nunca** en `config.js` ni en GitHub.

---

## 3. Paso 1 · Crear la base de datos (Supabase)

1. Entra a **supabase.com** → **Start your project** → crea tu cuenta.
2. **New project**:
   - Name: `ernest-edge`
   - Database password: genera una y guárdala.
   - Region: la más cercana (por ejemplo, East US).
   - Plan: **Free**. Pulsa **Create new project** y espera 1–2 minutos.
3. En el menú izquierdo abre **SQL Editor** → **New query**.
4. Abre `supabase/schema.sql` con el bloc de notas, copia **todo**, pégalo y pulsa **Run**. Debe decir *Success. No rows returned*.
5. Comprueba en **Table Editor** que existen tres tablas: `items`, `ai_usage` y `econ_events`.
6. Abre **Project Settings** (engranaje) → **API Keys** / **Data API** y copia en tu bloc de notas:
   - **Project URL**: algo como `https://abcdefghijk.supabase.co`
   - Clave pública: **anon public** o **publishable** (`sb_publishable_…`)
   - Clave privada: **service_role** o **secret** (`sb_secret_…`). Es secreta.

## 4. Paso 2 · Configurar la app

1. Abre `public/config.js` con el bloc de notas.
2. Reemplaza:
   - `PEGA_AQUI_TU_SUPABASE_URL` → tu **Project URL**
   - `PEGA_AQUI_TU_SUPABASE_ANON_KEY` → tu clave **pública**
3. Guarda el archivo. No toques `aiEndpoint`.

## 5. Paso 3 · Subir el proyecto a GitHub

1. Entra a **github.com** y crea una cuenta.
2. Arriba a la derecha **+ → New repository**:
   - Repository name: `ernest-edge`
   - **Private** (recomendado) → **Create repository**.
3. En la página del repositorio pulsa **uploading an existing file**.
4. Arrastra **el contenido** de la carpeta `ernest-edge`: las carpetas `public`, `netlify`, `supabase` y los archivos `netlify.toml`, `README.md`, `.gitignore`. Arrastra lo que hay dentro, no la carpeta contenedora.
5. Abajo pulsa **Commit changes**.
6. Comprueba que en GitHub ves `netlify/functions/coach.mjs`, `econ.mjs`, `econ-sync.mjs` y `netlify/lib/econ.mjs`. Si falta alguna carpeta, súbela de nuevo.

## 6. Paso 4 · Publicar en Netlify

1. Entra a **netlify.com** → **Sign up** → **con GitHub**.
2. **Add new site → Import an existing project → Deploy with GitHub**. Autoriza a Netlify y elige el repositorio `ernest-edge`.
3. **No cambies nada** en la configuración: Netlify lee `netlify.toml` (carpeta `public` y funciones en `netlify/functions`). Pulsa **Deploy**.
4. Espera a que diga **Published**. Tu dirección será algo como `https://lucky-name-123.netlify.app`.
5. Cámbiala en **Site configuration → General → Site details → Change site name** → `ernest-edge` (si está libre) → `https://ernest-edge.netlify.app`.

## 7. Paso 5 · Variables secretas en Netlify

**Site configuration → Environment variables → Add a variable → Add a single variable**. Crea estas, una por una:

| Variable | Valor | Para qué |
|---|---|---|
| `SUPABASE_URL` | tu Project URL | Funciones del servidor |
| `SUPABASE_ANON_KEY` | tu clave pública | Verificar sesiones en la IA |
| `SUPABASE_SERVICE_ROLE_KEY` | tu clave **service_role / secret** | Guardar el calendario económico |
| `GEMINI_API_KEY` | tu clave de Gemini (paso 7) | IA. Opcional |
| `AI_DAILY_LIMIT` | `5` | Usos de IA por usuario y día. Opcional |
| `GEMINI_MODEL` | `gemini-flash-latest` | Modelo de IA. Opcional |
| `TWELVEDATA_API_KEY` | tu clave de Twelve Data (paso 7b) | Precios en vivo. Opcional |

Después: **Deploys → Trigger deploy → Deploy site** para que las tome.

## 8. Paso 6 · Conectar los correos con tu dirección

En Supabase: **Authentication → URL Configuration**:
- **Site URL**: `https://ernest-edge.netlify.app` (tu dirección)
- **Redirect URLs** → **Add URL**: la misma dirección.
- Guarda.

Sin esto, los correos de confirmación y de "olvidé mi contraseña" llevarían a una página equivocada.

## 9. Paso 7 · Activar la IA gratuita (opcional)

1. Entra a **aistudio.google.com** con tu cuenta de Google.
2. **Get API key → Create API key** (no pide tarjeta). Cópiala.
3. Pégala en Netlify como `GEMINI_API_KEY` (paso 5) y vuelve a desplegar.

En el plan gratuito, Google puede usar lo que se envía para mejorar sus modelos. Ernest Edge solo envía estadísticas agregadas y la lista pública de noticias del día, nunca notas, nombres ni montos. Si el modelo `gemini-flash-latest` deja de estar disponible gratis, mira en AI Studio cuál está y ponlo en `GEMINI_MODEL`.

## 9b. Paso 7b · Activar los precios en vivo (opcional, gratis)

1. Entra a **twelvedata.com** → **Sign up** (plan **Basic**, gratis, sin tarjeta).
2. En tu cuenta abre **API Keys** y copia tu clave.
3. Pégala en Netlify como `TWELVEDATA_API_KEY` (paso 5) y vuelve a desplegar.

Con esto, en tu sitio se activan **Escáner → Mercado ahora** y el botón **Twelve Data** en Backtesting para descargar velas de 5 minutos.

Lo que cubre el plan gratuito: forex, oro, plata, platino, cripto y acciones de EE. UU. Los índices (Nasdaq, Dow, S&P, Russell) se analizan con su ETF (QQQ, DIA, SPY, IWM), que sigue el mismo movimiento pero en otra escala de precio. Petróleo, gas, índices europeos y asiáticos suelen requerir plan de pago. Límite: 8 consultas por minuto y 800 por día; cada activo escaneado usa una. Los datos del plan gratuito pueden venir con algunos minutos de retraso. Puedes cambiar el símbolo de cada activo en **Ajustes → Activos → Twelve Data**.

## 10. Paso 8 · Comprobar que todo funciona

| Prueba | Cómo | Resultado esperado |
|---|---|---|
| Portada | Abre tu dirección | Se ve la portada de Ernest Edge |
| Calendario (servidor) | Abre `https://TU-SITIO.netlify.app/api/econ?from=AAAA-MM-DD&to=AAAA-MM-DD` con las fechas de lunes y domingo de esta semana | Un texto que empieza con `{"source":"Forex Factory"` y una lista de eventos |
| Registro | Crear cuenta → confirma el correo → inicia sesión | Entras y aparece "Configura tu journal" |
| Datos | Registra un trade y recarga la página | El trade sigue ahí |
| Noticias | Menú **Noticias** | La semana en tu hora local, con impacto, previsión y anterior |
| Calendario | Menú **Calendario** | Puntos rojos en días con noticias fuertes; al hacer clic, trades, noticias y plan del día |
| Tarea automática | Netlify → **Logs → Functions → econ-sync** → **Run now** (si aparece la opción) | Mensaje `Calendario sincronizado: N eventos` |
| IA | **Análisis → Analizar con IA** o **Noticias → Con IA** | Un texto en español y los usos que te quedan |

## 11. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| La app funciona en "modo local" o no pide cuenta | `config.js` aún tiene `PEGA_AQUI…`. Corrígelo en GitHub (abre el archivo → lápiz → Commit) |
| "Correo o contraseña incorrectos" con la contraseña bien | Confirma primero el correo (revisa spam) |
| El enlace del correo abre otra página | Revisa el paso 6 (Site URL y Redirect URLs) |
| `/api/econ` da error 502 | Forex Factory no respondió. Reintenta en unos minutos; mientras tanto se sirve lo guardado |
| Noticias vacías en días pasados | El historial se guarda desde el día que publicas; los días anteriores no tienen datos |
| La IA dice "no está configurada" | Falta `GEMINI_API_KEY`, `SUPABASE_URL` o `SUPABASE_ANON_KEY` en Netlify, o no volviste a desplegar |
| La IA dice "saturada" | El plan gratuito de Google llegó a su límite por minuto; espera y reintenta |
| No llegan correos a varias personas | El correo incluido en Supabase envía pocos por hora. Configura SMTP (sección 13) |
| La app dejó de cargar datos tras días sin uso | El proyecto gratuito de Supabase se pausó por inactividad. Entra a Supabase y pulsa **Restore/Resume** |

## 12. Cómo actualizar la app

Cuando recibas una versión nueva de `index.html` u otro archivo:
1. En GitHub abre el archivo → **Add file → Upload files** → súbelo con el mismo nombre → **Commit changes**.
2. Netlify publica la versión nueva sola en un minuto. Los datos de los usuarios no se tocan.

## 13. Opcional · Más profesional

- **Dominio propio** (ej. `ernestedge.com`, ~US$10–15 al año): cómpralo en cualquier registrador → Netlify **Domain management → Add a domain** → sigue sus pasos. Luego actualiza la Site URL y las Redirect URLs (paso 6).
- **Inicio con Google:** Supabase **Authentication → Providers → Google** (sigue sus instrucciones para crear credenciales en Google Cloud) y pon `google: true` en `config.js`.
- **Correo propio para muchos usuarios:** crea una cuenta gratuita en un servicio SMTP (por ejemplo Resend) y configúralo en Supabase **Authentication → Emails → SMTP Settings**.

## 14. Pasar tus datos desde la versión de claude.ai

1. En claude.ai: **Ajustes → Exportar journal (CSV)**.
2. En tu sitio: **Ajustes → Importar journal desde Excel (CSV)**.
3. Las velas de backtesting se vuelven a importar desde tu CSV de MT5.

## 15. Qué funciona en la versión independiente

| Función | Estado |
|---|---|
| Portada, registro, inicio de sesión, recuperación de contraseña | ✅ |
| Dashboard, journal, calendario de resultados, análisis, estrategias | ✅ Sincronizado y privado por usuario |
| Calendario económico, ventanas sin operar, noticias en el calendario y en el análisis | ✅ Se actualiza solo cada 4 h |
| Plan del día, calculadora de lote, sesiones del mercado, riesgo de ruina, crecimiento | ✅ |
| Backtesting vela a vela con costos | ✅ Velas desde CSV de MT5, guardadas en ese dispositivo |
| Simulador de fondeo | ✅ |
| Reporte y briefing automáticos | ✅ Gratis y sin límite |
| Coach y briefing con IA | ✅ Con el paso 7 |
| Escáner "Mercado ahora" y descarga de velas | ✅ Con Twelve Data (paso 7b) |
| Descarga de velas desde TradingView | ❌ Solo dentro de claude.ai |

## 16. Límites de los planes gratuitos

Cambian con el tiempo; revisa los actuales en cada servicio. Para un grupo de traders bastan los planes gratuitos de Netlify y Supabase. Lo que más se nota: la pausa por inactividad de Supabase, el límite de correos del servicio incluido y los límites por minuto de la IA gratuita.

## Aviso

Ernest Edge es una herramienta de registro y análisis. No es asesoría financiera ni una recomendación de inversión. Datos del calendario económico: Forex Factory. Gráficos: TradingView Lightweight Charts.
