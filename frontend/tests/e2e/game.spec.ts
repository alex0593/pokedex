import { expect, test, type Page } from '@playwright/test';

const quiz = {
  target: {
    id: 25,
    name: 'Pikachu',
    original_name: 'pikachu',
    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    types: ['Electric'],
    abilities: [],
    stats: [],
    sprites: {},
  },
  options: ['Pikachu', 'Raichu', 'Charmander', 'Squirtle'],
};

async function mockQuiz(page: Page) {
  await page.route('**/api/pokemon/game/quiz**', route => route.fulfill({ json: quiz }));
  await page.route('**/api/users/favorites/**', route => route.fulfill({ json: [] }));
}

test('completa una pregunta del modo libre', async ({ page }) => {
  await mockQuiz(page);
  await page.goto('/game');
  await page.getByRole('button', { name: /Modo Libre/ }).click();
  await page.getByRole('button', { name: 'Seleccionar Pokémon Pikachu' }).click();

  await expect(page.getByText(/¡Excelente!/)).toBeVisible();
  await expect(page.getByText('Puntos: 1')).toBeVisible();
});

test('completa un stage autenticado y confirma el progreso', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('poke_token', 'e2e-token');
    localStorage.setItem('poke_user', 'e2e-user');
  });
  await mockQuiz(page);
  await page.route('**/api/game/regions/progress', route => route.fulfill({ json: [] }));

  let answers = 0;
  await page.route('**/api/game/stage/answer', async route => {
    answers += 1;
    await route.fulfill({
      json: {
        stage_progress: {
          region_name: 'kanto', type_name: 'fire', correct_count: 0,
          total_count: 0, attempts: answers === 10 ? 1 : 0, completed: answers === 10,
        },
        attempt_finished: answers === 10,
        attempt_passed: answers === 10,
        attempt_correct_count: answers,
        region_completed: false,
        new_achievements: [],
      },
    });
  });

  await page.goto('/game');
  await page.getByRole('button', { name: /Aventura por Regiones/ }).click();
  await page.getByRole('button', { name: /Kanto/ }).click();
  await page.getByRole('button', { name: /Fuego/ }).click();

  for (let question = 1; question <= 10; question += 1) {
    await page.getByRole('button', { name: 'Pikachu' }).click();
    const nextLabel = question === 10 ? /Ver Resultado/ : /Siguiente/;
    await page.getByRole('button', { name: nextLabel }).click();
  }

  await expect(page.getByText('¡Stage Superado!')).toBeVisible();
  expect(answers).toBe(10);
});

test('pausa el stage y permite reintentar un guardado fallido', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('poke_token', 'e2e-token');
    localStorage.setItem('poke_user', 'e2e-user');
  });
  await mockQuiz(page);
  await page.route('**/api/game/regions/progress', route => route.fulfill({ json: [] }));

  let attempts = 0;
  await page.route('**/api/game/stage/answer', route => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 503, json: { detail: 'offline' } });
    return route.fulfill({
      json: {
        stage_progress: {
          region_name: 'kanto', type_name: 'fire', correct_count: 1,
          total_count: 1, attempts: 0, completed: false,
        },
        attempt_finished: false,
        attempt_passed: false,
        attempt_correct_count: 1,
        region_completed: false,
        new_achievements: [],
      },
    });
  });

  await page.goto('/game');
  await page.getByRole('button', { name: /Aventura por Regiones/ }).click();
  await page.getByRole('button', { name: /Kanto/ }).click();
  await page.getByRole('button', { name: /Fuego/ }).click();
  await page.getByRole('button', { name: 'Pikachu' }).click();

  await expect(page.getByText(/No se pudo guardar la respuesta/)).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar guardado' }).click();
  await expect(page.getByRole('button', { name: /Siguiente/ })).toBeVisible();
  expect(attempts).toBe(2);
});
