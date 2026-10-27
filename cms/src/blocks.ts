import type { Block } from 'payload'

export const blocks: Block[] = [
  {
    slug: 'hero',
    labels: { singular: 'Банер', plural: 'Банери' },
    fields: [
      { name: 'heading', label: 'Заголовок (Enter = новий рядок)', type: 'textarea', required: true },
      { name: 'text', label: 'Текст', type: 'textarea' },
      {
        type: 'row',
        fields: [
          { name: 'primaryLabel', label: 'Кнопка 1: текст', type: 'text' },
          { name: 'primaryLink', label: 'Кнопка 1: адреса', type: 'text' },
        ],
      },
      {
        type: 'row',
        fields: [
          { name: 'secondaryLabel', label: 'Кнопка 2: текст', type: 'text' },
          { name: 'secondaryLink', label: 'Кнопка 2: адреса', type: 'text' },
        ],
      },
    ],
  },
  {
    slug: 'genreChips',
    labels: { singular: 'Жанри (чіпи)', plural: 'Жанри (чіпи)' },
    fields: [
      { name: 'title', label: 'Заголовок', type: 'text', defaultValue: 'Жанри' },
      { name: 'limit', label: 'Скільки показати', type: 'number', defaultValue: 10, min: 1 },
    ],
  },
  {
    slug: 'gameGrid',
    labels: { singular: 'Добірка ігор', plural: 'Добірки ігор' },
    fields: [
      { name: 'title', label: 'Заголовок', type: 'text', required: true },
      {
        name: 'source',
        label: 'Джерело',
        type: 'select',
        defaultValue: 'newest',
        options: [
          { label: 'Новинки', value: 'newest' },
          { label: 'Найкращі за відгуками', value: 'top' },
        ],
      },
      { name: 'limit', label: 'Кількість', type: 'number', defaultValue: 8, min: 1, max: 24 },
    ],
  },
  {
    slug: 'catalog',
    labels: { singular: 'Каталог з фільтрами', plural: 'Каталог з фільтрами' },
    fields: [{ name: 'title', label: 'Заголовок', type: 'text', defaultValue: 'Каталог' }],
  },
  {
    slug: 'pick',
    labels: { singular: 'Підбір гри', plural: 'Підбір гри' },
    fields: [
      { name: 'title', label: 'Заголовок', type: 'text', defaultValue: 'Підбір гри' },
      { name: 'text', label: 'Пояснення', type: 'textarea' },
    ],
  },
  {
    slug: 'referenceList',
    labels: { singular: 'Список (розробники/жанри/платформи)', plural: 'Списки' },
    fields: [
      {
        name: 'kind',
        label: 'Що показати',
        type: 'select',
        required: true,
        options: [
          { label: 'Розробники', value: 'developers' },
          { label: 'Жанри', value: 'genres' },
          { label: 'Платформи', value: 'platforms' },
        ],
      },
      { name: 'title', label: 'Заголовок', type: 'text' },
    ],
  },
  {
    slug: 'richText',
    labels: { singular: 'Текст', plural: 'Тексти' },
    fields: [
      { name: 'title', label: 'Заголовок', type: 'text' },
      { name: 'content', label: 'Текст (абзаци через порожній рядок)', type: 'textarea', required: true },
    ],
  },
  { slug: 'wishlist', labels: { singular: 'Обране (сторінка)', plural: 'Обране' }, fields: [] },
  { slug: 'profile', labels: { singular: 'Профіль (сторінка)', plural: 'Профіль' }, fields: [] },
  {
    slug: 'authForm',
    labels: { singular: 'Форма входу/реєстрації', plural: 'Форми входу/реєстрації' },
    fields: [
      {
        name: 'mode',
        label: 'Тип форми',
        type: 'select',
        required: true,
        defaultValue: 'login',
        options: [
          { label: 'Вхід', value: 'login' },
          { label: 'Реєстрація', value: 'register' },
        ],
      },
    ],
  },
]
