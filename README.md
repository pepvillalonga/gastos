# Mis gastos

Registra tus gastos automáticamente: pagas con Apple Pay en el iPhone → un atajo envía el pago a esta app → se clasifica en una categoría y se guarda en Neon (Postgres) → lo ves en una web privada pensada para el móvil.

- **Stack**: Next.js 16 (App Router, TypeScript, Tailwind) · Neon · Clerk · Gemini (plan gratuito) · Vercel
- **Clasificación** (en este orden): categoría enviada por el atajo → regla guardada del comercio → palabras clave de comercios españoles → Gemini → «Otros». La IA nunca impide guardar un pago.
- Cuando cambias la categoría de un movimiento en la web, se guarda como regla y los siguientes pagos en ese comercio ya irán a esa categoría.
- Si el atajo envía el mismo pago dos veces (mismo comercio e importe en menos de 2 minutos), se ignora el duplicado.
- Los importes negativos cuentan como devoluciones y restan del total.

## Estructura

```
app/
  (app)/page.tsx            Panel (mes, total, por día, por categoría, top comercios)
  (app)/movimientos/        Lista con buscador y filtros
  api/ingest/route.ts       Endpoint para los atajos del iPhone
  actions.ts                Server actions (cambiar categoría, borrar, añadir, editar)
  sign-in/page.tsx          Pantalla de entrada
components/                 Piezas de la interfaz
lib/
  transactions.ts           Guardar, clasificar, duplicados y consultas
  merchant.ts               Normalizar nombres + palabras clave
  gemini.ts                 Llamada REST a Gemini
  money.ts                  Leer "1.234,56 €" y formatear importes
db/schema.sql               Tablas para ejecutar en Neon
proxy.ts                    Protección con Clerk (en Next.js 16 el middleware se llama proxy)
```

---

## 1. Base de datos en Neon

1. Entra en <https://neon.tech> y crea una cuenta (gratis).
2. **Create project** → nombre `gastos`, región **AWS Europe Central 1 (Frankfurt)** (la más cercana a España), Postgres la versión por defecto.
3. En el menú de la izquierda abre **SQL Editor**, pega el contenido de [`db/schema.sql`](db/schema.sql) y pulsa **Run**. Debe terminar sin errores (puedes ejecutarlo más veces sin problema).
4. Pulsa **Connect** (arriba en el panel del proyecto) y copia la **connection string**. Es algo como
   `postgresql://neondb_owner:xxxx@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Ese es tu `DATABASE_URL`.

## 2. Login con Clerk

1. Entra en <https://dashboard.clerk.com>, crea una cuenta y pulsa **Create application**.
2. Nombre `Mis gastos`. En las opciones de inicio de sesión deja **Email** (y si quieres **Google**). Crear.
3. En **Configure → API keys** copia:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (empieza por `pk_`)
   - `CLERK_SECRET_KEY` (empieza por `sk_`)
4. **Crea tu usuario**: en **Users → Create user** añade tu email (o entra una vez en la web y regístrate antes del paso siguiente).
5. **Desactiva el registro público (imprescindible)**: **Configure → Restrictions** (en algunas versiones del panel: *User & authentication → Restrictions*) → **Sign-up mode → Restricted**.
   ⚠️ Cualquier usuario de tu app de Clerk puede ver y modificar todos los gastos. Si dejas el registro abierto, cualquiera podría crearse una cuenta y entrar. Revisa también **Users** para que solo estés tú.

> Las claves `pk_test_`/`sk_test_` (instancia de *desarrollo*) funcionan en un dominio `*.vercel.app`, pero muestran un pequeño aviso de «Development mode». Las de *producción* requieren un dominio propio. Para uso personal, las de desarrollo son suficientes.

## 3. API key de Gemini (gratis)

1. Entra en <https://aistudio.google.com> con tu cuenta de Google.
2. Pulsa **Get API key → Create API key** (si te lo pide, crea un proyecto nuevo).
3. Copia la clave: es tu `GEMINI_API_KEY`.
4. `GEMINI_MODEL` es opcional. Por defecto se usa **`gemini-3.5-flash-lite`** (modelo Flash-Lite estable incluido en el plan gratuito a fecha de octubre de 2026). Si Google lo retira, cambia la variable en Vercel por el Flash-Lite que aparezca en <https://ai.google.dev/gemini-api/docs/models>, sin tocar código.

Solo se llama a Gemini con comercios nuevos que no estén en las reglas ni en las palabras clave, así que el consumo es mínimo.

## 4. Clave para los atajos (`INGEST_SECRET`)

Es la contraseña que enviará el iPhone. Genera una larga y aleatoria en la terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guárdala: la necesitarás en Vercel y en los dos atajos.

## 5. Probar en tu ordenador (opcional)

```bash
cp .env.example .env.local   # y rellena los valores
npm install
npm run dev
```

Abre <http://localhost:3000>.

## 6. Subir a GitHub

1. Crea un repositorio **privado** vacío en <https://github.com/new> (por ejemplo `gastos`), sin README.
2. En la carpeta del proyecto:

```bash
git add .
git commit -m "Primera versión de Mis gastos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/gastos.git
git push -u origin main
```

El archivo `.env.local` **no** se sube (está en `.gitignore`); solo se sube `.env.example`, que no tiene secretos.

## 7. Desplegar en Vercel

1. Entra en <https://vercel.com> con tu cuenta de GitHub → **Add New… → Project** → importa el repositorio `gastos`.
2. Framework: Next.js (lo detecta solo). Antes de pulsar **Deploy**, abre **Environment Variables** y añade:

| Nombre | Valor |
| --- | --- |
| `DATABASE_URL` | la connection string de Neon |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_...` de Clerk |
| `CLERK_SECRET_KEY` | `sk_...` de Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `INGEST_SECRET` | la clave del paso 4 |
| `GEMINI_API_KEY` | la clave de AI Studio |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (opcional) |

3. **Deploy**. Al terminar tendrás una URL tipo `https://gastos-tuusuario.vercel.app`.
4. Si cambias variables más adelante: **Settings → Environment Variables** y luego **Deployments → ⋯ → Redeploy**.

> En el iPhone abre la web en Safari → botón Compartir → **Añadir a pantalla de inicio**. Se abrirá a pantalla completa como una app.

## 8. Probar el endpoint con curl

En macOS, Linux o Git Bash (Windows):

```bash
curl -X POST https://TU-APP.vercel.app/api/ingest \
  -H "Authorization: Bearer TU_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"amount":"12,50 €","merchant":"Mercadona","card":"Visa 4821","source":"applepay"}'
```

Respuesta esperada:

```json
{"ok":true,"duplicate":false,"category":"supermercado","category_name":"Supermercado","message":"12,50 € en Mercadona → Supermercado"}
```

En PowerShell (Windows):

```powershell
Invoke-RestMethod -Method Post -Uri "https://TU-APP.vercel.app/api/ingest" `
  -Headers @{ Authorization = "Bearer TU_INGEST_SECRET" } -ContentType "application/json; charset=utf-8" `
  -Body '{"amount":"8,90 €","merchant":"Frutería Paco","category":"Supermercado","source":"manual"}'
```

### Campos que acepta `POST /api/ingest`

| Campo | Obligatorio | Ejemplo | Notas |
| --- | --- | --- | --- |
| `amount` | sí | `"12,50 €"`, `"1.234,56€"`, `12.5` | Texto en formato español o número. Negativo = devolución. |
| `merchant` | sí | `"Mercadona"` | |
| `card` | no | `"Visa 4821"` | |
| `category` | no | `"Supermercado"` o `"supermercado"` | Si no es una categoría válida (p. ej. «Automática»), se clasifica sola. |
| `source` | no | `"applepay"` / `"manual"` | Por defecto `applepay`. |
| `paid_at` | no | `"2026-10-03T14:05:00+02:00"`, `"03/10/2026 14:05"` | Si falta o no se entiende, se usa la hora actual. |

Errores: `401` clave incorrecta, `400` datos no válidos (el campo `message` explica qué falta), `500` fallo de base de datos.

---

## 9. Atajo automático para Apple Pay

Se ejecuta solo cada vez que pagas con Apple Pay. Hace falta iOS 17 o posterior.

1. Abre la app **Atajos** → pestaña **Automatización** → **+** (o **Nueva automatización**).
2. Elige **Transacción**. Ojo: **no** elijas «App».
3. Configura:
   - **Tarjeta**: marca tus tarjetas de Apple Pay.
   - **Categoría** y **Comercio**: déjalos en **Cualquiera**.
   - Marca **Ejecutar inmediatamente**. Esto equivale a **desactivar «Preguntar antes de ejecutar»** (en versiones antiguas de iOS aparece como ese interruptor: desactívalo y confirma **No preguntar**).
   - **Notificar al ejecutar**: desactívalo (ya mostraremos nuestra propia notificación).
4. Pulsa **Siguiente** → **Nueva automatización en blanco**.
5. Añade la acción **Obtener contenido de URL** y configúrala:
   - **URL**: `https://TU-APP.vercel.app/api/ingest`
   - Toca la flecha **›** (o «Mostrar más») para ver más opciones:
   - **Método**: `POST`
   - **Cabeceras** → **Añadir nueva cabecera** (dos veces):
     - Clave `Authorization` → Valor `Bearer TU_INGEST_SECRET` (con la palabra Bearer, un espacio y tu clave)
     - Clave `Content-Type` → Valor `application/json`
   - **Cuerpo de la solicitud**: **JSON**. Añade estos campos (todos de tipo **Texto**):
     - `amount` → toca el valor, elige la variable **Entrada del atajo** (aparece como *Transacción*), tócala otra vez y selecciona **Importe**.
     - `merchant` → **Entrada del atajo** → **Comercio**.
     - `card` → **Entrada del atajo** → **Tarjeta** (o **Nombre**, según la versión de iOS).
     - `source` → escribe `applepay`.
6. Añade la acción **Obtener valor del diccionario**: **Obtener** *Valor* de la **Clave** `message` en **Contenido de la URL**.
7. Añade la acción **Mostrar notificación** y pon como texto la variable **Valor del diccionario**.
8. Pulsa **OK**.

Haz un pago de prueba con Apple Pay: en unos segundos verás una notificación tipo «12,50 € en Mercadona → Supermercado».

> Si no ves la notificación, abre el atajo y pulsa ▶︎ para probarlo: Atajos te mostrará el error. Lo más habitual es la cabecera `Authorization` mal escrita (respuesta `No autorizado`).

## 10. Atajo manual (efectivo o tarjeta física)

1. Atajos → pestaña **Atajos** → **+**. Nómbralo **Gasto en efectivo** (así podrás decir «Oye Siri, gasto en efectivo»).
2. Acción **Solicitar entrada**: tipo **Número**, pregunta `¿Cuánto?` (activa *Permitir decimales* si aparece la opción).
3. Acción **Solicitar entrada**: tipo **Texto**, pregunta `¿Dónde?`.
4. Acción **Elegir de la lista**, con estos elementos (pulsa **Lista** y añade uno por línea):
   `Automática`, `Pádel`, `Supermercado`, `Restaurantes y bares`, `Gasolina`, `Transporte`, `Deporte y gimnasio`, `Ocio`, `Compras`, `Ropa`, `Suscripciones`, `Salud y farmacia`, `Hogar`, `Viajes`, `Belleza y cuidado personal`, `Regalos`, `Educación`, `Otros`.
   Pon como texto de la pregunta `Categoría`. Si eliges «Automática», la app la decide sola.
5. Acción **Obtener contenido de URL**, igual que en el atajo automático (URL, método `POST` y las dos cabeceras). En el **Cuerpo de la solicitud → JSON**, todos los campos de tipo **Texto**:
   - `amount` → variable **Entrada proporcionada** (la primera, la del importe).
   - `merchant` → variable **Entrada proporcionada** (la segunda). Si las dos se llaman igual, mantén pulsada la variable para elegir la correcta, o usa **Ajustar variable** después de cada pregunta para ponerles nombre (`importe`, `comercio`).
   - `category` → variable **Elemento seleccionado**.
   - `card` → escribe `Efectivo` (o déjalo fuera).
   - `source` → escribe `manual`.
6. **Obtener valor del diccionario** (clave `message`) y **Mostrar notificación**, como en el atajo automático.
7. En los ajustes del atajo (icono ⓘ) puedes activar **Añadir a pantalla de inicio** o **Mostrar en la hoja de compartir**.

Este atajo solo se ejecuta cuando lo lanzas tú, así que no pregunta nada antes de ejecutarse. También puedes añadir gastos desde la web con el botón **+**.

---

## Categorías

🎾 Pádel · 🛒 Supermercado · 🍽️ Restaurantes y bares · ⛽ Gasolina · 🚗 Transporte · 💪 Deporte y gimnasio · 🎉 Ocio · 🛍️ Compras · 👕 Ropa · 🔁 Suscripciones · 💊 Salud y farmacia · 🏠 Hogar · ✈️ Viajes · 💈 Belleza y cuidado personal · 🎁 Regalos · 📚 Educación · 📦 Otros

Los colores y emojis están en [`lib/categories.ts`](lib/categories.ts). Las palabras clave de comercios, en [`lib/merchant.ts`](lib/merchant.ts): añade las tuyas si algún comercio habitual no se reconoce (o cámbialo una vez desde la web y ya quedará guardado).

## Problemas frecuentes

- **«Algo ha fallado» en el panel**: revisa `DATABASE_URL` y que ejecutaste `db/schema.sql`.
- **Todo cae en «Otros»**: revisa `GEMINI_API_KEY` y mira los logs en Vercel (**Project → Logs**, busca `[gemini]`).
- **El atajo dice «No autorizado»**: la cabecera debe ser exactamente `Authorization: Bearer TU_INGEST_SECRET`.
