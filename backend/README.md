# 🚀 Pokedex API Backend (v2.2.1)

Este es el backend para la aplicación Pokedex, construido con **FastAPI**. Proporciona una interfaz simplificada, en **inglés** (directo de PokeAPI) y optimizada para consumir datos de la [PokeAPI](https://pokeapi.co/), incluyendo filtrado avanzado por tipos, búsqueda, variaciones de imágenes (sprites), un sistema de perfiles de usuario, logros, y un mapeo interactivo de regiones servidos como archivos estáticos.

---

## 📑 Tabla de Contenidos
- [Novedades v2.2.1](#-novedades-v221-nuevos-cambios)
- [Tecnologías](#%EF%B8%8F-tecnologías)
- [Arquitectura y Estructura del Proyecto](#%EF%B8%8F-arquitectura-y-estructura-del-proyecto)
- [Instalación y Configuración](#-instalación-y-ejecución)
- [Base de Datos y Sistema de Usuarios](#%EF%B8%8F-base-de-datos-y-sistema-de-usuarios)
- [Referencia de la API (Endpoints)](#-referencia-de-la-api)
- [Documentación Interactiva](#-documentación-interactiva-api)

---

## 🌟 Novedades v2.2.1 (Nuevos Cambios)

- **Retorno a Inglés**: Se ha eliminado el sistema de traducción dinámico para priorizar la estabilidad y consistencia de los datos originales de la PokeAPI.
- **Transformación Simplificada**: Los datos ahora se procesan internamente en `PokeAPIService`, manteniendo una estructura limpia pero conservando los textos originales en inglés.
- **Remoción de Caché Interna**: Se mantiene la política de delegar el ahorro de datos al **cliente (frontend)**.

---

## 🛠️ Tecnologías

- **Python 3.9+**
- **FastAPI** (Framework web moderno y asíncrono)
- **HTTPX** (Cliente HTTP asíncrono para comunicación con PokeAPI)
- **Uvicorn** (Servidor ASGI de alto rendimiento)
- **SQLAlchemy** (ORM para persistencia en base de datos)
- **Pydantic** (Validación de datos y esquemas)

---

## 🏗️ Arquitectura y Estructura del Proyecto

El backend está diseñado siguiendo principios de modularidad, separando responsabilidades para facilitar el mantenimiento y escalabilidad.

1. **`main.py`**
   - **Entry point**: Inicializa FastAPI, middlewares (CORS), rutas estáticas e inicializa la base de datos.

2. **`services/`**
   - **`pokeapi_service.py`**: Centraliza las peticiones asíncronas a la PokeAPI oficial y realiza el procesamiento de datos básico.

3. **`routers/`**
   - Definición de endpoints organizados por contexto: `pokemon.py`, `moves.py`, `abilities.py`, `items.py`, `user.py`, `locations.py`, etc.

4. **`models/`**
   - Modelos de base de datos (SQLAlchemy) y esquemas de validación (Pydantic).

5. **`data/` & `assets/`**
   - **`data/translations.json`**: Diccionario local para traducciones de tipos y estadísticas.
   - **`assets/`**: Archivos estáticos como mapas regionales.

---

## 📦 Instalación y Ejecución

1. **Instalar dependencias:** 
   ```bash
   pip install -r requirements.txt
   ```
2. **Configuración de Variables de Env (.env):**
   *Crea un archivo `.env` basado en tus credenciales de base de Datos (Supabase/PostgreSQL).*
3. **Correr el servidor localmente:** 
   ```bash
   uvicorn main:app --reload
   ```

---

## 🗄️ Base de Datos y Sistema de Usuarios

El sistema utiliza **SQLAlchemy** para gestionar perfiles, estadísticas de juego y logros.
- **Usuarios**: Autenticación y perfiles.
- **Estadísticas**: Seguimiento de trivia (puntos, rachas).
- **Logros**: Sistema de medallas desbloqueables.

---

## 🏎️ Referencia de la API

### 1. Pokémon y Diccionarios (Traducidos)
- **`GET /pokemon/{id}`**: Detalles con nombre, descripción, tipos y stats en español.
- **`GET /abilities/{id}`**: Habilidad con efecto en español.
- **`GET /moves/{id}`**: Movimiento con detalles traducidos.
- **`GET /items/{id}`**: Objetos con descripción e imágenes.

### 2. Mapas y Regiones
- **`GET /regions/{id}`**: Incluye `map_image` y puntos interactivos.
- **`GET /locations/{id}/encounters`**: Lista de Pokémon por zona geográfica.

---

## 📚 Documentación Interactiva API

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

