# Mis gastos

Registra tus gastos automáticamente: pagas con Apple Pay en el iPhone → un atajo envía el pago a esta app → se clasifica en una categoría y se guarda en Neon (Postgres) → lo ves en una web app privada pensada para el iPhone.

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
  api/ingest/route.ts       Endpoint de los atajos (POST guarda un gasto, GET lista las categorías)
  actions.ts                Server actions (cambiar categoría, borrar, añadir, editar)
  sign-in/page.tsx          Pantalla de entrada
  manifest.ts, apple-icon.tsx, icon.svg   Web app para iOS e iconos
components/                 Piezas de la interfaz
lib/
  transactions.ts           Guardar, clasificar, duplicados y consultas
  merchant.ts               Normalizar nombres + palabras clave
  gemini.ts                 Llamada REST a Gemini (con modelo de respaldo)
  money.ts                  Leer "1.234,56 €" y formatear importes
db/schema.sql               Tablas para ejecutar en Neon
proxy.ts                    Protección con Clerk (en Next.js 16 el middleware se llama proxy)
```

---

## 1. GitHub y Vercel

1. Sube el código a un repositorio **privado** de GitHub.
2. En <https://vercel.com> → **Add New… → Project** → importa el repositorio. Vercel detecta Next.js solo.
3. Cada `git push` a `main` despliega automáticamente.

El archivo `.env` / `.env.local` **no** se sube (está en `.gitignore`); solo se sube `.env.example`, que no tiene secretos.

## 2. Base de datos (Neon desde Vercel)

1. Vercel → proyecto → **Storage → Create → Neon**, región **Frankfurt**. Vercel crea la base de datos y añade `DATABASE_URL` sola.
2. **Open in Neon → SQL Editor** → pega el contenido de [`db/schema.sql`](db/schema.sql) → **Run**. La integración **no** crea las tablas; sin este paso los pagos fallan con `relation "transactions" does not exist`.
3. En **Tables** deben aparecer `transactions` y `merchant_rules`.

## 3. Dominio propio

Ejemplo con el subdominio `gastos.tu-dominio.com`; los registros se crean en tu proveedor de DNS.

1. Vercel → proyecto → **Settings → Domains** → añade `gastos.tu-dominio.com`.
2. En tu proveedor de DNS, en la zona de `tu-dominio.com`, crea:

| Tipo | Host | Destino |
| --- | --- | --- |
| A | `gastos` | `76.76.21.21` |

Vercel emite el certificado HTTPS solo en unos minutos.

## 4. Login con Clerk (desde Vercel Marketplace)

La aplicación de Clerk la gestiona la integración de Vercel, así que algunas cosas se cambian desde Vercel y otras desde Clerk.

**Dominio de producción**
1. Vercel → **Integrations → Clerk** → tu aplicación de Clerk → **Settings → Change Configuration** → **Production domain**: `gastos.tu-dominio.com`.
2. Clerk → **Production → Configure → Domains** muestra 5 registros. Créalos en tu DNS como **CNAME** (si tu proveedor añade el dominio solo, pon solo la parte de la izquierda):

| Host | Destino |
| --- | --- |
| `clerk.gastos` | `frontend-api.clerk.services` |
| `accounts.gastos` | `accounts.clerk.services` |
| `clkmail.gastos` | `mail.….clerk.services` (cópialo de Clerk) |
| `clk._domainkey.gastos` | `dkim1.….clerk.services` (cópialo de Clerk) |
| `clk2._domainkey.gastos` | `dkim2.….clerk.services` (cópialo de Clerk) |

3. Clerk → **Verify Records**, y espera a que salgan los certificados SSL en verde.
4. Clerk → **API keys**: copia con 📋 la **Publishable key** (`pk_live_…`, debe ser larga) y la **Secret key** (`sk_live_…`). Ponlas en Vercel (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` como *Config* y `CLERK_SECRET_KEY` como *Secret*) → **Redeploy**.

**Acceso privado (imprescindible)**
- Clerk → **User & authentication → Access mode → Invite-only**. Nadie puede registrarse.
- Clerk → **Users → Create user** con tu email.

⚠️ Cualquier usuario de la app de Clerk puede ver y modificar todos los gastos: deja siempre el acceso en **Invite-only** y revisa que en **Users** solo estés tú.

**Entrar con Google**
En producción Clerk exige credenciales propias de Google:
1. <https://console.cloud.google.com> → proyecto `Mis gastos` → **Google Auth Platform**:
   - **Información de la marca**: nombre `Mis gastos`, tu email; en **Dominios autorizados** pon `tu-dominio.com` (el dominio raíz, no el subdominio).
   - **Público**: déjalo en **Prueba** y añade tu Gmail en **Usuarios de prueba**. Publicar la app exigiría página principal y política de privacidad, y no hace falta.
   - **Clientes → Crear cliente** → *Aplicación web*:
     - Orígenes de JavaScript: `https://gastos.tu-dominio.com`
     - URI de redireccionamiento: `https://clerk.gastos.tu-dominio.com/v1/oauth_callback`
2. Clerk → **SSO connections → Google** → **Use custom credentials**: pega el ID y el secreto, y activa **Enable for sign-up and sign-in**. Con *Invite-only* solo sirve para iniciar sesión. Los scopes por defecto (openid, email y profile) son suficientes.

## 5. Gemini (gratis)

1. <https://aistudio.google.com/apikey> → **Create API key** → ponla en Vercel como `GEMINI_API_KEY` → **Redeploy**.
2. `GEMINI_MODEL` es opcional. Por defecto se usa `gemini-3.5-flash-lite`. Si Google responde que está saturado (503), tiene un límite (429) o tarda más de 6 s, la app reintenta con `gemini-3.1-flash-lite`. Los dos son del plan gratuito.

Solo se llama a Gemini con comercios nuevos que no estén en las reglas ni en las palabras clave. Si Gemini falla, el gasto se guarda en «Otros» **sin** crear regla, así que se reintentará la próxima vez.

## 6. Clave de los atajos (`INGEST_SECRET`)

Es la contraseña que envía el iPhone. Genera una larga y aleatoria:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ponla en Vercel como *Secret* y guárdala para los atajos.

## 7. Variables de entorno en Vercel

| Nombre | Valor | Tipo |
| --- | --- | --- |
| `DATABASE_URL` | la pone la integración de Neon | Secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | Config |
| `CLERK_SECRET_KEY` | `sk_live_…` | Secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Config |
| `INGEST_SECRET` | la clave del paso 6 | Secret |
| `GEMINI_API_KEY` | la clave de AI Studio | Secret |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (opcional) | Config |

Después de cambiar variables: **Deployments → ⋯ → Redeploy**.

Para desarrollo local: `cp .env.example .env.local`, rellena los valores, y luego `npm install` y `npm run dev`.

## 8. Probar el endpoint

```bash
curl -X POST https://gastos.tu-dominio.com/api/ingest \
  -H "Authorization: Bearer TU_INGEST_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"amount":"12,50 €","merchant":"Mercadona","card":"Visa 4821","source":"applepay"}'
```

Respuesta:

```json
{"ok":true,"duplicate":false,"category":"supermercado","category_name":"Supermercado","message":"12,50 € en Mercadona → Supermercado"}
```

En PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri "https://gastos.tu-dominio.com/api/ingest" `
  -Headers @{ Authorization = "Bearer TU_INGEST_SECRET" } -ContentType "application/json; charset=utf-8" `
  -Body '{"amount":"8,90 €","merchant":"Frutería Paco","category":"Supermercado","source":"manual"}'
```

`GET https://gastos.tu-dominio.com/api/ingest` devuelve la lista de categorías («Automática» + las 17), que usa el atajo manual. No es secreta.

### Campos de `POST /api/ingest`

| Campo | Obligatorio | Ejemplo | Notas |
| --- | --- | --- | --- |
| `amount` | sí | `"12,50 €"`, `"1.234,56€"`, `12.5` | Texto en formato español o número. Negativo = devolución. |
| `merchant` | sí | `"Mercadona"` | |
| `card` | no | `"Visa 4821"` | |
| `category` | no | `"Supermercado"` o `"supermercado"` | Si falta o no es válida (p. ej. «Automática»), se clasifica sola. |
| `source` | no | `"applepay"` / `"manual"` | Por defecto `applepay`. |
| `paid_at` | no | `"2026-10-03T14:05:00+02:00"`, `"03/10/2026 14:05"` | Si falta o no se entiende, se usa la hora actual. |

Errores: `401` clave incorrecta · `400` datos no válidos (el campo `message` explica qué falta) · `500` fallo de base de datos (mira los logs de Vercel).

---

## 9. Atajo automático (Apple Pay)

Se ejecuta solo cada vez que pagas con Apple Pay (iOS 17 o posterior).

1. **Atajos → Automatización → +** → **Transacción**.
2. **Tarjeta**: tus tarjetas · **Categoría** y **Comercio**: *Cualquiera* · **Ejecutar inmediatamente** (equivale a desactivar «Preguntar antes de ejecutar») · **Notificar al ejecutar**: desactivado.
3. **Siguiente → Nueva automatización en blanco**.
4. **Obtener contenido de URL**:
   - URL `https://gastos.tu-dominio.com/api/ingest`; toca **›** · **Método** `POST`
   - **Cabeceras**: `Authorization` → `Bearer TU_INGEST_SECRET` · `Content-Type` → `application/json`
   - **Cuerpo → JSON**, campos de tipo **Texto**:
     - `amount` → **Entrada del atajo** → **Importe**
     - `merchant` → **Entrada del atajo** → **Comercio**
     - `card` → **Entrada del atajo** → **Nombre** (o **Tarjeta**, según la versión de iOS)
     - `source` → `applepay`
5. **Obtener valor del diccionario**: clave `message` en **Contenido de la URL**.
6. **Mostrar notificación** con **Valor del diccionario** → **OK**.

Si lo ejecutas con ▶︎ sin un pago real verás «Importe no válido». Es normal: la prueba de verdad es pagar algo.

## 10. Atajo manual (efectivo o tarjeta física)

**Atajos → +** → nómbralo **Gasto en efectivo**:

1. **Solicitar entrada**: *Número*, `¿Cuánto?` → **Ajustar variable** `importe`.
2. **Solicitar entrada**: *Texto*, `¿Dónde?` → **Ajustar variable** `comercio`.
3. *(Opcional, para elegir la categoría)*:
   - **Obtener contenido de URL**: `https://gastos.tu-dominio.com/api/ingest`, sin tocar nada más.
   - **Elegir de la lista** sobre **Contenido de la URL**, con la pregunta `Categoría`.

   Si te saltas este paso, la categoría siempre es automática.
4. **Obtener contenido de URL**: misma URL, **POST** y las dos cabeceras. **Cuerpo → JSON** (Texto):
   - `amount` → **importe** · `merchant` → **comercio** · `card` → `Efectivo` · `source` → `manual`
   - Solo si hiciste el paso 3: `category` → **Elemento seleccionado**.
5. **Obtener valor del diccionario** (clave `message`) → **Mostrar notificación** → **OK**.

Puedes lanzarlo desde la pantalla de inicio, con Siri («Oye Siri, gasto en efectivo») o desde el Botón de Acción. No borres ninguna cabecera a medias: una cabecera vacía puede dar error.

## 11. Web app en el iPhone

1. Abre <https://gastos.tu-dominio.com> en **Safari**.
2. **Compartir → Añadir a pantalla de inicio** → activa **Abrir como app web**.
3. **Inicia sesión dentro de la app instalada**: iOS guarda su sesión por separado de Safari.

La app se abre a pantalla completa y recarga los datos cada vez que vuelves a ella. Solo se desplaza el contenido: la barra inferior queda fija.

---

## Categorías

🎾 Pádel · 🛒 Supermercado · 🍽️ Restaurantes y bares · ⛽ Gasolina · 🚗 Transporte · 💪 Deporte y gimnasio · 🎉 Ocio · 🛍️ Compras · 👕 Ropa · 🔁 Suscripciones · 💊 Salud y farmacia · 🏠 Hogar · ✈️ Viajes · 💈 Belleza y cuidado personal · 🎁 Regalos · 📚 Educación · 📦 Otros

Los colores y emojis están en [`lib/categories.ts`](lib/categories.ts). Las palabras clave de comercios, en [`lib/merchant.ts`](lib/merchant.ts). O cambia la categoría una vez desde la web y quedará guardada como regla.

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| «Entrar» no hace nada | Clerk no carga: la `pk_live_` de Vercel está mal copiada o el dominio de Clerk no está verificado. Cópiala con 📋 desde **API keys** y haz Redeploy. |
| Error de Clerk `handshake` / `resource_not_found` | Las claves de Clerk son de una aplicación que ya no existe. Pon las claves actuales y haz Redeploy. |
| «Algo ha fallado» en el panel | Revisa `DATABASE_URL` y que ejecutaste `db/schema.sql`. |
| Todo cae en «Otros» | `GEMINI_API_KEY` vacía o inválida. Busca `[gemini]` en **Vercel → Logs**. |
| El atajo dice «No autorizado» | La cabecera debe ser exactamente `Authorization: Bearer TU_INGEST_SECRET`, con un solo espacio. |
| «La conexión de red se ha perdido» | El iPhone perdió la conexión en ese momento. Vuelve a ejecutar el atajo. |
| Google abre Safari desde la web app y no vuelve con sesión | Limitación de iOS. Inicia sesión desde Safari, o activa en Clerk el código por email (**User & authentication → Email → verification code**). |
