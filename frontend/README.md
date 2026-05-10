# 🚀 Pokedex - Frontend

Este es el frontend para la aplicación **Pokedex**, construido con **Next.js**, **React** y **TypeScript**. Esta aplicación web interactúa con el backend de Pokedex para visualizar, buscar y filtrar Pokémon.

## 🛠️ Tecnologías

- **Next.js** (Framework de React moderno)
- **React 19** 
- **TypeScript** (Tipado estático)
- **CSS Modules / Plain CSS** (Estilos)
- **ESLint** (Linter)

---

## 🏎️ Guía de Inicio Rápido

Sigue estos pasos para configurar y ejecutar el proyecto en tu máquina local.

### Prerrequisitos

- Node.js (v18 o superior recomendado)
- npm, yarn, pnpm o bun (gestores de paquetes)

### 1. Instalación de Dependencias

Ejecuta el siguiente comando en la raíz del proyecto para instalar las dependencias necesarias:

```bash
npm install
# o
yarn install
# o
pnpm install
```

### 2. Ejecutar el Servidor de Desarrollo

Una vez instaladas las dependencias, inicia el servidor de desarrollo:

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
# o
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador local para ver la aplicación funcionando. El servidor se recargará automáticamente al editar los archivos de código fuente.

### 3. Compilar para Producción

Para crear una versión optimizada para producción del proyecto:

```bash
npm run build
```

Una vez completada la construcción, puedes iniciarla con:

```bash
npm run start
```

---

## 📁 Estructura del Proyecto

El código fuente principal interactúa directamente dentro del directorio `src` o `app` dependiendo del enrutamiento elegido por Next.js. Las modificaciones de página principales se pueden encontrar típicamente en `app/page.tsx` o `src/app/page.tsx`.

### 🔌 Conexión e Integración con el Backend (v2.1.0)

Asegúrate de tener funcionando la API de Pokedex (Backend en FastAPI) en tu entorno local (`http://localhost:8000`) para que el frontend pueda consumir todos los servicios de forma correcta.

El backend configurado proporciona a esta aplicación web las siguientes funcionalidades clave:

1. **Catálogo y Filtrado Avanzado:** Rutas paginadas (`/pokemon/`) para listar, buscar por nombre y filtrar mediante tipos. Obtención de detalles completos incluyendo estadísticas y múltiples variaciones de sprites.
2. **Sistema de Usuarios y Trivia:** Manejo de perfiles de usuario mediante base de datos, registro del progreso en el sistema de minijuego/trivia (`user_stats`) y un catálogo de logros y medallas desbloqueables.
3. **Mapas y Regiones (NUEVO V2.1):** Consumo de archivos estáticos alojados en el backend (`/static/maps/`) para renderizar mapas regionales interactivos. Se consumen rutas como `/regions/` y `/locations/` para obtener las ubicaciones y los Pokémon que aparecen en cada área.
4. **Crianza, Combate y Objetos:** Acceso a datos complementarios mediante endpoints de movimientos (`/moves/`), habilidades, cajas de objetos (`/items/`), bayas y cadenas evolutivas completas (`/evolutions/chain/`).

Para testear todos los endpoints y verificar la estructura de los datos que recibirá el frontend, puedes revisar la **Documentación Interactiva del Backend (Swagger UI)** en: `http://127.0.0.1:8000/docs`.
84: 
85: ---
86: 
87: ## 🧪 Optimizaciones y Estabilidad (Marzo 2026)
88: 
89: Se han realizado mejoras críticas en la arquitectura del frontend para garantizar una experiencia de usuario fluida y resiliente:
90: 
91: - **Sistema de Caché Inteligente:** Implementación de un motor de caché en memoria para objetos, bayas, habilidades y movimientos, reduciendo drásticamente las peticiones redundantes.
92: - **Defensive Coding (Resiliencia):** Blindaje de componentes con lógica defensiva que previene crashes ante datos nulos o parciales del backend.
93: - **Optimización de Imágenes:** Uso extensivo de `next/image` con sistemas de fallback dinámicos para sprites desde GitHub y otras fuentes externas.
94: - **Adaptadores de Datos:** Capa de transformación en los servicios para mantener la compatibilidad con cambios estructurales en la API v2.1.0.
95: - **Mejoras de UX:** Implementación de pantallas esqueléticas (Skeletons) y carga infinita optimizada.
96: 
97: ---

---

## 📚 Aprender Más

Para aprender más sobre las herramientas utilizadas en este proyecto:
- [Documentación de Next.js](https://nextjs.org/docs) - Aprende las características y la API de Next.js.
- [Aprender Next.js](https://nextjs.org/learn) - Un tutorial interactivo para empezar paso a paso.
- [El repositorio de GitHub de Next.js](https://github.com/vercel/next.js) - Contribuciones al framework base.
