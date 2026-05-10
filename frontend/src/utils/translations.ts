export const TRANSLATIONS: Record<string, Record<string, string>> = {
    stats: {
        'hp': 'PS',
        'attack': 'Ataque',
        'defense': 'Defensa',
        'special-attack': 'Ataque Esp.',
        'special-defense': 'Defensa Esp.',
        'speed': 'Velocidad',
        'accuracy': 'Precisión',
        'evasion': 'Evasión'
    },
    types: {
        'normal': 'Normal',
        'fire': 'Fuego',
        'water': 'Agua',
        'grass': 'Planta',
        'electric': 'Eléctrico',
        'ice': 'Hielo',
        'fighting': 'Lucha',
        'poison': 'Veneno',
        'ground': 'Tierra',
        'flying': 'Volador',
        'psychic': 'Psíquico',
        'bug': 'Bicho',
        'rock': 'Roca',
        'ghost': 'Fantasma',
        'dragon': 'Dragón',
        'steel': 'Acero',
        'fairy': 'Hada',
        'dark': 'Siniestro'
    },
    damage_classes: {
        'physical': 'Físico',
        'special': 'Especial',
        'status': 'Estado'
    },
    targets: {
        'all-opponents': 'Todos los oponentes',
        'entire-field': 'Todo el campo',
        'selected-pokemon': 'Pokémon seleccionado',
        'user': 'Usuario',
        'random-opponent': 'Oponente aleatorio',
        'all-other-pokemon': 'Todos los demás Pokémon',
        'all-pokemon': 'Todos los Pokémon',
        'users-field': 'Campo del usuario',
        'opponents-field': 'Campo del oponente',
        'user-and-allies': 'Usuario y aliados'
    },
    firmness: {
        'very-soft': 'Muy blanda',
        'soft': 'Blanda',
        'hard': 'Dura',
        'very-hard': 'Muy dura',
        'super-hard': 'Super dura'
    },
    flavors: {
        'spicy': 'Picante',
        'dry': 'Seco',
        'sweet': 'Dulce',
        'bitter': 'Amargo',
        'sour': 'Ácido'
    },
    categories: {
        'stat-boosts': 'Aumentos de estadísticas',
        'effort-drop': 'Reducción de esfuerzo',
        'medicine': 'Medicina',
        'other': 'Otros',
        'in-a-pinch': 'En un apuro',
        'picky-eating': 'Comida selectiva',
        'type-protection': 'Protección de tipo',
        'baking-only': 'Solo para cocinar',
        'holdable-active': 'Efecto al llevar (activo)',
        'collectibles': 'Coleccionables',
        'evolution': 'Evolución',
        'spelunking': 'Espeleología',
        'held-items': 'Objetos llevados',
        'choice': 'Elección',
        'effort-training': 'Entrenamiento de esfuerzo',
        'bad-held-items': 'Objetos llevados (negativo)',
        'training': 'Entrenamiento',
        'plates': 'Tablas',
        'species-specific': 'Específico de especie',
        'type-enhancement': 'Potenciador de tipo',
        'competition': 'Competición',
        'scarves': 'Pañuelos',
        'visual-comparison': 'Comparación visual',
        'data-cards': 'Tarjetas de datos',
        'plot-advancement': 'Avance de historia',
        'unused': 'No usado',
        'all-machines': 'Todas las máquinas',
        'all-mail': 'Todo el correo',
        'special-balls': 'Poké Balls especiales',
        'standard-balls': 'Poké Balls estándar',
        'apricorn-balls': 'Apricorn Balls',
        'revival': 'Revivir',
        'healing': 'Curación',
        'status-cures': 'Curar estados',
        'mulch': 'Abono',
        'special-berries': 'Bayas especiales',
        'miracle-berries': 'Bayas milagro'
    }
};

export function translate(key: string, category: string): string {
    if (!key) return '';
    const normalizedKey = key.toLowerCase().replace(' ', '-');
    const categoryDict = TRANSLATIONS[category];
    if (categoryDict && categoryDict[normalizedKey]) {
        return categoryDict[normalizedKey];
    }
    // Fallback: capitalized original with hyphens replaced by spaces
    return key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getSpanishEffect(entries: any[]): string {
    if (!Array.isArray(entries)) return 'Descripción no disponible.';
    const esEntry = entries.find(e => e.language.name === 'es');
    if (esEntry) return esEntry.effect || esEntry.short_effect || 'Descripción no disponible.';
    const enEntry = entries.find(e => e.language.name === 'en');
    return enEntry ? (enEntry.effect || enEntry.short_effect || 'Descripción no disponible.') : 'Descripción no disponible.';
}
